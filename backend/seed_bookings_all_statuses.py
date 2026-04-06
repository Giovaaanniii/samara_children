"""
Тестовые бронирования со всеми статусами для одного пользователя (по email).

Запуск из каталога backend (нужен .env с DATABASE_URL):
  cd backend && python seed_bookings_all_statuses.py
  python seed_bookings_all_statuses.py --email muervos@mail.ru

Если БД в Docker, удобнее выполнить сид внутри контейнера backend (там host=db):
  docker compose exec backend sh -c "cd /srv/backend && python seed_bookings_all_statuses.py"

Повторный запуск удаляет старые строки с пометкой customer_notes LIKE '[тест статусы]%' и создаёт заново.
Требуются в БД хотя бы 5 открытых сеансов (после seed_demo.py).
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import urlparse

from sqlalchemy import delete, select
from sqlalchemy.exc import OperationalError

from config import settings
from database import async_session_maker
from models import (
    Booking,
    BookingStatus,
    Event,
    Participant,
    PaymentMethod,
    Schedule,
    ScheduleStatus,
    Transaction,
    TransactionStatus,
    User,
)

TEST_MARKER = "[тест статусы]"


def _db_host_hint() -> str:
    try:
        u = urlparse(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1))
        host = u.hostname or "?"
        port = u.port or 5432
        db = (u.path or "").lstrip("/") or "?"
        return f"{host}:{port} / {db}"
    except Exception:
        return "(не удалось разобрать DATABASE_URL)"


def _print_connection_help() -> None:
    print(
        "\nНе удалось подключиться к PostgreSQL.\n"
        f"В .env сейчас указано подключение к: {_db_host_hint()}\n\n"
        "Что сделать:\n"
        "  • Запустите БД: из папки samara выполните  docker compose up -d db\n"
        "  • Убедитесь, что порт 5432 проброшен и Postgres слушает (для Docker Desktop обычно localhost:5432).\n"
        "  • Либо запустите сид внутри контейнера backend (там хост БД — db, не localhost):\n"
        '    docker compose exec backend sh -c "cd /srv/backend && python seed_bookings_all_statuses.py"\n',
        file=sys.stderr,
    )


async def run(email: str) -> None:
    async with async_session_maker() as session:
        user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if user is None:
            print(f"Пользователь с email {email!r} не найден. Сначала зарегистрируйтесь.")
            return

        await session.execute(
            delete(Booking).where(Booking.customer_notes.like(f"{TEST_MARKER}%")),
        )
        await session.commit()

    async with async_session_maker() as session:
        schedules = (
            (
                await session.execute(
                    select(Schedule)
                    .where(Schedule.status == ScheduleStatus.open)
                    .order_by(Schedule.id)
                    .limit(10),
                )
            )
            .scalars()
            .all()
        )
        if len(schedules) < 5:
            print(
                f"Нужно минимум 5 открытых сеансов в БД, сейчас: {len(schedules)}. "
                "Запустите seed_demo или добавьте мероприятия.",
            )
            return

        now = datetime.now(timezone.utc)
        cases: list[tuple[BookingStatus, str, datetime | None]] = [
            (BookingStatus.pending, f"{TEST_MARKER} pending", None),
            (BookingStatus.confirmed, f"{TEST_MARKER} confirmed", now),
            (BookingStatus.cancelled, f"{TEST_MARKER} cancelled", None),
            (BookingStatus.completed, f"{TEST_MARKER} completed", now),
        ]

        for i, (st, note, confirmed_at) in enumerate(cases):
            sch = schedules[i]
            ev = await session.get(Event, sch.event_id)
            if ev is None:
                print(f"Нет события для сеанса {sch.id}")
                continue
            unit = ev.base_price or Decimal("0")
            n = 1
            total = Decimal(n) * unit

            booking = Booking(
                user_id=user.id,
                schedule_id=sch.id,
                status=st,
                participants_count=n,
                total_price=total,
                customer_notes=note,
                confirmed_at=confirmed_at,
            )
            session.add(booking)
            await session.flush()

            session.add(
                Participant(
                    booking_id=booking.id,
                    first_name="Тест",
                    last_name=f"Статус-{st.value}",
                    patronymic=None,
                    age=10,
                    is_child=True,
                    special_notes=None,
                ),
            )

            if st in (BookingStatus.confirmed, BookingStatus.completed):
                session.add(
                    Transaction(
                        booking_id=booking.id,
                        payment_method=PaymentMethod.card_online,
                        amount=total,
                        status=TransactionStatus.completed,
                        external_id=f"demo-seed-{booking.id}",
                        completed_at=now,
                    ),
                )

        await session.commit()
        print(
            f"Готово: для {email!r} созданы бронирования "
            f"(pending, confirmed, cancelled, completed).",
        )


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--email",
        default="muervos@mail.ru",
        help="Email пользователя в БД",
    )
    args = p.parse_args()
    try:
        asyncio.run(run(args.email.strip()))
    except (ConnectionRefusedError, TimeoutError, OSError, OperationalError) as e:
        print(f"Ошибка подключения к БД: {e}", file=sys.stderr)
        _print_connection_help()
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()
