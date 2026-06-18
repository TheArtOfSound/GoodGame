"""Clip upload, list, detail."""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, File, Form, HTTPException, Response, UploadFile

from auth import get_session_user
from db import db
from ratelimit import rate_limit_check
from storage import APP_NAME, get_object, put_object

router = APIRouter(prefix="/api", tags=["clips"])

SLUG_RE = re.compile(r"[^a-z0-9]+")
MAX_CLIP_BYTES = 80 * 1024 * 1024
CLIP_TYPES = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}


def slugify(text: str) -> str:
    s = SLUG_RE.sub("-", text.lower()).strip("-")
    return s[:48] or "clip"


async def current_user(gg_session: Optional[str] = Cookie(None)):
    user = await get_session_user(gg_session)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def clip_view(c: dict, author: Optional[dict] = None, game: Optional[dict] = None) -> dict:
    return {
        "id": c["id"],
        "slug": c["slug"],
        "caption": c.get("caption", ""),
        "tags": c.get("tags", []),
        "video_path": c.get("video_path"),
        "author_id": c.get("author_id"),
        "author_username": author.get("username") if author else None,
        "author_display_name": (author.get("display_name") if author else None) or (author.get("username") if author else None),
        "author_avatar": author.get("avatar_url") if author else None,
        "game_id": c.get("game_id"),
        "game_slug": game.get("slug") if game else None,
        "game_title": game.get("title") if game else None,
        "created_at": c.get("created_at"),
    }


async def hydrate_clips(clips: list[dict]) -> list[dict]:
    if not clips:
        return []
    author_ids = list({c["author_id"] for c in clips if c.get("author_id")})
    game_ids = list({c["game_id"] for c in clips if c.get("game_id")})
    authors = {}
    games = {}
    if author_ids:
        for u in await db.users.find({"id": {"$in": author_ids}}, {"_id": 0}).to_list(len(author_ids)):
            authors[u["id"]] = u
    if game_ids:
        for g in await db.games.find({"id": {"$in": game_ids}}, {"_id": 0}).to_list(len(game_ids)):
            games[g["id"]] = g
    return [clip_view(c, authors.get(c.get("author_id")), games.get(c.get("game_id"))) for c in clips]


@router.get("/clips")
async def list_clips(limit: int = 30):
    clips = await db.clips.find(
        {"visibility": "public", "moderation_status": "clear", "deleted_at": None},
        {"_id": 0},
    ).sort("created_at", -1).limit(min(limit, 100)).to_list(limit)
    return {"clips": await hydrate_clips(clips)}


@router.post("/clips")
async def upload_clip(
    caption: str = Form(""),
    tags: str = Form(""),
    game_slug: str = Form(""),
    video: UploadFile = File(...),
    user=Depends(current_user),
):
    if not await rate_limit_check(f"clipupload:{user['id']}", limit=15, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many uploads in the last hour")
    ct = (video.content_type or "").lower()
    if ct not in CLIP_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported video type (mp4, webm, mov)")
    data = await video.read()
    if len(data) > MAX_CLIP_BYTES:
        raise HTTPException(status_code=400, detail="Clip too large (max 80MB)")
    if len(caption) > 280:
        raise HTTPException(status_code=400, detail="Caption too long")

    game = None
    if game_slug.strip():
        game = await db.games.find_one({"slug": game_slug.strip().lower(), "deleted_at": None}, {"_id": 0})

    clip_id = f"clp_{uuid.uuid4().hex[:14]}"
    ext = CLIP_TYPES[ct]
    path = f"{APP_NAME}/clips/{clip_id}/clip.{ext}"
    put_object(path, data, ct)
    video_url = f"/api/clip-media/{clip_id}/clip.{ext}"
    slug = f"{slugify(caption)[:32] or 'clip'}-{clip_id[-6:]}"
    now = datetime.now(timezone.utc).isoformat()
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()][:6]

    await db.clips.insert_one({
        "id": clip_id,
        "slug": slug,
        "author_id": user["id"],
        "game_id": game["id"] if game else None,
        "video_path": video_url,
        "caption": caption.strip()[:280],
        "tags": tag_list,
        "visibility": "public",
        "moderation_status": "clear",
        "deleted_at": None,
        "created_at": now,
    })
    await db.audit_log.insert_one({
        "id": f"aud_{uuid.uuid4().hex[:12]}",
        "actor_id": user["id"],
        "action": "clip.create",
        "target_id": clip_id,
        "created_at": now,
    })
    return {"ok": True, "clip": {"id": clip_id, "slug": slug}}


@router.get("/clips/{idslug}")
async def get_clip(idslug: str):
    c = await db.clips.find_one({"$or": [{"id": idslug}, {"slug": idslug}], "deleted_at": None}, {"_id": 0})
    if not c or c.get("moderation_status") != "clear" or c.get("visibility") != "public":
        raise HTTPException(status_code=404, detail="Clip not found")
    hydrated = await hydrate_clips([c])
    return {"clip": hydrated[0]}


@router.get("/clip-media/{clip_id}/{filename}")
async def serve_clip_media(clip_id: str, filename: str):
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    path = f"{APP_NAME}/clips/{clip_id}/{filename}"
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=3600"})
