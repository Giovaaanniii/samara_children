from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from auth import create_access_token, hash_password
from models import (
    Booking,
    BookingStatus,
    Event,
    EventCategory,
    EventStatus,
    Schedule,
    ScheduleStatus,
    User,
    UserRole,
)


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


async def _create_completed_booking(db_session, *, user_id: int):
    event = Event(
        title="Событие для отзыва",
        category=EventCategory.workshop,
        base_price=Decimal("1200.00"),
        status=EventStatus.active,
    )
    db_session.add(event)
    await db_session.flush()

    end = datetime.now(timezone.utc) - timedelta(hours=1)
    schedule = Schedule(
        event_id=event.id,
        start_datetime=end - timedelta(hours=2),
        end_datetime=end,
        available_slots=10,
        status=ScheduleStatus.open,
    )
    db_session.add(schedule)
    await db_session.flush()

    booking = Booking(
        user_id=user_id,
        schedule_id=schedule.id,
        status=BookingStatus.confirmed,
        participants_count=1,
        total_price=Decimal("1200.00"),
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(event)
    await db_session.refresh(booking)
    return event, booking


@pytest.mark.asyncio
async def test_review_can_be_left_only_by_booking_owner(client, db_session):
    owner = await _create_user(
        db_session,
        login="review_owner",
        email="review_owner@example.com",
    )
    stranger = await _create_user(
        db_session,
        login="review_stranger",
        email="review_stranger@example.com",
    )
    event, booking = await _create_completed_booking(db_session, user_id=owner.id)

    stranger_token = create_access_token({"sub": str(stranger.id)}, timedelta(minutes=30))
    owner_token = create_access_token({"sub": str(owner.id)}, timedelta(minutes=30))

    payload = {
        "event_id": event.id,
        "booking_id": booking.id,
        "guide_rating": 5,
        "engagement_rating": 4,
        "organization_rating": 5,
        "comment": "Было отлично",
    }

    forbidden = await client.post(
        "/api/v1/reviews",
        json=payload,
        headers=_auth_headers(stranger_token),
    )
    assert forbidden.status_code == 403

    created = await client.post(
        "/api/v1/reviews",
        json=payload,
        headers=_auth_headers(owner_token),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["booking_id"] == booking.id
    assert body["event_id"] == event.id

