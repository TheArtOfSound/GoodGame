"""Communities: create/join, posts, moderation."""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Form, HTTPException
from pydantic import BaseModel

from auth import get_session_user
from db import db

router = APIRouter(prefix="/api", tags=["communities"])

SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    s = SLUG_RE.sub("-", text.lower()).strip("-")
    return s[:48] or "community"


async def current_user(gg_session: Optional[str] = Cookie(None)):
    user = await get_session_user(gg_session)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def maybe_user(gg_session: Optional[str] = Cookie(None)):
    return await get_session_user(gg_session)


async def role_in(community_id: str, user_id: str) -> str:
    if not user_id:
        return "guest"
    m = await db.community_members.find_one({"community_id": community_id, "user_id": user_id}, {"_id": 0})
    if not m:
        return "guest"
    if m.get("banned"):
        return "banned"
    if m.get("muted"):
        return "muted"
    return m.get("role", "member")


def community_view(c: dict, member_count: int = 0) -> dict:
    return {
        "id": c["id"],
        "slug": c["slug"],
        "name": c["name"],
        "description": c.get("description", ""),
        "owner_id": c["owner_id"],
        "member_count": member_count,
        "created_at": c.get("created_at"),
    }


@router.get("/communities")
async def list_communities(limit: int = 50):
    items = await db.communities.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100)).to_list(limit)
    out = []
    for c in items:
        count = await db.community_members.count_documents({"community_id": c["id"], "banned": {"$ne": True}})
        out.append(community_view(c, count))
    return {"communities": out}


class CommunityIn(BaseModel):
    name: str
    description: str = ""


@router.post("/communities")
async def create_community(payload: CommunityIn, user=Depends(current_user)):
    name = payload.name.strip()
    if len(name) < 3 or len(name) > 48:
        raise HTTPException(status_code=400, detail="Name must be 3-48 chars")
    base = slugify(name)
    slug = base
    i = 2
    while await db.communities.find_one({"slug": slug}):
        slug = f"{base}-{i}"
        i += 1
    cid = f"com_{uuid.uuid4().hex[:14]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.communities.insert_one({
        "id": cid,
        "slug": slug,
        "name": name,
        "description": payload.description.strip()[:2000],
        "owner_id": user["id"],
        "deleted_at": None,
        "created_at": now,
    })
    await db.community_members.insert_one({
        "id": f"cm_{uuid.uuid4().hex[:10]}",
        "community_id": cid,
        "user_id": user["id"],
        "role": "owner",
        "banned": False,
        "muted": False,
        "joined_at": now,
    })
    return {"ok": True, "community": {"id": cid, "slug": slug, "name": name}}


@router.get("/communities/{slug}")
async def get_community(slug: str, viewer=Depends(maybe_user)):
    c = await db.communities.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    member_count = await db.community_members.count_documents({"community_id": c["id"], "banned": {"$ne": True}})
    role = await role_in(c["id"], viewer["id"] if viewer else "")
    posts = await db.community_posts.find(
        {"community_id": c["id"], "hidden": False, "deleted_at": None},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(50)
    author_ids = list({p["author_id"] for p in posts})
    authors = {}
    if author_ids:
        for u in await db.users.find({"id": {"$in": author_ids}}, {"_id": 0}).to_list(len(author_ids)):
            authors[u["id"]] = u
    return {
        "community": community_view(c, member_count),
        "role": role,
        "posts": [
            {
                **p,
                "author_username": authors.get(p["author_id"], {}).get("username"),
                "author_display_name": (authors.get(p["author_id"], {}).get("display_name") or authors.get(p["author_id"], {}).get("username")),
                "author_avatar": authors.get(p["author_id"], {}).get("avatar_url"),
            }
            for p in posts
        ],
    }


@router.post("/communities/{slug}/join")
async def join_community(slug: str, user=Depends(current_user)):
    c = await db.communities.find_one({"slug": slug, "deleted_at": None}, {"_id": 0, "id": 1})
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    existing = await db.community_members.find_one({"community_id": c["id"], "user_id": user["id"]}, {"_id": 0})
    if existing:
        if existing.get("banned"):
            raise HTTPException(status_code=403, detail="You are banned from this community")
        return {"ok": True}
    await db.community_members.insert_one({
        "id": f"cm_{uuid.uuid4().hex[:10]}",
        "community_id": c["id"],
        "user_id": user["id"],
        "role": "member",
        "banned": False,
        "muted": False,
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@router.post("/communities/{slug}/posts")
async def post_message(slug: str, body: str = Form(...), user=Depends(current_user)):
    c = await db.communities.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    role = await role_in(c["id"], user["id"])
    if role == "guest":
        raise HTTPException(status_code=403, detail="Join the community first")
    if role in ("banned", "muted"):
        raise HTTPException(status_code=403, detail="You cannot post here")
    body = body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Empty post")
    pid = f"cp_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.community_posts.insert_one({
        "id": pid,
        "community_id": c["id"],
        "author_id": user["id"],
        "body": body[:4000],
        "hidden": False,
        "deleted_at": None,
        "created_at": now,
    })
    return {"ok": True, "post_id": pid}


@router.post("/communities/{slug}/posts/{post_id}/hide")
async def hide_post(slug: str, post_id: str, user=Depends(current_user)):
    c = await db.communities.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    role = await role_in(c["id"], user["id"])
    if role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Moderators only")
    res = await db.community_posts.update_one({"id": post_id, "community_id": c["id"]}, {"$set": {"hidden": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.audit_log.insert_one({
        "id": f"aud_{uuid.uuid4().hex[:12]}",
        "actor_id": user["id"],
        "action": "community.post.hide",
        "target_id": post_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@router.post("/reports")
async def report(
    target_type: str = Form(...),
    target_id: str = Form(...),
    reason: str = Form(...),
    user=Depends(current_user),
):
    if target_type not in {"game", "clip", "community_post", "user"}:
        raise HTTPException(status_code=400, detail="Invalid target type")
    rid = f"rep_{uuid.uuid4().hex[:12]}"
    await db.reports.insert_one({
        "id": rid,
        "reporter_id": user["id"],
        "target_type": target_type,
        "target_id": target_id,
        "reason": reason.strip()[:500],
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "report_id": rid}
