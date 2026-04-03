"""Уведомления клиентов об изменении сеанса (заглушка: логирование; позже — email, push)."""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Booking, BookingStatus, Schedule, User

logger = logging.getLogger(__name__)


async def notify_booking_users_schedule_changed(
    db: AsyncSession,
    schedule: Schedule,
) -> None:
    result = await db.execute(
        select(Booking, User)
        .join(User, Booking.user_id == User.id)
        .where(
            Booking.schedule_id == schedule.id,
            Booking.status != BookingStatus.cancelled,
        ),
    )
    for booking, user in result.all():
        logger.info(
            "Изменение сеанса id=%s: уведомление пользователю id=%s email=%s, booking_id=%s",
            schedule.id,
            user.id,
            user.email,
            booking.id,
        )
