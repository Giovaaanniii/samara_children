from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from booking_period import aware_utc, booking_created_at_window
from database import get_db
from models import Booking, BookingStatus, Event, Schedule, User
from schemas import AdminReportsResponse, PopularEventPoint, SalesSummaryResponse

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/admin/summary", response_model=AdminReportsResponse)
async def admin_reports_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    date_from: Annotated[
        datetime | None,
        Query(description="Начало периода по дате создания бронирования (включительно)"),
    ] = None,
    date_to: Annotated[
        datetime | None,
        Query(description="Конец периода по дате создания бронирования (включительно)"),
    ] = None,
) -> AdminReportsResponse:
    if date_from is not None and date_to is not None:
        if aware_utc(date_from) > aware_utc(date_to):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_from не может быть позже date_to",
            )

    window = booking_created_at_window(date_from, date_to)
    paid_statuses = (BookingStatus.confirmed, BookingStatus.completed)
    paid_filter = Booking.status.in_(paid_statuses)

    bt_q = select(func.count()).select_from(Booking)
    pb_q = select(func.count()).select_from(Booking).where(paid_filter)
    rev_q = select(func.coalesce(func.sum(Booking.total_price), Decimal("0"))).where(
        paid_filter,
    )
    if window is not None:
        bt_q = bt_q.where(window)
        pb_q = pb_q.where(window)
        rev_q = rev_q.where(window)

    bookings_total = await db.scalar(bt_q)
    paid_bookings = await db.scalar(pb_q)
    revenue_total = await db.scalar(rev_q)

    popular_base = (
        select(
            Event.id,
            Event.title,
            func.count(Booking.id).label("bookings_count"),
            func.coalesce(func.sum(Booking.participants_count), 0).label(
                "participants_count",
            ),
            func.coalesce(func.sum(Booking.total_price), Decimal("0")).label("revenue"),
        )
        .join(Schedule, Schedule.event_id == Event.id)
        .join(Booking, Booking.schedule_id == Schedule.id)
        .where(Booking.status.in_(paid_statuses))
    )
    if window is not None:
        popular_base = popular_base.where(window)

    popular_q = await db.execute(
        popular_base.group_by(Event.id, Event.title)
        .order_by(func.count(Booking.id).desc(), Event.title.asc())
        .limit(10),
    )

    popular = [
        PopularEventPoint(
            event_id=int(event_id),
            event_title=event_title,
            bookings_count=int(bookings_count or 0),
            participants_count=int(participants_count or 0),
            revenue=Decimal(revenue or 0),
        )
        for event_id, event_title, bookings_count, participants_count, revenue in popular_q.all()
    ]

    pf = aware_utc(date_from) if date_from is not None else None
    pt = aware_utc(date_to) if date_to is not None else None

    return AdminReportsResponse(
        sales=SalesSummaryResponse(
            bookings_total=int(bookings_total or 0),
            paid_bookings=int(paid_bookings or 0),
            revenue_total=Decimal(revenue_total or 0),
            period_from=pf,
            period_to=pt,
        ),
        popular_events=popular,
    )
