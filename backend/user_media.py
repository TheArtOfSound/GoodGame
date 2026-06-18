"""Public/internal media serving for user-uploaded avatars + banners."""
from fastapi import APIRouter, HTTPException, Response

from storage import APP_NAME, get_object

router = APIRouter(prefix="/api", tags=["user-media"])


@router.get("/user-media/{asset_id}/{filename}")
async def serve_user_media(asset_id: str, filename: str):
    if "/" in filename or ".." in filename or "/" in asset_id or ".." in asset_id:
        raise HTTPException(status_code=400, detail="Invalid path")
    obj_path = f"{APP_NAME}/user-media/{asset_id}/{filename}"
    try:
        data, ct = get_object(obj_path)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=3600"})
