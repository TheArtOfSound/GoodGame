import os
from datetime import datetime, timezone

from fastapi import FastAPI

app = FastAPI(title="GoodGame Railway Entrypoint")


@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "goodgame-web"}


@app.get("/__version")
async def version():
    return {
        "ok": True,
        "service": "goodgame-web",
        "build_sha": os.environ.get("RAILWAY_GIT_COMMIT_SHA", "dev"),
        "build_ref": os.environ.get("RAILWAY_GIT_BRANCH", "main"),
        "deployment_id": os.environ.get("RAILWAY_DEPLOYMENT_ID"),
        "build_time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/")
async def home():
    return {"ok": True, "service": "goodgame-web", "message": "GoodGame is live"}


@app.get("/api/")
async def api_root():
    return {"ok": True, "service": "goodgame-web"}
