from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_admin
from database import get_db
from models import Event, EventCategory, EventStatus, User
from schemas import (
    EventCreate,
    EventDetailResponse,
    EventListResponse,
    EventResponse,
    EventUpdate,
    ReviewResponse,
    ScheduleResponse,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=EventListResponse)
async def list_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: EventCategory | None = Query(None, description="Категория"),
    target_audience: str | None = Query(
        None,
        description="Фильтр по целевой аудитории / возрасту (подстрока)",
    ),
    event_status: EventStatus | None = Query(
        None,
        alias="status",
        description="Статус мероприятия",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> EventListResponse:
    filters = []
    if category is not None:
        filters.append(Event.category == category)
    if target_audience:
        filters.append(Event.target_audience.ilike(f"%{target_audience}%"))
    if event_status is not None:
        filters.append(Event.status == event_status)

    base = select(Event)
    count_stmt = select(func.count()).select_from(Event)
    for f in filters:
        base = base.where(f)
        count_stmt = count_stmt.where(f)

    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one())

    result = await db.execute(
        base.order_by(Event.id.desc()).offset(skip).limit(limit),
    )
    items = [EventResponse.model_validate(row) for row in result.scalars().all()]

    return EventListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{event_id}", response_model=EventDetailResponse)
async def get_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetailResponse:
    stmt = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.schedules),
            selectinload(Event.reviews),
        )
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )

    schedules = sorted(event.schedules, key=lambda s: s.start_datetime)
    published = [r for r in event.reviews if r.is_published]

    base = EventResponse.model_validate(event)
    return EventDetailResponse(
        **base.model_dump(mode="python"),
        schedules=[ScheduleResponse.model_validate(s) for s in schedules],
        reviews=[ReviewResponse.model_validate(r) for r in published],
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Event:
    event = Event(
        title=data.title,
        description=data.description,
        category=data.category,
        target_audience=data.target_audience,
        duration_minutes=data.duration_minutes,
        max_participants=data.max_participants,
        base_price=data.base_price,
        status=data.status,
        meeting_point=data.meeting_point,
        cover_image_url=data.cover_image_url,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    data: EventUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Event:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(event, key, val)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )
    await db.execute(delete(Event).where(Event.id == event_id))
    await db.commit()
