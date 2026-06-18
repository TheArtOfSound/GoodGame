"""Communities: create/join, posts, moderation (members, roles, mute, ban, reports)."""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Form, HTTPException
from pydantic import BaseModel

from auth import get_session_user
from db import db
from ratelimit import rate_limit_check

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


async def _community(slug: str) -> dict:
    c = await db.communities.find_one({"slug": slug, "deleted_at": None}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Community not found")
    return c


async def _require_mod(c: dict, user: dict) -> str:
    role = await role_in(c["id"], user["id"])
    if role not in ("owner", "moderator"):
        raise HTTPException(status_code=403, detail="Moderators only")
    return role


async def _audit(actor_id: str, action: str, target_id: str, meta: Optional[dict] = None):
    await db.audit_log.insert_one({
        "id": f"aud_{uuid.uuid4().hex[:12]}",
        "actor_id": actor_id,
        "action": action,
        "target_id": target_id,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/communities")
async def list_communities(limit: int = 50):
    items = await db.communities.find({"deleted_at": None}, {"_id": 0}).sort("created_at", -1).limit(min(limit, 100)).to_list(limit)
    if not items:
        return {"communities": []}
    ids = [c["id"] for c in items]
    # Single aggregation instead of N count_documents calls
    pipeline = [
        {"$match": {"community_id": {"$in": ids}, "banned": {"$ne": True}}},
        {"$group": {"_id": "$community_id", "count": {"$sum": 1}}},
    ]
    rows = await db.community_members.aggregate(pipeline).to_list(len(ids))
    counts_by_id = {r["_id"]: r["count"] for r in rows}
    return {"communities": [community_view(c, counts_by_id.get(c["id"], 0)) for c in items]}


class CommunityIn(BaseModel):
    name: str
    description: str = ""


@router.post("/communities")
async def create_community(payload: CommunityIn, user=Depends(current_user)):
    if not await rate_limit_check(f"comcreate:{user['id']}", limit=10, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Too many communities created, try later")
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
    c = await _community(slug)
    member_count = await db.community_members.count_documents({"community_id": c["id"], "banned": {"$ne": True}})
    role = await role_in(c["id"], viewer["id"] if viewer else "")
    posts = await db.community_posts.find(
        {"community_id": c["id"], "hidden": False, "deleted_at": None},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(50)
    author_ids = list({p["author_id"] for p in posts})
    authors: dict = {}
    if author_ids:
        for u in await db.users.find(
            {"id": {"$in": author_ids}},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1},
        ).to_list(len(author_ids)):
            authors[u["id"]] = u
    return {
        "community": community_view(c, member_count),
        "role": role,
        "posts": [
            {
                **p,
                "author_username": authors.get(p["author_id"], {}).get("username"),
                "author_display_name": authors.get(p["author_id"], {}).get("display_name") or authors.get(p["author_id"], {}).get("username"),
                "author_avatar": authors.get(p["author_id"], {}).get("avatar_url"),
            }
            for p in posts
        ],
    }


@router.post("/communities/{slug}/join")
async def join_community(slug: str, user=Depends(current_user)):
    c = await _community(slug)
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
    c = await _community(slug)
    role = await role_in(c["id"], user["id"])
    if role == "guest":
        raise HTTPException(status_code=403, detail="Join the community first")
    if role in ("banned", "muted"):
        raise HTTPException(status_code=403, detail="You cannot post here")
    if not await rate_limit_check(f"compost:{user['id']}:{c['id']}", limit=20, window_seconds=300):
        raise HTTPException(status_code=429, detail="Slow down — too many posts")
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
    c = await _community(slug)
    await _require_mod(c, user)
    res = await db.community_posts.update_one({"id": post_id, "community_id": c["id"]}, {"$set": {"hidden": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    await _audit(user["id"], "community.post.hide", post_id, {"community": c["slug"]})
    return {"ok": True}


# ---------- Membership / moderation ----------

@router.get("/communities/{slug}/members")
async def list_members(slug: str, viewer=Depends(maybe_user)):
    c = await _community(slug)
    role = await role_in(c["id"], viewer["id"] if viewer else "")
    members = await db.community_members.find(
        {"community_id": c["id"]}, {"_id": 0}
    ).sort("joined_at", 1).to_list(500)
    user_ids = [m["user_id"] for m in members]
    users: dict = {}
    if user_ids:
        for u in await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "username": 1, "display_name": 1, "avatar_url": 1},
        ).to_list(len(user_ids)):
            users[u["id"]] = u
    # Non-mods can see role+display but not muted/banned details
    is_mod = role in ("owner", "moderator")
    out = []
    for m in members:
        u = users.get(m["user_id"], {})
        item = {
            "user_id": m["user_id"],
            "username": u.get("username"),
            "display_name": u.get("display_name") or u.get("username"),
            "avatar": u.get("avatar_url"),
            "role": m.get("role", "member"),
            "joined_at": m.get("joined_at"),
        }
        if is_mod:
            item["muted"] = bool(m.get("muted"))
            item["banned"] = bool(m.get("banned"))
        elif m.get("banned"):
            continue
        out.append(item)
    return {"members": out, "viewer_role": role}


async def _find_member(community_id: str, user_id: str) -> dict:
    m = await db.community_members.find_one({"community_id": community_id, "user_id": user_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    return m


@router.post("/communities/{slug}/members/{user_id}/role")
async def change_role(slug: str, user_id: str, role: str = Form(...), user=Depends(current_user)):
    c = await _community(slug)
    viewer_role = await role_in(c["id"], user["id"])
    if viewer_role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    if role not in ("member", "moderator"):
        raise HTTPException(status_code=400, detail="Role must be member or moderator")
    if user_id == c["owner_id"]:
        raise HTTPException(status_code=400, detail="Cannot change owner role")
    m = await _find_member(c["id"], user_id)
    await db.community_members.update_one(
        {"community_id": c["id"], "user_id": user_id},
        {"$set": {"role": role}},
    )
    await _audit(user["id"], f"community.role.{role}", user_id, {"community": c["slug"], "prev": m.get("role")})
    return {"ok": True}


@router.post("/communities/{slug}/members/{user_id}/mute")
async def mute_member(slug: str, user_id: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    if user_id == c["owner_id"]:
        raise HTTPException(status_code=400, detail="Cannot mute the owner")
    await _find_member(c["id"], user_id)
    await db.community_members.update_one(
        {"community_id": c["id"], "user_id": user_id},
        {"$set": {"muted": True}},
    )
    await _audit(user["id"], "community.mute", user_id, {"community": c["slug"]})
    return {"ok": True}


@router.post("/communities/{slug}/members/{user_id}/unmute")
async def unmute_member(slug: str, user_id: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    await _find_member(c["id"], user_id)
    await db.community_members.update_one(
        {"community_id": c["id"], "user_id": user_id},
        {"$set": {"muted": False}},
    )
    await _audit(user["id"], "community.unmute", user_id, {"community": c["slug"]})
    return {"ok": True}


@router.post("/communities/{slug}/members/{user_id}/ban")
async def ban_member(slug: str, user_id: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    if user_id == c["owner_id"]:
        raise HTTPException(status_code=400, detail="Cannot ban the owner")
    await _find_member(c["id"], user_id)
    await db.community_members.update_one(
        {"community_id": c["id"], "user_id": user_id},
        {"$set": {"banned": True, "muted": False}},
    )
    await _audit(user["id"], "community.ban", user_id, {"community": c["slug"]})
    return {"ok": True}


@router.post("/communities/{slug}/members/{user_id}/unban")
async def unban_member(slug: str, user_id: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    await _find_member(c["id"], user_id)
    await db.community_members.update_one(
        {"community_id": c["id"], "user_id": user_id},
        {"$set": {"banned": False}},
    )
    await _audit(user["id"], "community.unban", user_id, {"community": c["slug"]})
    return {"ok": True}


@router.post("/communities/{slug}/members/{user_id}/remove")
async def remove_member(slug: str, user_id: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    if user_id == c["owner_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
    await db.community_members.delete_one({"community_id": c["id"], "user_id": user_id})
    await _audit(user["id"], "community.remove", user_id, {"community": c["slug"]})
    return {"ok": True}


# ---------- Reports ----------

@router.post("/reports")
async def report(
    target_type: str = Form(...),
    target_id: str = Form(...),
    reason: str = Form(...),
    community_slug: str = Form(""),
    user=Depends(current_user),
):
    if target_type not in {"game", "clip", "community_post", "user"}:
        raise HTTPException(status_code=400, detail="Invalid target type")
    if not await rate_limit_check(f"report:{user['id']}", limit=20, window_seconds=600):
        raise HTTPException(status_code=429, detail="Too many reports, try later")
    community_id = None
    if community_slug.strip():
        c = await db.communities.find_one({"slug": community_slug.strip().lower(), "deleted_at": None}, {"_id": 0, "id": 1})
        if c:
            community_id = c["id"]
    rid = f"rep_{uuid.uuid4().hex[:12]}"
    await db.reports.insert_one({
        "id": rid,
        "reporter_id": user["id"],
        "target_type": target_type,
        "target_id": target_id,
        "community_id": community_id,
        "reason": reason.strip()[:500],
        "status": "open",
        "resolution": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "report_id": rid}


@router.get("/communities/{slug}/reports")
async def community_reports(slug: str, user=Depends(current_user)):
    c = await _community(slug)
    await _require_mod(c, user)
    reports = await db.reports.find(
        {"community_id": c["id"], "status": "open"}, {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    return {"reports": reports}


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, resolution: str = Form("dismissed"), user=Depends(current_user)):
    r = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    # If community-scoped, require mod role; otherwise any logged-in user can only resolve their own.
    if r.get("community_id"):
        c = await db.communities.find_one({"id": r["community_id"]}, {"_id": 0})
        if not c:
            raise HTTPException(status_code=404, detail="Community gone")
        await _require_mod(c, user)
    else:
        if r["reporter_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not allowed")
    await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "resolution": resolution.strip()[:200], "resolved_by": user["id"], "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _audit(user["id"], "report.resolve", report_id, {"resolution": resolution})
    return {"ok": True}
