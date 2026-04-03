"""Email и push: обёртки над каналами доставки."""

from __future__ import annotations

import logging
from datetime import datetime

from services.email_service import send_booking_confirmation_email
from services.notification_service import send_push_notification

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
    await send_push_notification(
        user_id,
        title="Бронирование подтверждено",
        body=f"Оплата прошла успешно. Бронирование №{booking_id}.",
        data={
            "type": "payment_confirmed",
            "booking_id": str(booking_id),
        },
    )
