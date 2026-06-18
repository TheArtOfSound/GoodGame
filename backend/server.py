"""GoodGame.center main FastAPI application."""
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth import router as auth_router  # noqa: E402
from clips import router as clips_router  # noqa: E402
from communities import router as communities_router  # noqa: E402
from creators import router as creators_router  # noqa: E402
from discover import router as discover_router  # noqa: E402
from games import router as games_router  # noqa: E402
from profile import router as profile_router  # noqa: E402
from storage import init_storage  # noqa: E402
from user_media import router as user_media_router  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("goodgame")

app = FastAPI(title="GoodGame.center API")

# CORS: allow_origins from env (comma-separated). Falls back to a regex that
# reflects any HTTPS origin so credentialed requests still get the actual
# origin echoed back (never `*`).
_cors_env = (os.environ.get("CORS_ORIGINS") or "").strip()
if _cors_env and _cors_env != "*":
    _allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=_allow_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origin_regex=r"https?://.*",
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.get("/api/__version")
async def version():
    return {
        "ok": True,
        "service": "goodgame-web",
        "build_sha": os.environ.get("BUILD_SHA", "dev"),
        "build_ref": os.environ.get("BUILD_REF", "main"),
        "build_time": os.environ.get("BUILD_TIME", datetime.now(timezone.utc).isoformat()),
        "url": "/",
    }


@app.get("/api/")
async def root():
    return {"ok": True, "service": "goodgame-web"}


app.include_router(auth_router)
app.include_router(games_router)
app.include_router(discover_router)
app.include_router(clips_router)
app.include_router(communities_router)
app.include_router(creators_router)
app.include_router(profile_router)
app.include_router(user_media_router)
