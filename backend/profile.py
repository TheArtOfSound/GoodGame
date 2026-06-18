"""User profile management: avatar/banner/bio/display_name and follow/unfollow."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from auth import get_session_user, rate_limit
from db import db
from storage import APP_NAME, put_object

router = APIRouter(prefix="/api", tags=["profile"])

MAX_AVATAR_BYTES = 4 * 1024 * 1024
MAX_BANNER_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}


async def current_user(gg_session: Optional[str] = Cookie(None)):
    user = await get_session_user(gg_session)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


class ProfileIn(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None


@router.patch("/me/profile")
async def update_profile(payload: ProfileIn, user=Depends(current_user)):
    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.display_name is not None:
        dn = payload.display_name.strip()[:60]
        if not dn:
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        updates["display_name"] = dn
    if payload.bio is not None:
        updates["bio"] = payload.bio.strip()[:600]
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return {"ok": True}


async def _upload_user_image(user_id: str, kind: str, file: UploadFile, max_bytes: int) -> str:
    ct = (file.content_type or "").lower()
    if ct not in IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, WebP allowed")
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_bytes // (1024*1024)}MB)")
    ext = IMAGE_TYPES[ct]
    # Use a public-safe random id, NOT the user id, in the path
    asset_id = uuid.uuid4().hex[:14]
    path = f"{APP_NAME}/user-media/{asset_id}/{kind}.{ext}"
    put_object(path, data, ct)
    return f"/api/user-media/{asset_id}/{kind}.{ext}"


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(current_user)):
    url = await _upload_user_image(user["id"], "avatar", file, MAX_AVATAR_BYTES)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatar_url": url, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "avatar_url": url}


@router.post("/me/banner")
async def upload_banner(file: UploadFile = File(...), user=Depends(current_user)):
    url = await _upload_user_image(user["id"], "banner", file, MAX_BANNER_BYTES)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"banner_url": url, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "banner_url": url}


# ---------- Follow / Unfollow ----------
async def _resolve_target(username: str):
    target = await db.users.find_one({"username": username.strip().lower(), "is_active": True}, {"_id": 0})
    if not target or target.get("is_system"):
        raise HTTPException(status_code=404, detail="User not found")
    return target


@router.post("/follow/{username}")
async def follow(username: str, user=Depends(current_user)):
    if not rate_limit(f"follow:{user['id']}", limit=120, window_seconds=300):
        raise HTTPException(status_code=429, detail="Slow down")
    target = await _resolve_target(username)
    if target["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = await db.follows.find_one({"follower_id": user["id"], "following_id": target["id"]})
    if not existing:
        await db.follows.insert_one({
            "id": f"flw_{uuid.uuid4().hex[:12]}",
            "follower_id": user["id"],
            "following_id": target["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return {"ok": True, "following": True}


@router.post("/unfollow/{username}")
async def unfollow(username: str, user=Depends(current_user)):
    target = await _resolve_target(username)
    await db.follows.delete_one({"follower_id": user["id"], "following_id": target["id"]})
    return {"ok": True, "following": False}
