"""Email и push: заглушки с логированием (SendGrid / FCM — позже)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


async def send_payment_confirmation_email(to_email: str, booking_id: int) -> None:
    logger.info(
        "Email: подтверждение оплаты бронирования id=%s на адрес %s",
        booking_id,
        to_email,
    )


async def send_payment_confirmation_push(user_id: int, booking_id: int) -> None:
    logger.info(
        "Push: подтверждение оплаты бронирования id=%s для user_id=%s",
        booking_id,
        user_id,
    )
