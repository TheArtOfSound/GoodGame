"""Game catalog: upload, browse, detail, thumbnail, patch notes, sandboxed UGC serving."""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import (
    APIRouter, Cookie, Depends, File, Form, HTTPException, Request, Response, UploadFile,
)
from fastapi.responses import RedirectResponse

from auth import get_session_user
from db import db
from ratelimit import rate_limit_check
from storage import (
    APP_NAME, content_type_for, get_object, ingest_game_zip, put_object,
)

router = APIRouter(prefix="/api", tags=["games"])

SLUG_RE = re.compile(r"[^a-z0-9]+")
MAX_THUMB_BYTES = 8 * 1024 * 1024
THUMB_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


def slugify(text: str) -> str:
    s = SLUG_RE.sub("-", text.lower()).strip("-")
    return s[:60] or "game"


async def unique_slug(base: str) -> str:
    slug = base
    i = 2
    while await db.games.find_one({"slug": slug}, {"_id": 0, "id": 1}):
        slug = f"{base}-{i}"
        i += 1
    return slug


async def current_user(gg_session: Optional[str] = Cookie(None)):
    user = await get_session_user(gg_session)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


PUBLIC_FILTER = {
    "status": "published",
    "deleted_at": None,
    "moderation_status": "clear",
    "scan_status": "passed",
}


async def is_real_owner(user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "is_system": 1, "password_hash": 1, "is_active": 1})
    if not user:
        return False
    if user.get("is_system"):
        return False
    if not user.get("password_hash"):
        return False
    if not user.get("is_active", True):
        return False
    return True


def game_view(g: dict, owner: Optional[dict] = None) -> dict:
    return {
        "id": g["id"],
        "slug": g["slug"],
        "title": g["title"],
        "pitch": g.get("pitch", ""),
        "description": g.get("description", ""),
        "tags": g.get("tags", []),
        "engine": g.get("engine"),
        "cover_image": g.get("cover_image"),
        "status": g.get("status"),
        "owner_id": g.get("owner_id"),
        "owner_username": owner.get("username") if owner else None,
        "owner_display_name": (owner.get("display_name") if owner else None) or (owner.get("username") if owner else None),
        "owner_avatar": owner.get("avatar_url") if owner else None,
        "play_count": g.get("play_count", 0),
        "upload_entry": g.get("upload_entry"),
        "upload_bytes": g.get("upload_bytes", 0),
        "created_at": g.get("created_at"),
        "updated_at": g.get("updated_at"),
    }


async def attach_owner(games: list[dict]) -> list[dict]:
    if not games:
        return []
    owner_ids = list({g["owner_id"] for g in games})
    owners = await db.users.find(
        {"id": {"$in": owner_ids}},
        {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1},
    ).to_list(len(owner_ids))
    by_id = {o["id"]: o for o in owners}
    return [game_view(g, by_id.get(g["owner_id"])) for g in games]


@router.get("/games")
async def list_games(limit: int = 60, tag: Optional[str] = None):
    q: dict = dict(PUBLIC_FILTER)
    if tag:
        q["tags"] = tag
    games = await db.games.find(q, {"_id": 0}).sort("updated_at", -1).limit(min(limit, 200)).to_list(limit)
    owner_ids = list({g["owner_id"] for g in games})
    if not owner_ids:
        return {"games": []}
    real_owner_ids = {
        u["id"]
        for u in await db.users.find(
            {
                "id": {"$in": owner_ids},
                "is_active": True,
                "is_system": {"$ne": True},
                "password_hash": {"$exists": True, "$ne": None},
            },
            {"_id": 0, "id": 1},
        ).to_list(len(owner_ids))
    }
    games = [g for g in games if g["owner_id"] in real_owner_ids]
    return {"games": await attach_owner(games)}


