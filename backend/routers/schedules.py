from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from database import get_db
from models import Booking, Event, Guide, Schedule, User
from schemas import (
    ScheduleBookingInfoResponse,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
)
from services.schedule_notifications import notify_booking_users_schedule_changed

router = APIRouter(prefix="/schedules", tags=["schedules"])


async def _guide_schedule_overlaps(
    db: AsyncSession,
    guide_id: int,
    start: datetime,
    end: datetime,
    exclude_schedule_id: int | None = None,
) -> bool:
    q = select(Schedule.id).where(
        Schedule.guide_id == guide_id,
        Schedule.start_datetime < end,
        Schedule.end_datetime > start,
    )
    if exclude_schedule_id is not None:
        q = q.where(Schedule.id != exclude_schedule_id)
    r = await db.execute(q.limit(1))
    return r.scalar_one_or_none() is not None


async def _count_bookings(db: AsyncSession, schedule_id: int) -> int:
    cnt = await db.scalar(
        select(func.count()).select_from(Booking).where(Booking.schedule_id == schedule_id),
    )
    return int(cnt or 0)


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    db: Annotated[AsyncSession, Depends(get_db)],
    event_id: int | None = Query(None, ge=1, description="Фильтр по мероприятию"),
    on_date: date | None = Query(
        None,
        description="День (UTC): сеансы, пересекающиеся с этими сутками",
    ),
) -> list[Schedule]:
    stmt = select(Schedule).order_by(Schedule.start_datetime)
    if event_id is not None:
        stmt = stmt.where(Schedule.event_id == event_id)
    if on_date is not None:
        day_start = datetime.combine(on_date, time.min, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        stmt = stmt.where(
            Schedule.start_datetime < day_end,
            Schedule.end_datetime > day_start,
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{schedule_id}", response_model=ScheduleBookingInfoResponse)
async def get_schedule_for_booking(
    schedule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ScheduleBookingInfoResponse:
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сеанс не найден",
        )
    event = await db.get(Event, schedule.event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )
    return ScheduleBookingInfoResponse(
        id=schedule.id,
        event_id=schedule.event_id,
        event_title=event.title,
        base_price=event.base_price,
        start_datetime=schedule.start_datetime,
        end_datetime=schedule.end_datetime,
        available_slots=schedule.available_slots,
        status=schedule.status,
    )


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Schedule:
    ev = await db.get(Event, data.event_id)
    if ev is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )
    if data.guide_id is not None:
        gd = await db.get(Guide, data.guide_id)
        if gd is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Гид не найден",
            )
        if await _guide_schedule_overlaps(
            db,
            data.guide_id,
            data.start_datetime,
            data.end_datetime,
            None,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У гида уже есть пересекающийся сеанс в это время",
            )

    schedule = Schedule(
        event_id=data.event_id,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        available_slots=data.available_slots,
        status=data.status,
        guide_id=data.guide_id,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Schedule:
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сеанс не найден",
        )

    payload = data.model_dump(exclude_unset=True)
    if not payload:
        return schedule

    old_start = schedule.start_datetime
    old_end = schedule.end_datetime
    old_slots = schedule.available_slots
    old_status = schedule.status
    old_guide = schedule.guide_id

    new_start = payload.get("start_datetime", schedule.start_datetime)
    new_end = payload.get("end_datetime", schedule.end_datetime)
    if new_end <= new_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_datetime должно быть позже start_datetime",
        )

    new_guide_id = payload["guide_id"] if "guide_id" in payload else schedule.guide_id
    if new_guide_id is not None:
        gd = await db.get(Guide, new_guide_id)
        if gd is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Гид не найден",
            )
        if await _guide_schedule_overlaps(
            db,
            new_guide_id,
            new_start,
            new_end,
            schedule_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У гида уже есть пересекающийся сеанс в это время",
            )

    for key, val in payload.items():
        setattr(schedule, key, val)

    await db.commit()
    await db.refresh(schedule)

    relevant_change = (
        schedule.start_datetime != old_start
        or schedule.end_datetime != old_end
        or schedule.available_slots != old_slots
        or schedule.status != old_status
        or schedule.guide_id != old_guide
    )
    if relevant_change and await _count_bookings(db, schedule_id) > 0:
        await notify_booking_users_schedule_changed(db, schedule)

    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сеанс не найден",
        )
    if await _count_bookings(db, schedule_id) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить сеанс с существующими бронированиями",
        )
    await db.execute(delete(Schedule).where(Schedule.id == schedule_id))
    await db.commit()
