from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_admin
from database import get_db
from models import (
    Event,
    EventCategory,
    EventStatus,
    Review,
    Schedule,
    ScheduleStatus,
    SettingDataType,
    Settings,
    User,
)
from schemas import (
    EventCreate,
    EventDetailResponse,
    EventListResponse,
    PopularEventsSelectionUpdate,
    EventResponse,
    EventUpdate,
    ScheduleResponse,
    review_to_response,
)

router = APIRouter(prefix="/events", tags=["Мероприятия"])
POPULAR_NOW_SETTING = "home_popular_event_ids"
POPULAR_NOW_LIMIT = 6


def _parse_popular_ids(raw: str | None) -> list[int]:
    if not raw:
        return []
    out: list[int] = []
    for chunk in raw.split(","):
        s = chunk.strip()
        if not s:
            continue
        try:
            n = int(s)
        except ValueError:
            continue
        if n > 0 and n not in out:
            out.append(n)
    return out[:POPULAR_NOW_LIMIT]


async def _load_popular_events(db: AsyncSession) -> list[Event]:
    row = (
        await db.execute(
            select(Settings).where(Settings.param_name == POPULAR_NOW_SETTING),
        )
    ).scalar_one_or_none()
    ids = _parse_popular_ids(row.param_value if row else None)
    if not ids:
        fallback = await db.execute(
            select(Event)
            .where(Event.status == EventStatus.active)
            .order_by(Event.id.desc())
            .limit(POPULAR_NOW_LIMIT),
        )
        return list(fallback.scalars().all())

    events = (
        await db.execute(
            select(Event).where(Event.id.in_(ids), Event.status == EventStatus.active),
        )
    ).scalars().all()
    by_id = {ev.id: ev for ev in events}
    return [by_id[eid] for eid in ids if eid in by_id][:POPULAR_NOW_LIMIT]

@router.get(
    "",
    response_model=EventListResponse,
    summary="Список мероприятий",
    description="Возвращает список мероприятий с фильтрами по категории, статусу, датам и поисковой строке.",
)
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
    q: str | None = Query(
        None,
        description="Поиск по подстроке в названии мероприятия",
    ),
    date_from: date | None = Query(
        None,
        description="Есть сеанс не раньше этой даты (UTC)",
    ),
    date_to: date | None = Query(
        None,
        description="Есть сеанс не позже этой даты (UTC)",
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
    if q:
        filters.append(Event.title.ilike(f"%{q}%"))

    base = select(Event)
    count_stmt = select(func.count()).select_from(Event)
    for f in filters:
        base = base.where(f)
        count_stmt = count_stmt.where(f)

    if date_from is not None or date_to is not None:
        sch_parts = [Schedule.event_id == Event.id]
        if date_from is not None:
            start_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
            sch_parts.append(Schedule.start_datetime >= start_dt)
        if date_to is not None:
            end_dt = datetime.combine(
                date_to,
                time(23, 59, 59, 999999),
                tzinfo=timezone.utc,
            )
            sch_parts.append(Schedule.start_datetime <= end_dt)
        has_schedule = exists().where(and_(*sch_parts))
        base = base.where(has_schedule)
        count_stmt = count_stmt.where(has_schedule)

    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one())

    result = await db.execute(
        base.order_by(Event.id.desc()).offset(skip).limit(limit),
    )
    items = [EventResponse.model_validate(row) for row in result.scalars().all()]

    return EventListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get(
    "/popular-now",
    response_model=list[EventResponse],
    summary="Популярные сейчас (главная)",
    description="Возвращает выбранные админом мероприятия для блока на главной странице (до 6).",
)
async def get_popular_now(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[EventResponse]:
    return [EventResponse.model_validate(ev) for ev in await _load_popular_events(db)]


@router.put(
    "/admin/popular-now",
    response_model=list[EventResponse],
    summary="Настроить популярные сейчас (админ)",
    description="Сохраняет до 6 существующих id мероприятий для блока на главной.",
)
async def set_popular_now(
    data: PopularEventsSelectionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> list[EventResponse]:
    ids = []
    for eid in data.event_ids:
        if eid > 0 and eid not in ids:
            ids.append(eid)
    ids = ids[:POPULAR_NOW_LIMIT]
    if ids:
        existing_ids = set(
            (
                await db.execute(
                    select(Event.id).where(Event.id.in_(ids)),
                )
            ).scalars().all(),
        )
        ids = [eid for eid in ids if eid in existing_ids]

    row = (
        await db.execute(
            select(Settings).where(Settings.param_name == POPULAR_NOW_SETTING),
        )
    ).scalar_one_or_none()
    value = ",".join(str(x) for x in ids)
    if row is None:
        row = Settings(
            param_name=POPULAR_NOW_SETTING,
            param_value=value,
            data_type=SettingDataType.string,
            description="Ручная подборка мероприятий для блока 'Популярные сейчас' (id через запятую)",
        )
        db.add(row)
    else:
        row.param_value = value
    await db.commit()
    return [EventResponse.model_validate(ev) for ev in await _load_popular_events(db)]


@router.get(
    "/{event_id}",
    response_model=EventDetailResponse,
    summary="Карточка мероприятия",
    description="Возвращает детальную информацию о мероприятии, расписание и опубликованные отзывы.",
)
async def get_event(
    event_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventDetailResponse:
    stmt = (
        select(Event)
        .where(Event.id == event_id)
        .options(
            selectinload(Event.schedules),
            selectinload(Event.reviews).selectinload(Review.user),
        )
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )

    now_utc = datetime.now(timezone.utc)
    schedules = sorted(
        [
            s
            for s in event.schedules
            if s.end_datetime > now_utc
            and s.status == ScheduleStatus.open
            and s.available_slots > 0
        ],
        key=lambda s: s.start_datetime,
    )
    published = [r for r in event.reviews if r.is_published]

    base = EventResponse.model_validate(event)
    return EventDetailResponse(
        **base.model_dump(mode="python"),
        schedules=[ScheduleResponse.model_validate(s) for s in schedules],
        reviews=[review_to_response(r, r.user) for r in published],
    )


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать мероприятие",
    description="Создаёт новое мероприятие. Доступно только администратору.",
)
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


@router.put(
    "/{event_id}",
    response_model=EventResponse,
    summary="Обновить мероприятие",
    description="Обновляет поля мероприятия по идентификатору. Доступно только администратору.",
)
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


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить мероприятие",
    description="Удаляет мероприятие по идентификатору. Доступно только администратору.",
)
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
