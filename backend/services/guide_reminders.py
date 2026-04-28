"""Периодические напоминания гидом о предстоящих сеансах."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from services.email_service import send_email

logger = logging.getLogger(__name__)


async def dispatch_guide_schedule_reminders(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    windows = [
        ("24h", now + timedelta(hours=24), timedelta(minutes=5)),
        ("1h", now + timedelta(hours=1), timedelta(minutes=5)),
    ]
    for reminder_type, target_dt, delta in windows:
        from_dt = target_dt - delta
        to_dt = target_dt + delta
        rows = (
            await db.execute(
                text(
                    """
                    SELECT s.id AS schedule_id,
                           s.start_datetime AS start_datetime,
                           g.id AS guide_id,
                           u.id AS guide_user_id,
                           u.email AS guide_email
                    FROM schedules s
                    JOIN guides g ON g.id = s.guide_id
                    JOIN users u ON u.guide_id = g.id
                    LEFT JOIN guide_schedule_reminders r
                      ON r.schedule_id = s.id
                     AND r.guide_user_id = u.id
                     AND r.reminder_type = :rtype
                    WHERE s.start_datetime >= :from_dt
                      AND s.start_datetime <= :to_dt
                      AND u.is_active = TRUE
                      AND r.id IS NULL
                    """,
                ),
                {
                    "rtype": reminder_type,
                    "from_dt": from_dt,
                    "to_dt": to_dt,
                },
            )
        ).mappings().all()

        for row in rows:
            schedule_id = int(row["schedule_id"])
            user_id = int(row["guide_user_id"])
            start_dt = row["start_datetime"]
            title = "Напоминание о сеансе"
            body = f"Через {'24 часа' if reminder_type == '24h' else '1 час'} начинается сеанс #{schedule_id} ({start_dt})."
            try:
                if row.get("guide_email"):
                    await send_email(str(row["guide_email"]), title, f"<p>{body}</p>")
            except Exception:
                logger.exception(
                    "Не удалось отправить напоминание %s гиду user_id=%s, schedule_id=%s",
                    reminder_type,
                    user_id,
                    schedule_id,
                )
                continue

            await db.execute(
                text(
                    """
                    INSERT INTO guide_schedule_reminders(schedule_id, guide_user_id, reminder_type)
                    VALUES (:schedule_id, :guide_user_id, :reminder_type)
                    ON CONFLICT (schedule_id, guide_user_id, reminder_type) DO NOTHING
                    """,
                ),
                {
                    "schedule_id": schedule_id,
                    "guide_user_id": user_id,
                    "reminder_type": reminder_type,
                },
            )
        if rows:
            await db.commit()

