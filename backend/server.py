"""GoodGame.center main FastAPI application."""
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
PROJECT_ROOT = ROOT_DIR.parent
FRONTEND_BUILD_DIR = PROJECT_ROOT / "frontend" / "build"
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
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


def version_payload():
    build_sha = (
        os.environ.get("RAILWAY_GIT_COMMIT_SHA")
        or os.environ.get("BUILD_SHA")
        or os.environ.get("GIT_COMMIT_SHA")
        or "dev"
    )
    build_ref = (
        os.environ.get("RAILWAY_GIT_BRANCH")
        or os.environ.get("BUILD_REF")
        or os.environ.get("GIT_BRANCH")
        or "main"
    )
    return {
        "ok": True,
        "service": "goodgame-web",
        "provider": os.environ.get("RAILWAY_SERVICE_NAME", "railway"),
        "build_sha": build_sha,
        "build_ref": build_ref,
        "deployment_id": os.environ.get("RAILWAY_DEPLOYMENT_ID"),
        "build_time": os.environ.get("BUILD_TIME", datetime.now(timezone.utc).isoformat()),
        "url": "/",
    }


@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "goodgame-web"}


@app.get("/__version")
async def public_version():
    return version_payload()


@app.get("/api/__version")
async def version():
    return version_payload()


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

if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="static")


    @app.get("/")
    @app.head("/")
    async def frontend_index():
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")


    @app.get("/{path:path}", include_in_schema=False)
    @app.head("/{path:path}", include_in_schema=False)
    async def frontend_fallback(path: str):
        requested = FRONTEND_BUILD_DIR / path
        if requested.is_file():
            return FileResponse(requested)
        return FileResponse(FRONTEND_BUILD_DIR / "index.html")
