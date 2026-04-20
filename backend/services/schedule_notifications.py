"""Уведомления клиентов об изменении сеанса (email через SendGrid)."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Booking, BookingStatus, Event, Schedule, User
from services.email_service import send_email, send_schedule_change_email
from services.notification_service import send_push_notification

logger = logging.getLogger(__name__)


def _format_start(schedule: Schedule) -> str:
    dt: datetime = schedule.start_datetime
    return dt.strftime("%d.%m.%Y %H:%M")


async def notify_booking_users_schedule_changed(
    db: AsyncSession,
    schedule: Schedule,
) -> None:
    event = await db.get(Event, schedule.event_id)
    event_title = event.title if event else "Мероприятие"
    change_description = (
        f"Обновлено расписание сеанса.\n"
        f"Новое время начала: {_format_start(schedule)}"
    )

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
            "Изменение сеанса id=%s: уведомление пользователю id=%s booking_id=%s",
            schedule.id,
            user.id,
            booking.id,
        )
        if not user.email:
            continue
        try:
            await send_schedule_change_email(
                user.email,
                booking.id,
                event_title=event_title,
                change_description=change_description,
                is_cancellation=False,
            )
        except Exception:
            logger.exception(
                "Не удалось отправить письмо об изменении сеанса booking_id=%s",
                booking.id,
            )


async def notify_guide_schedule_changed(
    db: AsyncSession,
    schedule: Schedule,
) -> None:
    """Уведомляет назначенного гида об изменениях расписания сеанса."""
    if schedule.guide_id is None:
        return
    guide_user = (
        await db.execute(
            select(User).where(User.guide_id == schedule.guide_id, User.is_active.is_(True)),
        )
    ).scalar_one_or_none()
    if guide_user is None:
        return

    start_str = _format_start(schedule)
    body = f"В расписании вашего сеанса #{schedule.id} есть изменения. Новое время: {start_str}."
    try:
        await send_push_notification(
            guide_user.id,
            title="Изменение расписания",
            body=body,
            data={"type": "guide_schedule_changed", "schedule_id": schedule.id},
        )
    except Exception:
        logger.exception("Не удалось отправить push-уведомление гиду user_id=%s", guide_user.id)

    if guide_user.email:
        try:
            await send_email(
                guide_user.email,
                "Изменение расписания вашего сеанса",
                f"<p>{body}</p>",
            )
        except Exception:
            logger.exception("Не удалось отправить email гиду user_id=%s", guide_user.id)
