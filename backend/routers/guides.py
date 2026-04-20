from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_admin, get_current_guide
from database import get_db
from models import (
    Booking,
    BookingStatus,
    Event,
    Guide,
    GuideAvailabilityStatus,
    GuideChatMessage,
    GuideSalaryEvent,
    Review,
    Schedule,
    ScheduleStatus,
    User,
    UserRole,
)
from schemas import (
    GuideAvailabilityUpdate,
    GuideChatDialogItem,
    GuideChatMessageResponse,
    GuideChatSendRequest,
    GuideCreate,
    GuideGroupResponse,
    GuideMyScheduleItem,
    GuideParticipantItem,
    GuideRatingResponse,
    GuideRatingReviewItem,
    GuideRejectRequest,
    GuideResponse,
    GuideScheduleBookingBrief,
    GuideScheduleDecisionResponse,
    GuideUpdate,
)
from services.email_service import send_email
from services.notification_service import send_push_notification

router = APIRouter(prefix="/guides", tags=["Гиды"])


def _full_name(user: User) -> str:
    if user.first_name and user.last_name:
        return f"{user.first_name} {user.last_name}"
    if user.first_name:
        return user.first_name
    return user.login


async def _guide_rating_stats_by_ids(
    db: AsyncSession,
    guide_ids: list[int],
) -> dict[int, tuple[float | None, int]]:
    """Средняя оценка и число отзывов по guide_rating для списка id гидов."""
    if not guide_ids:
        return {}
    gkey = func.coalesce(Schedule.guide_id, Schedule.rejected_by_guide_id)
    stmt = (
        select(
            gkey.label("gid"),
            func.avg(Review.guide_rating),
            func.count(Review.id),
        )
        .select_from(Review)
        .join(Booking, Review.booking_id == Booking.id)
        .join(Schedule, Booking.schedule_id == Schedule.id)
        .where(
            gkey.in_(guide_ids),
            gkey.isnot(None),
            Review.is_published.is_(True),
            Review.guide_rating.isnot(None),
        )
        .group_by(gkey)
    )
    rows = (await db.execute(stmt)).all()
    out: dict[int, tuple[float | None, int]] = {}
    for gid, av, cnt in rows:
        if gid is None:
            continue
        c = int(cnt or 0)
        if c == 0:
            out[int(gid)] = (None, 0)
        else:
            out[int(gid)] = (round(float(av), 2), c)
    return out


def _guide_response_with_rating(
    guide: Guide,
    stats: dict[int, tuple[float | None, int]],
) -> GuideResponse:
    avg, n = stats.get(guide.id, (None, 0))
    return GuideResponse.model_validate(guide).model_copy(
        update={
            "average_guide_rating": avg,
            "guide_reviews_count": n,
        },
    )


async def _get_my_guide(db: AsyncSession, current_user: User) -> Guide:
    assert current_user.guide_id is not None
    guide = await db.get(Guide, current_user.guide_id)
    if guide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль гида не найден",
        )
    return guide


@router.get(
    "",
    response_model=list[GuideResponse],
    summary="Список гидов",
    description="Возвращает список гидов с фильтрацией по специализации и активности.",
)
async def list_guides(
    db: Annotated[AsyncSession, Depends(get_db)],
    specialization: str | None = Query(
        None,
        description="Подстрока в поле specialization (без учёта регистра)",
    ),
    is_active: bool | None = Query(
        None,
        description="Только активные / неактивные",
    ),
) -> list[GuideResponse]:
    stmt = select(Guide).order_by(Guide.last_name, Guide.first_name)
    if specialization:
        stmt = stmt.where(Guide.specialization.ilike(f"%{specialization}%"))
    if is_active is not None:
        stmt = stmt.where(Guide.is_active == is_active)
    result = await db.execute(stmt)
    guides = list(result.scalars().all())
    stats = await _guide_rating_stats_by_ids(db, [g.id for g in guides])
    return [_guide_response_with_rating(g, stats) for g in guides]