@router.get("/games/{slug}")
async def get_game(slug: str):
    g = await db.games.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g.get("status") != "published" or g.get("moderation_status") != "clear":
        raise HTTPException(status_code=404, detail="Game not found")
    if not await is_real_owner(g["owner_id"]):
        raise HTTPException(status_code=404, detail="Game not found")
    owner = await db.users.find_one({"id": g["owner_id"]}, {"_id": 0})
    releases = await db.releases.find({"game_id": g["id"]}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {"game": game_view(g, owner), "releases": releases}


@router.post("/games")
async def create_game(
    title: str = Form(...),
    pitch: str = Form(""),
    description: str = Form(""),
    tags: str = Form(""),
    build: UploadFile = File(...),
    user=Depends(current_user),
):
    if not await rate_limit_check(f"gamecreate:{user['id']}", limit=10, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many uploads in the last hour")
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title required")
    if not build.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Build must be a .zip file")

    data = await build.read()
    game_id = f"gm_{uuid.uuid4().hex[:18]}"
    try:
        ingest = ingest_game_zip(data, game_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    base_slug = slugify(title)
    slug = await unique_slug(base_slug)
    now = datetime.now(timezone.utc).isoformat()
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()][:8]

    doc = {
        "id": game_id,
        "slug": slug,
        "owner_id": user["id"],
        "title": title.strip()[:120],
        "pitch": pitch.strip()[:240],
        "description": description.strip()[:8000],
        "tags": tag_list,
        "engine": ingest["engine"],
        "upload_entry": ingest["entry_path"],
        "upload_bytes": ingest["total_bytes"],
        "upload_file_count": ingest["file_count"],
        "cover_image": None,
        "status": "published",
        "moderation_status": "clear",
        "scan_status": "passed",
        "play_count": 0,
        "deleted_at": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.games.insert_one(doc)
    await db.releases.insert_one({
        "id": f"rel_{uuid.uuid4().hex[:12]}",
        "game_id": game_id,
        "version": "1.0.0",
        "notes": "Initial release",
        "bytes": ingest["total_bytes"],
        "file_count": ingest["file_count"],
        "created_at": now,
    })
    return {"ok": True, "game": {"id": game_id, "slug": slug, "title": doc["title"]}}


@router.post("/games/{slug}/build")
async def update_build(
    slug: str,
    notes: str = Form(""),
    version: str = Form(""),
    build: UploadFile = File(...),
    user=Depends(current_user),
):
    g = await db.games.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not the owner")
    if not build.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Build must be a .zip file")

    data = await build.read()
    try:
        ingest = ingest_game_zip(data, g["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    now = datetime.now(timezone.utc).isoformat()
    await db.games.update_one(
        {"id": g["id"]},
        {"$set": {
            "upload_entry": ingest["entry_path"],
            "upload_bytes": ingest["total_bytes"],
            "upload_file_count": ingest["file_count"],
            "engine": ingest["engine"],
            "updated_at": now,
        }},
    )
    await db.releases.insert_one({
        "id": f"rel_{uuid.uuid4().hex[:12]}",
        "game_id": g["id"],
        "version": (version or "").strip()[:24] or now.split("T")[0],
        "notes": notes.strip()[:4000],
        "bytes": ingest["total_bytes"],
        "file_count": ingest["file_count"],
        "created_at": now,
    })
    return {"ok": True}


@router.post("/games/{slug}/patch")
async def add_patch_note(
    slug: str,
    version: str = Form(""),
    notes: str = Form(...),
    user=Depends(current_user),
):
    g = await db.games.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not the owner")
    now = datetime.now(timezone.utc).isoformat()
    await db.releases.insert_one({
        "id": f"rel_{uuid.uuid4().hex[:12]}",
        "game_id": g["id"],
        "version": version.strip()[:24] or now.split("T")[0],
        "notes": notes.strip()[:4000],
        "bytes": g.get("upload_bytes", 0),
        "file_count": g.get("upload_file_count", 0),
        "created_at": now,
    })
    await db.games.update_one({"id": g["id"]}, {"$set": {"updated_at": now}})
    return {"ok": True}


@router.post("/games/{slug}/thumbnail")
async def upload_thumbnail(
    slug: str,
    file: UploadFile = File(...),
    user=Depends(current_user),
):
    g = await db.games.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Game not found")
    if g["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not the owner")
    if not await rate_limit_check(f"gameupdate:{user['id']}:{g['id']}", limit=20, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many updates, slow down")
    ct = (file.content_type or "").lower()
    if ct not in THUMB_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP allowed")
    data = await file.read()
    if len(data) > MAX_THUMB_BYTES:
        raise HTTPException(status_code=400, detail="Thumbnail too large (max 8MB)")

    ext = THUMB_TYPES[ct]
    path = f"{APP_NAME}/media/{g['id']}/capsule.{ext}"
    put_object(path, data, ct)
    cover_url = f"/api/media/{g['id']}/capsule.{ext}"
    now = datetime.now(timezone.utc).isoformat()
    await db.games.update_one(
        {"id": g["id"]},
        {"$set": {"cover_image": cover_url, "updated_at": now}},
    )
    await db.media_assets.insert_one({
        "id": f"med_{uuid.uuid4().hex[:12]}",
        "game_id": g["id"],
        "type": "capsule",
        "moderation_status": "clear",
        "source_path": cover_url,
        "thumbnail_path": cover_url,
        "created_at": now,
    })
    return {"ok": True, "cover_image": cover_url}


@router.get("/media/{game_id}/{filename}")
async def serve_media(game_id: str, filename: str):
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    path = f"{APP_NAME}/media/{game_id}/{filename}"
    try:
        data, ct = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=3600"})


def _inject_base_href(html_bytes: bytes, base_url: str) -> bytes:
    """Insert <base href> so relative and root-absolute paths resolve under UGC prefix."""
    try:
        text = html_bytes.decode("utf-8", errors="replace")
    except Exception:
        return html_bytes
    tag = f'<base href="{base_url}">'
    lower = text.lower()
    # Avoid double-injection
    if "<base " in lower:
        return html_bytes
    if "<head>" in lower:
        idx = lower.find("<head>") + len("<head>")
        out = text[:idx] + "\n" + tag + "\n" + text[idx:]
    elif "<html>" in lower:
        idx = lower.find("<html>") + len("<html>")
        out = text[:idx] + f"\n<head>{tag}</head>\n" + text[idx:]
    else:
        out = tag + text
    return out.encode("utf-8")


@router.get("/ugc/{game_id}/{path:path}")
async def serve_ugc(game_id: str, path: str, request: Request):
    # Block top-level document navigation; only allow iframe/sub-resource loads
    sec_fetch_dest = request.headers.get("sec-fetch-dest", "").lower()
    if sec_fetch_dest == "document":
        # Look up slug for redirect
        g = await db.games.find_one({"id": game_id}, {"_id": 0, "slug": 1})
        if g:
            return RedirectResponse(url=f"/games/{g['slug']}/play", status_code=302)
        return RedirectResponse(url="/", status_code=302)
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
    obj_path = f"{APP_NAME}/ugc/{game_id}/{path}"
    try:
        data, ct = get_object(obj_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    # For HTML entry pages, inject a <base href> so relative/root-absolute asset
    # paths inside the uploaded game resolve under /api/ugc/<game_id>/<dir>/.
    if ct.startswith("text/html"):
        dir_part = path.rsplit("/", 1)[0] + "/" if "/" in path else ""
        base_url = f"/api/ugc/{game_id}/{dir_part}"
        data = _inject_base_href(data, base_url)
    headers = {
        "Cache-Control": "public, max-age=3600",
        # Iframe is sandboxed (no allow-same-origin) so origin is already opaque.
        # CSP here is permissive so the game's own bundled assets can load.
        "Content-Security-Policy": (
            "default-src * data: blob:; "
            "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; "
            "style-src * data: blob: 'unsafe-inline'; "
            "img-src * data: blob:; media-src * data: blob:; "
            "font-src * data: blob:; connect-src * data: blob:;"
        ),
        "X-Content-Type-Options": "nosniff",
    }
    return Response(content=data, media_type=ct, headers=headers)


@router.post("/games/{slug}/play")
async def increment_play(slug: str):
    await db.games.update_one({"slug": slug, "deleted_at": None}, {"$inc": {"play_count": 1}})
    return {"ok": True}


# Creator-owned listing
@router.get("/creator/games")
async def my_games(user=Depends(current_user)):
    games = await db.games.find({"owner_id": user["id"], "deleted_at": None}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return {"games": await attach_owner(games)}
