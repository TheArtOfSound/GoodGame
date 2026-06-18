"""Emergent object storage client + zip ingest utilities."""
import io
import os
import zipfile
from typing import Tuple
import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "goodgame")

_storage_key: str | None = None

# Zip ingest limits
MAX_FILES = 2000
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_TOTAL_BYTES = 200 * 1024 * 1024
BLOCKED_EXTS = {
    ".exe", ".bat", ".cmd", ".com", ".scr", ".msi", ".dll", ".sh",
    ".app", ".dmg", ".pkg", ".jar", ".vbs", ".ps1",
}
BLOCKED_PREFIXES = ("__MACOSX/", ".git/", ".DS_Store")

CONTENT_TYPE_BY_EXT = {
    "html": "text/html; charset=utf-8",
    "htm": "text/html; charset=utf-8",
    "js": "application/javascript; charset=utf-8",
    "mjs": "application/javascript; charset=utf-8",
    "css": "text/css; charset=utf-8",
    "json": "application/json; charset=utf-8",
    "wasm": "application/wasm",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "ico": "image/x-icon",
    "mp3": "audio/mpeg",
    "ogg": "audio/ogg",
    "wav": "audio/wav",
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "txt": "text/plain; charset=utf-8",
    "ttf": "font/ttf",
    "woff": "font/woff",
    "woff2": "font/woff2",
    "glb": "model/gltf-binary",
    "gltf": "model/gltf+json",
    "map": "application/json",
}


def init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> Tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def content_type_for(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    return CONTENT_TYPE_BY_EXT.get(ext, "application/octet-stream")


def safe_member_name(name: str) -> str | None:
    """Normalize and validate a zip member path. Returns None if unsafe."""
    if not name or name.endswith("/"):
        return None
    if name.startswith("/") or ".." in name.split("/"):
        return None
    if any(name.startswith(p) or f"/{p}" in name for p in BLOCKED_PREFIXES):
        return None
    if "\\" in name:
        return None
    ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in BLOCKED_EXTS:
        return None
    return name


def ingest_game_zip(zip_bytes: bytes, game_id: str) -> dict:
    """
    Extracts and uploads a zip game build to object storage under ugc/<game_id>/.
    Returns dict with entry_path, file_count, total_bytes, engine (best-effort).
    Raises ValueError on validation failures.
    """
    if len(zip_bytes) > MAX_TOTAL_BYTES:
        raise ValueError("Zip file too large")

    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile as e:
        raise ValueError(f"Invalid zip file: {e}")

    members = zf.infolist()
    if len(members) > MAX_FILES:
        raise ValueError(f"Too many files in zip (max {MAX_FILES})")

    # Pre-scan and compute root prefix (some zips wrap in a folder)
    safe_names: list[tuple[zipfile.ZipInfo, str]] = []
    total = 0
    for m in members:
        if m.is_dir():
            continue
        if m.file_size > MAX_FILE_BYTES:
            raise ValueError(f"File too large: {m.filename}")
        # Zip-bomb basic check: compression ratio
        if m.compress_size > 0 and m.file_size / max(m.compress_size, 1) > 200:
            raise ValueError(f"Suspicious compression ratio: {m.filename}")
        total += m.file_size
        if total > MAX_TOTAL_BYTES:
            raise ValueError("Total uncompressed size too large")
        clean = safe_member_name(m.filename)
        if clean is None:
            continue
        safe_names.append((m, clean))

    if not safe_names:
        raise ValueError("Zip contains no usable files")

    # Detect common single-folder wrapper
    first_segs = {n.split("/", 1)[0] for _, n in safe_names if "/" in n}
    if len(first_segs) == 1 and all("/" in n for _, n in safe_names):
        prefix = next(iter(first_segs)) + "/"
        safe_names = [(m, n[len(prefix):]) for m, n in safe_names]

    # Must include an index.html
    names_lower = {n.lower(): n for _, n in safe_names}
    if "index.html" not in names_lower:
        raise ValueError("Zip must contain an index.html at the root")
    entry_path = names_lower["index.html"]

    # Best-effort engine detection
    engine = "html5"
    name_set = set(names_lower.keys())
    if any("unityweb" in n or "unityloader" in n for n in name_set):
        engine = "unity"
    elif any(n.endswith(".pck") for n in name_set):
        engine = "godot"
    elif any("phaser" in n for n in name_set):
        engine = "phaser"

    # Upload everything
    for m, clean in safe_names:
        with zf.open(m) as f:
            data = f.read()
        path = f"{APP_NAME}/ugc/{game_id}/{clean}"
        put_object(path, data, content_type_for(clean))

    return {
        "entry_path": entry_path,
        "file_count": len(safe_names),
        "total_bytes": total,
        "engine": engine,
    }
