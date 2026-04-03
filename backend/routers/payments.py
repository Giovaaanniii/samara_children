from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.payment_service import handle_webhook
from services.redis_client import RedisDep

router = APIRouter(prefix="/payment", tags=["payments"])


@router.post("/webhook")
async def yookassa_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: RedisDep,
) -> dict:
    return await handle_webhook(request, db, redis_client=redis)
