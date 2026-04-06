from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated
from urllib.parse import urlparse, urlencode, parse_qsl, urlunparse

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_user
from config import settings
from database import get_db
from models import (
    Booking,
    BookingStatus,
    Event,
    Participant,
    Schedule,
    ScheduleStatus,
    Transaction,
    TransactionStatus,
    User,
    UserRole,
)
from schemas import (
    BookingCancelResponse,
    BookingCreate,
    BookingDetailResponse,
    BookingResponse,
    EventBookingInfoResponse,
    ParticipantResponse,
    ScheduleBriefResponse,
)
from services.booking_lock import (
    ensure_slots_mirror,
    release_reservation,
    reserve_slots_and_lock,
    restore_slots_after_paid_cancel,
)
from services.email_service import booking_qr_data_uri
from services.payment_service import create_payment, create_refund
from services.redis_client import RedisDep

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _payment_return_url_with_booking(booking_id: int) -> str:
    """Добавляет booking_id к PAYMENT_RETURN_URL для страницы подтверждения на фронте."""
    base = settings.PAYMENT_RETURN_URL.rstrip("/")
    parts = urlparse(base)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query["booking_id"] = str(booking_id)
    new_query = urlencode(query)
    return urlunparse(
        (
            parts.scheme,
            parts.netloc,
            parts.path,
            parts.params,
            new_query,
            parts.fragment,
        ),
    )


def _booking_to_response(
    booking: Booking,
    *,
    event_title: str | None = None,
    schedule_start_datetime: datetime | None = None,
    payment_url: str | None = None,
    payment_id: str | None = None,
) -> BookingResponse:
    return BookingResponse(
        id=booking.id,
        user_id=booking.user_id,
        schedule_id=booking.schedule_id,
        status=booking.status,
        participants_count=booking.participants_count,
        total_price=booking.total_price,
        customer_notes=booking.customer_notes,
        created_at=booking.created_at,
        confirmed_at=booking.confirmed_at,
        payment_url=payment_url,
        payment_id=payment_id,
        event_title=event_title,
        schedule_start_datetime=schedule_start_datetime,
    )


def _can_access_booking(user: User, booking: Booking) -> bool:
    return user.id == booking.user_id or user.role == UserRole.admin


def _schedule_start_aware(schedule: Schedule) -> datetime:
    st = schedule.start_datetime
    if st.tzinfo is None:
        return st.replace(tzinfo=timezone.utc)
    return st


def _assert_may_cancel_by_time(schedule: Schedule) -> None:
    now = datetime.now(timezone.utc)
    start = _schedule_start_aware(schedule)
    if start <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отменить бронирование: мероприятие уже началось или прошло",
        )
    min_h = settings.BOOKING_CANCEL_MIN_HOURS_BEFORE_EVENT
    deadline = start - timedelta(hours=min_h)
    if now > deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Отмена возможна не позднее чем за {min_h} ч. до начала мероприятия"
            ),
        )


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: RedisDep,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BookingResponse:
    schedule = await db.get(Schedule, data.schedule_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сеанс не найден",
        )
    if schedule.status != ScheduleStatus.open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сеанс недоступен для бронирования",
        )

    if data.participants_count > schedule.available_slots:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недостаточно свободных мест",
        )

    event = await db.get(Event, schedule.event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Мероприятие не найдено",
        )

    await ensure_slots_mirror(redis, schedule.id, schedule.available_slots)

    ok, err = await reserve_slots_and_lock(
        redis,
        schedule.id,
        current_user.id,
        data.participants_count,
    )
    if not ok:
        if err == "lock_exists":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="У вас уже есть активная блокировка на этот сеанс (оплатите или дождитесь истечения 15 минут)",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недостаточно свободных мест",
        )

    total_price = Decimal(data.participants_count) * event.base_price

    booking = Booking(
        user_id=current_user.id,
        schedule_id=schedule.id,
        status=BookingStatus.pending,
        participants_count=data.participants_count,
        total_price=total_price,
        customer_notes=data.customer_notes,
    )
    db.add(booking)

    try:
        await db.flush()
        for p in data.participants:
            db.add(
                Participant(
                    booking_id=booking.id,
                    first_name=p.first_name,
                    last_name=p.last_name,
                    patronymic=p.patronymic,
                    age=p.age,
                    is_child=p.is_child,
                    special_notes=p.special_notes,
                ),
            )
        await db.commit()
        await db.refresh(booking)
    except Exception:
        await db.rollback()
        await release_reservation(
            redis,
            schedule.id,
            current_user.id,
            data.participants_count,
        )
        raise

    payment_url, payment_id = await create_payment(
        booking_id=booking.id,
        amount=booking.total_price,
        description=f"Бронирование #{booking.id}, мероприятие: {event.title}",
        return_url=_payment_return_url_with_booking(booking.id),
    )

    return _booking_to_response(
        booking,
        payment_url=payment_url,
        payment_id=payment_id,
    )


