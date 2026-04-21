from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from booking_period import aware_utc, booking_created_at_window
from database import get_db
from models import Booking, BookingStatus, Event, Guide, Schedule, ScheduleStatus, User
from schemas import (
    AdminCalendarDayItem,
    AdminCalendarResponse,
    AdminGuideRefusalItem,
    AdminReportsResponse,
    PopularEventPoint,
    SalesSummaryResponse,
)

router = APIRouter(prefix="/reports", tags=["Отчёты"])


@router.get(
    "/admin/summary",
    response_model=AdminReportsResponse,
    summary="Сводный отчёт (админ)",
    description="Возвращает агрегированные показатели продаж и топ мероприятий за выбранный период.",
)
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


@router.get(
    "/admin/calendar",
    response_model=AdminCalendarResponse,
    summary="Календарь броней (админ)",
    description=(
        "Дни месяца, где есть хотя бы одна подтверждённая бронь по сеансу, "
        "который ещё не завершён и не отменён."
    ),
)
async def admin_calendar(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    year: Annotated[int, Query(ge=2000, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> AdminCalendarResponse:
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    day_col = cast(Schedule.start_datetime, Date)
    stmt = (
        select(day_col.label("day"), Booking.id)
        .select_from(Schedule)
        .join(Booking, Booking.schedule_id == Schedule.id)
        .where(
            Booking.status == BookingStatus.confirmed,
            Schedule.status.notin_((ScheduleStatus.completed, ScheduleStatus.cancelled)),
            Schedule.start_datetime >= month_start,
            Schedule.start_datetime < month_end,
        )
        .order_by(day_col, Booking.id)
    )
    rows = (await db.execute(stmt)).all()
    by_day: dict[object, list[int]] = defaultdict(list)
    for d, bid in rows:
        if d is not None:
            by_day[d].append(int(bid))
    days = [
        AdminCalendarDayItem(
            date=d,
            confirmed_booking_count=len(ids),
            booking_ids=ids,
        )
        for d, ids in sorted(by_day.items(), key=lambda x: x[0])
    ]
    return AdminCalendarResponse(year=year, month=month, days=days)


@router.get(
    "/admin/guide-refusals",
    response_model=list[AdminGuideRefusalItem],
    summary="Отказы гидов от сеансов (админ)",
    description="Сеансы, по которым зафиксирован отказ гида (для контроля в ЛК).",
)
async def admin_guide_refusals(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[AdminGuideRefusalItem]:
    stmt = (
        select(Schedule, Event.title, Guide.first_name, Guide.last_name)
        .join(Event, Event.id == Schedule.event_id)
        .outerjoin(Guide, Guide.id == Schedule.rejected_by_guide_id)
        .where(Schedule.guide_rejected_at.isnot(None))
        .order_by(Schedule.guide_rejected_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    out: list[AdminGuideRefusalItem] = []
    for sch, event_title, g_fn, g_ln in result.all():
        gid = sch.rejected_by_guide_id
        if g_fn and g_ln:
            gname = f"{g_ln} {g_fn}"
        elif g_fn or g_ln:
            gname = f"{g_ln or ''} {g_fn or ''}".strip()
        else:
            gname = "—"
        assert sch.guide_rejected_at is not None
        out.append(
            AdminGuideRefusalItem(
                schedule_id=sch.id,
                event_id=sch.event_id,
                event_title=event_title or "",
                start_datetime=sch.start_datetime,
                rejected_at=sch.guide_rejected_at,
                reject_reason=(sch.guide_reject_reason or "").strip() or "—",
                guide_id=gid,
                guide_name=gname or "—",
            )
        )
    return out


@router.delete(
    "/admin/guide-refusals/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить запись отказа гида (админ)",
    description=(
        "Удаляет запись из журнала отказов по конкретному сеансу "
        "(сбрасывает поля guide_rejected_at/guide_reject_reason/rejected_by_guide_id)."
    ),
)
async def delete_guide_refusal(
    schedule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    if schedule.guide_rejected_at is None:
        raise HTTPException(status_code=404, detail="Запись отказа не найдена")

    schedule.guide_rejected_at = None
    schedule.guide_reject_reason = None
    schedule.rejected_by_guide_id = None
    await db.commit()
