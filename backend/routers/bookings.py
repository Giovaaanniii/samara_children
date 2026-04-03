from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

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
    User,
)
from schemas import BookingCreate, BookingResponse
from services.booking_lock import (
    ensure_slots_mirror,
    release_reservation,
    reserve_slots_and_lock,
)
from services.payment_service import create_payment
from services.redis_client import RedisDep

router = APIRouter(prefix="/bookings", tags=["bookings"])


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
        return_url=settings.PAYMENT_RETURN_URL,
    )

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
    )
