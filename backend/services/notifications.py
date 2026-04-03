"""Email и push: обёртки над каналами доставки."""

from __future__ import annotations

import logging
from datetime import datetime

from services.email_service import send_booking_confirmation_email

logger = logging.getLogger(__name__)


async def send_payment_confirmation_email(
    to_email: str,
    booking_id: int,
    *,
    event_title: str,
    start_at: datetime,
    participants_count: int,
) -> None:
    await send_booking_confirmation_email(
        to_email,
        booking_id,
        event_title=event_title,
        start_at=start_at,
        participants_count=participants_count,
    )


async def send_payment_confirmation_push(user_id: int, booking_id: int) -> None:
    logger.info(
        "Push: подтверждение оплаты бронирования id=%s для user_id=%s",
        booking_id,
        user_id,
    )
