"""Authentication: PBKDF2 hashing, sessions, cookies, rate limiting."""
import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from db import db
from ratelimit import rate_limit_check

router = APIRouter(prefix="/api", tags=["auth"])

SESSION_COOKIE = "gg_session"
SESSION_TTL = timedelta(days=30)
PBKDF2_ITERATIONS = 600_000

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,24}$")
RESERVED_USERNAMES = {
    "admin", "system", "support", "goodgame", "root", "moderator", "mod",
    "staff", "official", "owner",
}

# Legacy in-memory bucket kept ONLY as a fallback alias so any caller still
# importing `rate_limit` from auth gets the durable Mongo-backed checker.
async def rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    return await rate_limit_check(key, limit, window_seconds)


# ---------- Hashing ----------
def hash_password(plain: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2${PBKDF2_ITERATIONS}${salt.hex()}${h.hex()}"


def verify_password(plain: str, stored: str) -> tuple[bool, bool]:
    """Returns (ok, needs_rehash). Supports legacy sha256 hex."""
    if stored.startswith("pbkdf2$"):
        try:
            _, iters_str, salt_hex, hash_hex = stored.split("$", 3)
            iters = int(iters_str)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(hash_hex)
        except Exception:
            return False, False
        derived = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, iters)
        return hmac.compare_digest(derived, expected), iters < PBKDF2_ITERATIONS
    # Legacy SHA-256 hex
    legacy = hashlib.sha256(plain.encode("utf-8")).hexdigest()
    if hmac.compare_digest(legacy, stored):
        return True, True
    return False, False


# ---------- Session helpers ----------
async def create_session(user_id: str) -> str:
    sid = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + SESSION_TTL
    await db.sessions.insert_one({
        "id": sid,
        "user_id": user_id,
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return sid


async def delete_session(sid: str):
    await db.sessions.delete_one({"id": sid})


async def delete_user_sessions(user_id: str):
    await db.sessions.delete_many({"user_id": user_id})


async def get_session_user(sid: Optional[str]):
    if not sid:
        return None
    sess = await db.sessions.find_one({"id": sid}, {"_id": 0})
    if not sess:
        return None
    try:
        exp = datetime.fromisoformat(sess["expires_at"])
    except Exception:
        return None
    if exp < datetime.now(timezone.utc):
        await delete_session(sid)
        return None
    user = await db.users.find_one({"id": sess["user_id"]}, {"_id": 0, "password_hash": 0, "pin_hash": 0})
    return user


def set_session_cookie(resp: Response, sid: str, secure: bool = True):
    # If we're on HTTPS, allow cross-origin cookies so a Vercel frontend can
    # authenticate against a Railway-hosted API on a different host. This
    # requires SameSite=None + Secure per browser policy.
    samesite = "none" if secure else "lax"
    resp.set_cookie(
        key=SESSION_COOKIE,
        value=sid,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )


def clear_session_cookie(resp: Response):
    resp.delete_cookie(SESSION_COOKIE, path="/")


# ---------- Pydantic schemas ----------
class OnboardingIn(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    display_name: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)
    pin: str = Field(min_length=4, max_length=8)


class LoginIn(BaseModel):
    username: str
    password: str


def require_secure(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    return proto == "https"


# ---------- Routes ----------
@router.post("/onboarding")
async def onboarding(payload: OnboardingIn, request: Request, response: Response):
    ip = request.client.host if request.client else "anon"
    if not await rate_limit_check(f"onboarding:{ip}", limit=20, window_seconds=600):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")

    username = payload.username.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Username must be 3-24 chars, letters/numbers/underscore")
    if username in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="That username is reserved")
    if not payload.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be digits only")

    existing = await db.users.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    user_id = f"usr_{uuid.uuid4().hex[:18]}"
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "username": username,
        "display_name": (payload.display_name or username).strip()[:60],
        "password_hash": hash_password(payload.password),
        "pin_hash": hash_password(payload.pin),
        "avatar_url": None,
        "banner_url": None,
        "bio": "",
        "is_active": True,
        "is_system": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.users.insert_one(user_doc)

    sid = await create_session(user_id)
    set_session_cookie(response, sid, secure=require_secure(request))
    return {
        "ok": True,
        "user": {
            "id": user_id,
            "username": username,
            "display_name": user_doc["display_name"],
            "avatar": None,
        },
    }


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    ip = request.client.host if request.client else "anon"
    if not await rate_limit_check(f"login:{ip}", limit=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    if not await rate_limit_check(f"login_user:{payload.username.lower()}", limit=10, window_seconds=300):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")

    user = await db.users.find_one({"username": payload.username.strip().lower()})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    ok, needs_rehash = verify_password(payload.password, user["password_hash"])
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    updates = {}
    if needs_rehash:
        updates["password_hash"] = hash_password(payload.password)
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": updates})

    sid = await create_session(user["id"])
    set_session_cookie(response, sid, secure=require_secure(request))
    return {
        "ok": True,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user.get("display_name") or user["username"],
            "avatar": user.get("avatar_url"),
        },
    }


@router.post("/logout")
async def logout(response: Response, gg_session: Optional[str] = Cookie(None)):
    if gg_session:
        await delete_session(gg_session)
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/session")
async def session(response: Response, gg_session: Optional[str] = Cookie(None)):
    response.headers["Cache-Control"] = "no-store"
    user = await get_session_user(gg_session)
    if not user:
        return {"logged_in": False, "username": None}
    return {
        "logged_in": True,
        "id": user["id"],
        "username": user["username"],
        "display_name": user.get("display_name") or user["username"],
        "avatar": user.get("avatar_url"),
    }
