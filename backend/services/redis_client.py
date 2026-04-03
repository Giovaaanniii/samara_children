from __future__ import annotations

from typing import Annotated

import redis.asyncio as redis
from fastapi import Depends

from config import settings

_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


RedisDep = Annotated[redis.Redis, Depends(get_redis)]