@router.post(
    "",
    response_model=GuideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Создать гида",
    description="Добавляет нового гида. Доступно только администратору.",
)
async def create_guide(
    data: GuideCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> GuideResponse:
    guide = Guide(
        first_name=data.first_name,
        last_name=data.last_name,
        patronymic=data.patronymic,
        phone=data.phone,
        email=data.email,
        photo_url=data.photo_url,
        specialization=data.specialization,
        hire_date=data.hire_date,
        is_active=data.is_active,
        availability_status=data.availability_status,
    )
    db.add(guide)
    await db.commit()
    await db.refresh(guide)
    stats = await _guide_rating_stats_by_ids(db, [guide.id])
    return _guide_response_with_rating(guide, stats)


@router.get(
    "/my/schedule",
    response_model=list[GuideMyScheduleItem],
    summary="Моё расписание гида",
    description="Возвращает расписание текущего гида с количеством участников и фильтрами по периоду/статусу.",
)
async def my_schedule(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
    period: str | None = Query(None, description="Период: today / week / month"),
    schedule_status: ScheduleStatus | None = Query(
        None,
        alias="status",
        description="Фильтр по статусу сеанса",
    ),
) -> list[GuideMyScheduleItem]:
    guide = await _get_my_guide(db, current_user)
    stmt = (
        select(
            Schedule,
            Event.title,
            func.coalesce(func.sum(Booking.participants_count), 0).label("participants_count"),
        )
        .join(Event, Event.id == Schedule.event_id)
        .outerjoin(
            Booking,
            and_(
                Booking.schedule_id == Schedule.id,
                Booking.status != BookingStatus.cancelled,
            ),
        )
        .where(
            or_(
                Schedule.guide_id == guide.id,
                Schedule.rejected_by_guide_id == guide.id,
            ),
        )
        .group_by(Schedule.id, Event.title)
        .order_by(Schedule.start_datetime)
    )

    now = datetime.now(timezone.utc)
    if period:
        p = period.lower()
        if p == "today":
            day_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            stmt = stmt.where(
                Schedule.start_datetime >= day_start,
                Schedule.start_datetime < day_end,
            )
        elif p == "week":
            stmt = stmt.where(
                Schedule.start_datetime >= now,
                Schedule.start_datetime < now + timedelta(days=7),
            )
        elif p == "month":
            stmt = stmt.where(
                Schedule.start_datetime >= now,
                Schedule.start_datetime < now + timedelta(days=30),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="period должен быть одним из: today, week, month",
            )
    if schedule_status is not None:
        stmt = stmt.where(Schedule.status == schedule_status)

    rows = (await db.execute(stmt)).all()

    schedule_ids = [s.id for s, _, _ in rows]
    bookings_by_schedule: dict[int, list[GuideScheduleBookingBrief]] = defaultdict(list)
    if schedule_ids:
        b_rows = (
            await db.execute(
                select(
                    Booking.id,
                    Booking.schedule_id,
                    Booking.status,
                    Booking.participants_count,
                )
                .where(
                    Booking.schedule_id.in_(schedule_ids),
                    Booking.status != BookingStatus.cancelled,
                )
                .order_by(Booking.schedule_id, Booking.id),
            )
        ).all()
        for bid, sid, st, pc in b_rows:
            bookings_by_schedule[sid].append(
                GuideScheduleBookingBrief(
                    booking_id=bid,
                    status=st,
                    participants_count=int(pc or 0),
                )
            )

    return [
        GuideMyScheduleItem(
            schedule_id=s.id,
            event_id=s.event_id,
            event_title=event_title,
            start_datetime=s.start_datetime,
            end_datetime=s.end_datetime,
            schedule_status=s.status,
            participants_count=int(parts_count or 0),
            guide_confirmed_at=s.guide_confirmed_at,
            guide_rejected_at=s.guide_rejected_at,
            guide_reject_reason=s.guide_reject_reason,
            guide_completed_at=s.guide_completed_at,
            bookings=bookings_by_schedule[s.id],
        )
        for s, event_title, parts_count in rows
    ]


@router.post(
    "/my/confirm/{schedule_id}",
    response_model=GuideScheduleDecisionResponse,
    summary="Подтвердить выход на экскурсию",
    description="Гид подтверждает, что проведёт экскурсию.",
)
async def confirm_my_schedule(
    schedule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideScheduleDecisionResponse:
    guide = await _get_my_guide(db, current_user)
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None or schedule.guide_id != guide.id:
        raise HTTPException(status_code=404, detail="Сеанс не найден")

    schedule.guide_confirmed_at = datetime.now(timezone.utc)
    schedule.guide_rejected_at = None
    schedule.guide_reject_reason = None
    schedule.rejected_by_guide_id = None
    await db.commit()
    await db.refresh(schedule)
    return GuideScheduleDecisionResponse(
        schedule_id=schedule.id,
        action="confirmed",
        guide_confirmed_at=schedule.guide_confirmed_at,
        guide_rejected_at=schedule.guide_rejected_at,
        guide_reject_reason=schedule.guide_reject_reason,
        guide_completed_at=schedule.guide_completed_at,
    )


@router.post(
    "/my/reject/{schedule_id}",
    response_model=GuideScheduleDecisionResponse,
    summary="Отказаться от проведения",
    description="Гид отказывается от экскурсии с указанием причины. Администраторы получают уведомления.",
)
async def reject_my_schedule(
    schedule_id: int,
    data: GuideRejectRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideScheduleDecisionResponse:
    guide = await _get_my_guide(db, current_user)
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None or schedule.guide_id != guide.id:
        raise HTTPException(status_code=404, detail="Сеанс не найден")

    now = datetime.now(timezone.utc)
    schedule.rejected_by_guide_id = guide.id
    schedule.guide_rejected_at = now
    schedule.guide_reject_reason = data.reason.strip()
    schedule.guide_confirmed_at = None
    # Сеанс снова без гида — назначит другого в админке (расписание).
    schedule.guide_id = None
    await db.commit()
    await db.refresh(schedule)

    admins = (
        await db.execute(
            select(User).where(User.role == UserRole.admin, User.is_active.is_(True)),
        )
    ).scalars().all()
    for admin in admins:
        try:
            await send_push_notification(
                admin.id,
                title="Отказ гида от экскурсии",
                body=f"Гид {guide.last_name} {guide.first_name} отказался от сеанса #{schedule.id}.",
                data={"type": "guide_reject", "schedule_id": schedule.id},
            )
            if admin.email:
                await send_email(
                    admin.email,
                    f"Гид отказался от сеанса #{schedule.id}",
                    (
                        f"<p>Гид <b>{guide.last_name} {guide.first_name}</b> отказался от сеанса #{schedule.id}.</p>"
                        f"<p>Сеанс снят с гида — назначьте другого в расписании.</p>"
                        f"<p>Причина: {data.reason}</p>"
                    ),
                )
        except Exception:
            # уведомления не должны ломать бизнес-операцию отказа
            pass

    return GuideScheduleDecisionResponse(
        schedule_id=schedule.id,
        action="rejected",
        guide_confirmed_at=schedule.guide_confirmed_at,
        guide_rejected_at=schedule.guide_rejected_at,
        guide_reject_reason=schedule.guide_reject_reason,
        guide_completed_at=schedule.guide_completed_at,
    )


@router.get(
    "/my/group/{booking_id}",
    response_model=GuideGroupResponse,
    summary="Состав группы по бронированию",
    description="Возвращает список участников. Доступно только подтверждённому гиду и не ранее чем за 1 час до начала.",
)
async def my_group(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideGroupResponse:
    guide = await _get_my_guide(db, current_user)
    booking = (
        await db.execute(
            select(Booking)
            .options(
                selectinload(Booking.participants),
                selectinload(Booking.user),
                selectinload(Booking.schedule),
            )
            .where(Booking.id == booking_id),
        )
    ).scalar_one_or_none()
    if booking is None or booking.schedule is None:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    sch = booking.schedule
    if sch.guide_id != guide.id and sch.rejected_by_guide_id != guide.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой группе")
    if sch.guide_confirmed_at is None and sch.rejected_by_guide_id != guide.id:
        raise HTTPException(
            status_code=403,
            detail="Доступ к группе открывается после подтверждения выхода гидом",
        )
    now = datetime.now(timezone.utc)
    if sch.start_datetime - now > timedelta(hours=1):
        raise HTTPException(
            status_code=403,
            detail="Список участников доступен не ранее чем за 1 час до начала",
        )

    event = await db.get(Event, sch.event_id)
    customer = booking.user
    assert customer is not None
    return GuideGroupResponse(
        booking_id=booking.id,
        schedule_id=booking.schedule_id,
        event_id=sch.event_id,
        event_title=event.title if event else "",
        start_datetime=sch.start_datetime,
        end_datetime=sch.end_datetime,
        customer_name=_full_name(customer),
        customer_email=customer.email,
        customer_phone=customer.phone,
        participants=[
            GuideParticipantItem(
                participant_id=p.id,
                first_name=p.first_name,
                last_name=p.last_name,
                patronymic=p.patronymic,
                age=p.age,
                is_child=p.is_child,
                special_notes=p.special_notes,
            )
            for p in booking.participants
        ],
    )


@router.post(
    "/my/mark-completed/{schedule_id}",
    response_model=GuideScheduleDecisionResponse,
    summary="Отметить экскурсию проведённой",
    description="Гид помечает сеанс как проведённый. Автоматически создаётся событие начисления зарплаты.",
)
async def mark_completed(
    schedule_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideScheduleDecisionResponse:
    guide = await _get_my_guide(db, current_user)
    schedule = await db.get(Schedule, schedule_id)
    if schedule is None or schedule.guide_id != guide.id:
        raise HTTPException(status_code=404, detail="Сеанс не найден")
    if schedule.guide_confirmed_at is None:
        raise HTTPException(
            status_code=400,
            detail="Сначала подтвердите выход на экскурсию",
        )

    now = datetime.now(timezone.utc)
    schedule.guide_completed_at = now
    schedule.status = ScheduleStatus.completed

    existing_salary = (
        await db.execute(
            select(GuideSalaryEvent).where(GuideSalaryEvent.schedule_id == schedule.id),
        )
    ).scalar_one_or_none()
    if existing_salary is None:
        paid_sum = await db.scalar(
            select(func.coalesce(func.sum(Booking.total_price), Decimal("0"))).where(
                Booking.schedule_id == schedule.id,
                Booking.status.in_((BookingStatus.confirmed, BookingStatus.completed)),
            ),
        )
        amount = (Decimal(paid_sum or 0) * Decimal("0.20")).quantize(Decimal("0.01"))
        db.add(
            GuideSalaryEvent(
                guide_id=guide.id,
                schedule_id=schedule.id,
                amount=amount,
                note="Автоматическое начисление за проведённый сеанс",
            ),
        )

    await db.commit()
    await db.refresh(schedule)
    return GuideScheduleDecisionResponse(
        schedule_id=schedule.id,
        action="completed",
        guide_confirmed_at=schedule.guide_confirmed_at,
        guide_rejected_at=schedule.guide_rejected_at,
        guide_reject_reason=schedule.guide_reject_reason,
        guide_completed_at=schedule.guide_completed_at,
    )


@router.put(
    "/my/status",
    response_model=GuideResponse,
    summary="Изменить статус занятости",
    description="Гид меняет свой статус доступности: active, busy, vacation, sick.",
)
async def update_my_status(
    data: GuideAvailabilityUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> Guide:
    guide = await _get_my_guide(db, current_user)
    guide.availability_status = data.availability_status
    guide.is_active = data.availability_status in (
        GuideAvailabilityStatus.active,
        GuideAvailabilityStatus.busy,
    )
    await db.commit()
    await db.refresh(guide)
    return guide


@router.get(
    "/my/chats",
    response_model=list[GuideChatDialogItem],
    summary="Список чатов с администраторами",
    description="Возвращает диалоги гида с администраторами и последнее сообщение в каждом диалоге.",
)
async def list_my_chats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> list[GuideChatDialogItem]:
    guide = await _get_my_guide(db, current_user)
    rows = (
        await db.execute(
            select(GuideChatMessage, User)
            .join(User, GuideChatMessage.admin_id == User.id)
            .where(GuideChatMessage.guide_id == guide.id)
            .order_by(GuideChatMessage.created_at.desc()),
        )
    ).all()

    seen: set[int] = set()
    dialogs: list[GuideChatDialogItem] = []
    for msg, admin in rows:
        if admin.id in seen:
            continue
        seen.add(admin.id)
        dialogs.append(
            GuideChatDialogItem(
                admin_id=admin.id,
                admin_name=_full_name(admin),
                last_message=msg.message,
                last_message_at=msg.created_at,
            ),
        )
    return dialogs


@router.post(
    "/my/chats/{admin_id}/send",
    response_model=GuideChatMessageResponse,
    summary="Отправить сообщение администратору",
    description="Создаёт новое сообщение гида в диалоге с выбранным администратором.",
)
async def send_message_to_admin(
    admin_id: int,
    data: GuideChatSendRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideChatMessageResponse:
    guide = await _get_my_guide(db, current_user)
    admin = await db.get(User, admin_id)
    if admin is None or admin.role != UserRole.admin:
        raise HTTPException(status_code=404, detail="Администратор не найден")

    message = GuideChatMessage(
        guide_id=guide.id,
        admin_id=admin_id,
        sender_user_id=current_user.id,
        message=data.message.strip(),
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)

    try:
        await send_push_notification(
            admin_id,
            title="Новое сообщение от гида",
            body=f"Гид {guide.last_name} {guide.first_name}: {message.message[:120]}",
            data={"type": "guide_chat", "guide_id": guide.id, "admin_id": admin_id},
        )
    except Exception:
        pass

    return GuideChatMessageResponse(
        id=message.id,
        guide_id=message.guide_id,
        admin_id=message.admin_id,
        sender_user_id=message.sender_user_id,
        message=message.message,
        created_at=message.created_at,
    )


@router.get(
    "/my/chats/{admin_id}/messages",
    response_model=list[GuideChatMessageResponse],
    summary="История сообщений с администратором",
    description="Возвращает историю сообщений между текущим гидом и выбранным администратором.",
)
async def get_chat_messages(
    admin_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> list[GuideChatMessageResponse]:
    guide = await _get_my_guide(db, current_user)
    admin = await db.get(User, admin_id)
    if admin is None or admin.role != UserRole.admin:
        raise HTTPException(status_code=404, detail="Администратор не найден")

    rows = (
        await db.execute(
            select(GuideChatMessage)
            .where(
                GuideChatMessage.guide_id == guide.id,
                GuideChatMessage.admin_id == admin_id,
            )
            .order_by(GuideChatMessage.created_at.asc()),
        )
    ).scalars().all()

    return [
        GuideChatMessageResponse(
            id=m.id,
            guide_id=m.guide_id,
            admin_id=m.admin_id,
            sender_user_id=m.sender_user_id,
            message=m.message,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.get(
    "/my/rating",
    response_model=GuideRatingResponse,
    summary="Мой рейтинг и отзывы",
    description="Возвращает среднюю оценку гида по критерию guide_rating и последние отзывы клиентов.",
)
async def my_rating(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_guide)],
) -> GuideRatingResponse:
    guide = await _get_my_guide(db, current_user)
    rows = (
        await db.execute(
            select(Review, Booking, Schedule, User)
            .join(Booking, Review.booking_id == Booking.id)
            .join(Schedule, Booking.schedule_id == Schedule.id)
            .join(User, Review.user_id == User.id)
            .where(
                or_(
                    Schedule.guide_id == guide.id,
                    Schedule.rejected_by_guide_id == guide.id,
                ),
                Review.is_published.is_(True),
                Review.guide_rating.is_not(None),
            )
            .order_by(Review.created_at.desc()),
        )
    ).all()

    ratings = [int(r.guide_rating) for r, _, _, _ in rows if r.guide_rating is not None]
    avg = float(sum(ratings) / len(ratings)) if ratings else 0.0

    from models import Event

    event_ids = {schedule.event_id for _, _, schedule, _ in rows}
    event_map: dict[int, str] = {}
    if event_ids:
        event_rows = await db.execute(select(Event.id, Event.title).where(Event.id.in_(event_ids)))
        event_map = {eid: title for eid, title in event_rows.all()}

    return GuideRatingResponse(
        guide_id=guide.id,
        average_guide_rating=round(avg, 2),
        reviews_count=len(ratings),
        reviews=[
            GuideRatingReviewItem(
                review_id=review.id,
                event_id=schedule.event_id,
                event_title=event_map.get(schedule.event_id, ""),
                booking_id=booking.id,
                rating=review.rating,
                guide_rating=review.guide_rating,
                comment=review.comment,
                created_at=review.created_at,
                author_name=_full_name(author),
            )
            for review, booking, schedule, author in rows
        ],
    )


# Маршруты с параметром {guide_id} — в конце файла, чтобы не перехватывать /guides/my/...

@router.get(
    "/{guide_id}",
    response_model=GuideResponse,
    summary="Карточка гида",
    description="Возвращает информацию о конкретном гиде по идентификатору.",
)
async def get_guide(
    guide_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GuideResponse:
    guide = await db.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гид не найден",
        )
    stats = await _guide_rating_stats_by_ids(db, [guide.id])
    return _guide_response_with_rating(guide, stats)


@router.put(
    "/{guide_id}",
    response_model=GuideResponse,
    summary="Обновить гида",
    description="Обновляет данные гида по идентификатору. Доступно только администратору.",
)
async def update_guide(
    guide_id: int,
    data: GuideUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> GuideResponse:
    guide = await db.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гид не найден",
        )
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(guide, key, val)
    await db.commit()
    await db.refresh(guide)
    stats = await _guide_rating_stats_by_ids(db, [guide.id])
    return _guide_response_with_rating(guide, stats)


@router.delete(
    "/{guide_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить гида",
    description="Удаляет гида по идентификатору. Доступно только администратору.",
)
async def delete_guide(
    guide_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> None:
    guide = await db.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гид не найден",
        )
    await db.execute(delete(Guide).where(Guide.id == guide_id))
    await db.commit()

