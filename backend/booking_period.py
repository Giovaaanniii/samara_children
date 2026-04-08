"""Фильтрация бронирований по дате создания (created_at)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_

from models import Booking


def aware_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def booking_created_at_window(
    date_from: datetime | None,
    date_to: datetime | None,
):
    parts = []
    if date_from is not None:
        parts.append(Booking.created_at >= aware_utc(date_from))
    if date_to is not None:
        parts.append(Booking.created_at <= aware_utc(date_to))
    if not parts:
        return None
    return and_(*parts) if len(parts) > 1 else parts[0]