@router.get("/my", response_model=list[BookingResponse])
async def list_my_bookings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    booking_status: Annotated[
        BookingStatus | None,
        Query(alias="status", description="Фильтр по статусу бронирования"),
    ] = None,
) -> list[BookingResponse]:
    q = (
        select(Booking)
        .options(selectinload(Booking.schedule).selectinload(Schedule.event))
        .where(Booking.user_id == current_user.id)
    )
    if booking_status is not None:
        q = q.where(Booking.status == booking_status)
    q = q.order_by(Booking.created_at.desc())
    result = await db.execute(q)
    rows = result.scalars().all()
    out: list[BookingResponse] = []
    for b in rows:
        ev_title: str | None = None
        sch_start: datetime | None = None
        if b.schedule is not None:
            sch_start = b.schedule.start_datetime
            if b.schedule.event is not None:
                ev_title = b.schedule.event.title
        out.append(
            _booking_to_response(
                b,
                event_title=ev_title,
                schedule_start_datetime=sch_start,
            ),
        )
    return out


@router.get("/{booking_id}", response_model=BookingDetailResponse)
async def get_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> BookingDetailResponse:
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.participants),
            selectinload(Booking.schedule).selectinload(Schedule.event),
        )
        .where(Booking.id == booking_id),
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )
    if not _can_access_booking(current_user, booking):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию",
        )
    assert booking.schedule is not None
    assert booking.schedule.event is not None
    ev = booking.schedule.event
    sch = booking.schedule
    qr_uri = ""
    # Пропуск по QR только до конца сеанса; после окончания мероприятия не отдаём.
    if booking.status == BookingStatus.confirmed and sch.end_datetime > datetime.now(
        timezone.utc,
    ):
        try:
            qr_uri = booking_qr_data_uri(booking.id)
        except Exception:
            qr_uri = ""
    return BookingDetailResponse(
        id=booking.id,
        user_id=booking.user_id,
        schedule_id=booking.schedule_id,
        status=booking.status,
        participants_count=booking.participants_count,
        total_price=booking.total_price,
        customer_notes=booking.customer_notes,
        created_at=booking.created_at,
        confirmed_at=booking.confirmed_at,
        payment_url=None,
        payment_id=None,
        event_title=ev.title,
        schedule_start_datetime=sch.start_datetime,
        participants=[ParticipantResponse.model_validate(p) for p in booking.participants],
        event=EventBookingInfoResponse(
            id=ev.id,
            title=ev.title,
            description=ev.description,
            meeting_point=ev.meeting_point,
            duration_minutes=ev.duration_minutes,
            category=ev.category,
            base_price=ev.base_price,
        ),
        schedule=ScheduleBriefResponse(
            id=sch.id,
            start_datetime=sch.start_datetime,
            end_datetime=sch.end_datetime,
            status=sch.status,
        ),
        qr_code_data_uri=qr_uri,
    )


@router.post("/{booking_id}/cancel", response_model=BookingCancelResponse)
async def cancel_booking(
    booking_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    redis: RedisDep,
    current_user: Annotated[User, Depends(get_current_user)],
) -> BookingCancelResponse:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.schedule))
        .where(Booking.id == booking_id),
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )
    if not _can_access_booking(current_user, booking):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этому бронированию",
        )

    schedule = booking.schedule
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сеанс не найден",
        )

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование уже отменено",
        )
    if booking.status in (BookingStatus.completed,):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя отменить завершённое бронирование",
        )
    _assert_may_cancel_by_time(schedule)

    refund_id: str | None = None
    refund_initiated = False
    msg: str | None = None

    if booking.status == BookingStatus.pending:
        await release_reservation(
            redis,
            schedule.id,
            booking.user_id,
            booking.participants_count,
        )
        booking.status = BookingStatus.cancelled
        await db.commit()
        await db.refresh(booking)
        msg = "Бронирование отменено, резерв мест снят."
        return BookingCancelResponse(
            booking=_booking_to_response(booking),
            refund_id=None,
            refund_initiated=False,
            message=msg,
        )

    if booking.status == BookingStatus.confirmed:
        if not settings.BOOKING_ONLINE_REFUND_ENABLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Автоматический возврат средств отключён политикой бюро. "
                    "Обратитесь в поддержку."
                ),
            )

        tx_result = await db.execute(
            select(Transaction)
            .where(
                Transaction.booking_id == booking.id,
                Transaction.status == TransactionStatus.completed,
            )
            .order_by(Transaction.id.desc())
            .limit(1),
        )
        tx = tx_result.scalar_one_or_none()
        if tx is None or not tx.external_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нет данных об оплате для возврата",
            )

        payment_id = tx.external_id
        is_demo_payment = payment_id.startswith("demo-")

        if not is_demo_payment:
            try:
                refund_id = await create_refund(payment_id, tx.amount)
                refund_initiated = True
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(e),
                ) from e
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Не удалось создать возврат в ЮKassa",
                )
        else:
            msg = "Демо-платёж: возврат через ЮKassa не выполнялся."
            refund_initiated = False

        new_slots = schedule.available_slots + booking.participants_count
        schedule.available_slots = new_slots
        booking.status = BookingStatus.cancelled

        tx.status = TransactionStatus.refunded
        tx.refund_external_id = refund_id

        await restore_slots_after_paid_cancel(
            redis,
            schedule.id,
            booking.participants_count,
            new_slots,
        )

        await db.commit()
        await db.refresh(booking)

        if refund_initiated:
            msg = "Бронирование отменено, возврат средств инициирован."
        elif msg is None:
            msg = "Бронирование отменено."

        return BookingCancelResponse(
            booking=_booking_to_response(booking),
            refund_id=refund_id,
            refund_initiated=refund_initiated,
            message=msg,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Текущий статус бронирования не допускает отмену",
    )
