"""Search, tag, sitemap endpoints — split from games.py to keep it focused."""
import re
from typing import Optional

from fastapi import APIRouter, Response

from db import db
from games import PUBLIC_FILTER, attach_owner

router = APIRouter(prefix="/api", tags=["discover"])


async def _filter_real_owner_games(games: list[dict]) -> list[dict]:
    owner_ids = list({g["owner_id"] for g in games})
    if not owner_ids:
        return []
    owners = await db.users.find({"id": {"$in": owner_ids}}, {"_id": 0}).to_list(len(owner_ids))
    valid = {
        o["id"]
        for o in owners
        if not o.get("is_system") and o.get("password_hash") and o.get("is_active", True)
    }
    return [g for g in games if g["owner_id"] in valid]


@router.get("/search")
async def search(q: str = "", limit: int = 24):
    q = (q or "").strip()
    if not q:
        return {"results": []}
    # Mongo regex (case-insensitive) on title + tags
    pattern = re.compile(re.escape(q), re.IGNORECASE)
    query: dict = dict(PUBLIC_FILTER)
    query["$or"] = [{"title": {"$regex": pattern}}, {"tags": {"$regex": pattern}}]
    games = await db.games.find(query, {"_id": 0}).limit(min(limit, 60)).to_list(limit)
    games = await _filter_real_owner_games(games)
    return {"results": await attach_owner(games)}


@router.get("/tags/{tag}")
async def by_tag(tag: str, limit: int = 60):
    tag = tag.strip().lower()
    if not tag:
        return {"tag": tag, "games": []}
    query: dict = dict(PUBLIC_FILTER)
    query["tags"] = tag
    games = await db.games.find(query, {"_id": 0}).sort("updated_at", -1).limit(min(limit, 200)).to_list(limit)
    games = await _filter_real_owner_games(games)
    return {"tag": tag, "games": await attach_owner(games)}


@router.get("/tags")
async def popular_tags(limit: int = 30):
    pipeline = [
        {"$match": dict(PUBLIC_FILTER)},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": min(limit, 60)},
    ]
    rows = await db.games.aggregate(pipeline).to_list(limit)
    return {"tags": [{"tag": r["_id"], "count": r["count"]} for r in rows]}


@router.get("/sitemap.xml")
async def sitemap():
    games = await db.games.find(PUBLIC_FILTER, {"_id": 0, "slug": 1, "updated_at": 1, "owner_id": 1}).to_list(2000)
    games = await _filter_real_owner_games(games)
    owner_ids = list({g["owner_id"] for g in games})
    creators = []
    if owner_ids:
        creators = await db.users.find(
            {"id": {"$in": owner_ids}, "is_system": {"$ne": True}, "is_active": True},
            {"_id": 0, "username": 1, "updated_at": 1},
        ).to_list(len(owner_ids))

    items = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path in ["/", "/games", "/clips", "/communities", "/legal/terms", "/legal/privacy", "/legal/dmca", "/legal/content"]:
        items.append(f"<url><loc>{path}</loc></url>")
    for g in games:
        items.append(f"<url><loc>/games/{g['slug']}</loc><lastmod>{g.get('updated_at', '')}</lastmod></url>")
    for c in creators:
        items.append(f"<url><loc>/creators/{c['username']}</loc><lastmod>{c.get('updated_at', '')}</lastmod></url>")
    items.append("</urlset>")
    return Response(content="\n".join(items), media_type="application/xml")
