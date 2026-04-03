"""
Демо-мероприятия для локальной разработки и тестов фильтров/поиска.

Запуск из каталога backend (или из корня проекта с PYTHONPATH):
  cd backend && python seed_demo.py

В Docker вызывается автоматически после alembic, если таблица events пуста.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select

from database import async_session_maker
from models import Event, EventCategory, EventStatus, Schedule, ScheduleStatus


async def seed_if_empty() -> None:
    async with async_session_maker() as session:
        n = await session.scalar(select(func.count()).select_from(Event))
        if n and n > 0:
            print("seed_demo: в БД уже есть мероприятия — пропуск.")
            return

        now = datetime.now(timezone.utc)
        # Сеансы в ближайшие недели (UTC), чтобы фильтры по датам находили события
        def slot(day_offset: int, hour: int = 10) -> tuple[datetime, datetime]:
            start = (now + timedelta(days=day_offset)).replace(
                hour=hour, minute=0, second=0, microsecond=0
            )
            end = start + timedelta(hours=2)
            return start, end

        demos: list[tuple[Event, list[tuple[datetime, datetime, int]]]] = [
            (
                Event(
                    title="Экскурсия «Струковский сад и история парка»",
                    description="Прогулка с гидом по главной зелёной зоне города: история, природа, ориентиры для детей.",
                    category=EventCategory.excursion,
                    target_audience="6–12 лет, школьные группы",
                    duration_minutes=90,
                    max_participants=25,
                    base_price=Decimal("450.00"),
                    status=EventStatus.active,
                    meeting_point="Вход в Струковский сад, главная аллея",
                ),
                [
                    (*slot(3, 11), 20),
                    (*slot(10, 10), 18),
                ],
            ),
            (
                Event(
                    title="Квест «Тайны самарского подземелья — легенды центра»",
                    description="Интерактивное задание по маршруту: загадки, команды, призы за прохождение.",
                    category=EventCategory.quest,
                    target_audience="8–14 лет",
                    duration_minutes=120,
                    max_participants=30,
                    base_price=Decimal("800.00"),
                    status=EventStatus.active,
                    meeting_point="Площадь у театра, сбор группы",
                ),
                [(*slot(5, 12), 25), (*slot(12, 12), 22)],
            ),
            (
                Event(
                    title="Мастер-класс «Гончарный круг — первое изделие»",
                    description="Знакомство с глиной, техника безопасности, каждый уносит сувенир.",
                    category=EventCategory.workshop,
                    target_audience="семьи с детьми 7+, дети 10–16 лет",
                    duration_minutes=150,
                    max_participants=12,
                    base_price=Decimal("1200.00"),
                    status=EventStatus.active,
                    meeting_point="Студия на набережной (адрес уточняется при брони)",
                ),
                [(*slot(7, 14), 10), (*slot(14, 14), 10)],
            ),
            (
                Event(
                    title="Музейная экскурсия «От каменного века до XX века»",
                    description="Краткий обзор экспозиции с фокусом на интерактив для школьников.",
                    category=EventCategory.excursion,
                    target_audience="10–16 лет",
                    duration_minutes=60,
                    max_participants=20,
                    base_price=Decimal("350.00"),
                    status=EventStatus.active,
                    meeting_point="Касса регионального музея",
                ),
                [(*slot(2, 10), 20)],
            ),
            (
                Event(
                    title="Квест в парке «Найди символ города»",
                    description="Лёгкий маршрут на 1–1,5 часа, фото-чекпоинты, призы детям.",
                    category=EventCategory.quest,
                    target_audience="6–10 лет с родителями",
                    duration_minutes=90,
                    max_participants=40,
                    base_price=Decimal("500.00"),
                    status=EventStatus.active,
                    meeting_point="Парк Победы, центральный вход",
                ),
                [(*slot(4, 9), 35), (*slot(18, 9), 35)],
            ),
            (
                Event(
                    title="Мастер-класс «Акварельный пейзаж»",
                    description="Рисуем панораму Волги под руководством художника.",
                    category=EventCategory.workshop,
                    target_audience="5–12 лет",
                    duration_minutes=90,
                    max_participants=15,
                    base_price=Decimal("650.00"),
                    status=EventStatus.active,
                    meeting_point="Арт-студия «Палитра», 2 этаж",
                ),
                [(*slot(6, 15), 12), (*slot(13, 15), 12)],
            ),
        ]

        for ev, slots in demos:
            session.add(ev)
            await session.flush()
            for start, end, places in slots:
                session.add(
                    Schedule(
                        event_id=ev.id,
                        start_datetime=start,
                        end_datetime=end,
                        available_slots=places,
                        status=ScheduleStatus.open,
                        guide_id=None,
                    ),
                )

        await session.commit()
        print(f"seed_demo: добавлено мероприятий: {len(demos)}.")


def main() -> None:
    asyncio.run(seed_if_empty())


if __name__ == "__main__":
    main()
