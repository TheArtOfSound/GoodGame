"""Creator profile endpoints with follower stats and follow state."""
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException

from auth import get_session_user
from db import db
from games import attach_owner

router = APIRouter(prefix="/api", tags=["creators"])


@router.get("/creators/{username}")
async def get_creator(username: str, gg_session: Optional[str] = Cookie(None)):
    username = username.strip().lower()
    user = await db.users.find_one(
        {"username": username, "is_active": True},
        {"_id": 0, "password_hash": 0, "pin_hash": 0},
    )
    if not user or user.get("is_system"):
        raise HTTPException(status_code=404, detail="Creator not found")
    viewer = await get_session_user(gg_session)
    is_self = bool(viewer and viewer["id"] == user["id"])

    game_query: dict = {"owner_id": user["id"], "deleted_at": None}
    if not is_self:
        game_query.update({
            "status": "published",
            "moderation_status": "clear",
            "scan_status": "passed",
        })
    games_raw = await db.games.find(game_query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    games = await attach_owner(games_raw)

    clips_raw = await db.clips.find(
        {"author_id": user["id"], "visibility": "public", "moderation_status": "clear", "deleted_at": None},
        {"_id": 0},
    ).sort("created_at", -1).limit(20).to_list(20)

    follower_count = await db.follows.count_documents({"following_id": user["id"]})
    following_count = await db.follows.count_documents({"follower_id": user["id"]})
    is_following = False
    if viewer and not is_self:
        is_following = bool(
            await db.follows.find_one({"follower_id": viewer["id"], "following_id": user["id"]})
        )

    return {
        "creator": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user.get("display_name") or user["username"],
            "avatar": user.get("avatar_url"),
            "banner": user.get("banner_url"),
            "bio": user.get("bio", ""),
            "joined": user.get("created_at"),
            "follower_count": follower_count,
            "following_count": following_count,
        },
        "is_self": is_self,
        "is_following": is_following,
        "games": games,
        "clips": clips_raw,
    }


@router.get("/creators/{username}/followers")
async def list_followers(username: str, limit: int = 50):
    user = await db.users.find_one({"username": username.strip().lower()}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Creator not found")
    rels = await db.follows.find({"following_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(min(limit, 200)).to_list(limit)
    ids = [r["follower_id"] for r in rels]
    if not ids:
        return {"followers": []}
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1}).to_list(len(ids))
    return {"followers": users}


@router.get("/creators/{username}/following")
async def list_following(username: str, limit: int = 50):
    user = await db.users.find_one({"username": username.strip().lower()}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Creator not found")
    rels = await db.follows.find({"follower_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(min(limit, 200)).to_list(limit)
    ids = [r["following_id"] for r in rels]
    if not ids:
        return {"following": []}
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1}).to_list(len(ids))
    return {"following": users}
