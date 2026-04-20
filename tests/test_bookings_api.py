from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from auth import create_access_token, hash_password
from models import Event, EventCategory, EventStatus, Schedule, ScheduleStatus, User, UserRole
from routers import bookings as bookings_router


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_user(db_session, *, login: str, email: str) -> User:
    user = User(
        login=login,
        email=email,
        password_hash=hash_password("StrongPass123"),
        role=UserRole.client,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_event_and_schedule(db_session, *, slots: int = 3):
    event = Event(
        title="Тестовое мероприятие",
        category=EventCategory.excursion,
        base_price=Decimal("1000.00"),
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.flush()

    start = datetime.now(timezone.utc) + timedelta(days=1)
    schedule = Schedule(
        event_id=event.id,
        start_datetime=start,
        end_datetime=start + timedelta(hours=2),
        available_slots=slots,
        status=ScheduleStatus.open,
    )
    db_session.add(schedule)
    await db_session.commit()
    await db_session.refresh(event)
    await db_session.refresh(schedule)
    return event, schedule


@pytest.mark.asyncio
async def test_booking_reserves_slots_and_uses_payment_mock(client, db_session, monkeypatch):
    user_1 = await _create_user(
        db_session,
        login="booker1",
        email="booker1@example.com",
    )
    user_2 = await _create_user(
        db_session,
        login="booker2",
        email="booker2@example.com",
    )
    _, schedule = await _create_event_and_schedule(db_session, slots=3)

    payment_calls: list[int] = []

    async def fake_create_payment(booking_id: int, amount, description: str, return_url: str):
        payment_calls.append(booking_id)
        return "https://pay.test/mock", f"mock-{booking_id}"

    monkeypatch.setattr(bookings_router, "create_payment", fake_create_payment)

    token_1 = create_access_token({"sub": str(user_1.id)}, timedelta(minutes=30))
    token_2 = create_access_token({"sub": str(user_2.id)}, timedelta(minutes=30))

    payload = {
        "schedule_id": schedule.id,
        "participants_count": 2,
        "participants": [
            {"first_name": "Ivan", "last_name": "Ivanov", "is_child": True},
            {"first_name": "Petr", "last_name": "Petrov", "is_child": True},
        ],
    }
    first = await client.post(
        "/api/v1/bookings",
        json=payload,
        headers=_auth_headers(token_1),
    )
    assert first.status_code == 201
    first_body = first.json()
    assert first_body["payment_url"] == "https://pay.test/mock"
    assert first_body["payment_id"].startswith("mock-")
    assert payment_calls, "Платёжный провайдер должен быть вызван"

    second = await client.post(
        "/api/v1/bookings",
        json=payload,
        headers=_auth_headers(token_2),
    )
    assert second.status_code == 400
    assert "недостаточно свободных мест" in second.json()["detail"].lower()

