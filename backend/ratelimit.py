"""Mongo-backed rate limiter. Survives backend restarts and is safe across workers.

Schema:
  rate_limits: { key: str, ts: BSON datetime }
Indexes:
  (key, ts desc) for fast windowed counts
  TTL on ts (expireAfterSeconds=86400) so the collection self-cleans within a day
"""
import asyncio
from datetime import datetime, timedelta, timezone

from db import db

_index_init_lock = asyncio.Lock()
_indexes_ready = False


async def _ensure_indexes():
    global _indexes_ready
    if _indexes_ready:
        return
    async with _index_init_lock:
        if _indexes_ready:
            return
        await db.rate_limits.create_index([("key", 1), ("ts", -1)])
        # Auto-clean buckets older than 24 hours so the collection stays small.
        await db.rate_limits.create_index("ts", expireAfterSeconds=86400)
        _indexes_ready = True


async def rate_limit_check(key: str, limit: int, window_seconds: int) -> bool:
    """Atomic-ish sliding window check. Returns True if allowed, False if exceeded."""
    await _ensure_indexes()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)
    count = await db.rate_limits.count_documents({"key": key, "ts": {"$gt": cutoff}})
    if count >= limit:
        return False
    await db.rate_limits.insert_one({"key": key, "ts": now})
    return True
