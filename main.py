import os
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="GoodGame Railway App")


@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "goodgame-web"}


@app.get("/__version")
async def version():
    return {
        "ok": True,
        "service": "goodgame-web",
        "provider": "railway",
        "build_sha": os.environ.get("RAILWAY_GIT_COMMIT_SHA", "dev"),
        "build_ref": os.environ.get("RAILWAY_GIT_BRANCH", "main"),
        "deployment_id": os.environ.get("RAILWAY_DEPLOYMENT_ID"),
        "build_time": datetime.now(timezone.utc).isoformat(),
        "port": os.environ.get("PORT", "8080"),
    }


@app.get("/")
async def home():
    return HTMLResponse(
        """<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>GoodGame.center</title><style>body{margin:0;background:#050505;color:#f5f0df;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}main{max-width:900px;padding:44px;border:1px solid #3a2a0c;background:#0b0b0b;box-shadow:0 20px 80px #000}h1{font-size:clamp(42px,8vw,92px);line-height:.9;margin:0 0 18px;letter-spacing:-.07em}.gold{color:#f6c451;text-transform:uppercase;letter-spacing:.14em;font-size:13px}p{color:#aaa;font-size:18px}a{color:#f6c451}</style></head><body><main><p class='gold'>GoodGame.center</p><h1>GoodGame is live.</h1><p>Railway is serving this app. Health: <a href='/healthz'>/healthz</a>. Version: <a href='/__version'>/__version</a>.</p></main></body></html>"""
    )


@app.get("/api/")
async def api_root():
    return {"ok": True, "service": "goodgame-web"}
