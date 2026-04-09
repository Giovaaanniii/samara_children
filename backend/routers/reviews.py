from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import get_current_admin, get_current_user
from database import get_db
from models import (
    Booking,
    BookingStatus,
    Review,
    Schedule,
    User,
    UserRole,
)
from schemas import (
    EligibleBookingReviewItem,
    ReviewAdminItem,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    compute_review_stored_rating,
    review_to_response,
)

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _schedule_end_aware(sch: Schedule) -> datetime:
    st = sch.end_datetime
    if st.tzinfo is None:
        return st.replace(tzinfo=timezone.utc)
    return st


@router.get("/eligible-bookings", response_model=list[EligibleBookingReviewItem])
async def list_eligible_bookings_for_review(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    event_id: int = Query(..., ge=1, description="Мероприятие"),
) -> list[EligibleBookingReviewItem]:
    """Бронирования пользователя по этому мероприятию, после которых можно оставить отзыв."""
    now = _utcnow()
    stmt = (
        select(Booking, Schedule)
        .join(Schedule, Booking.schedule_id == Schedule.id)
        .where(
            Booking.user_id == current_user.id,
            Schedule.event_id == event_id,
            Booking.status.in_((BookingStatus.confirmed, BookingStatus.completed)),
            Schedule.end_datetime <= now,
            ~Booking.id.in_(select(Review.booking_id)),
        )
    )
    result = await db.execute(stmt)
    rows = result.all()
    out: list[EligibleBookingReviewItem] = []
    for booking, sch in rows:
        out.append(
            EligibleBookingReviewItem(
                booking_id=booking.id,
                schedule_end=sch.end_datetime,
            ),
        )
    out.sort(key=lambda x: x.schedule_end, reverse=True)
    return out


@router.get("/admin/all", response_model=list[ReviewAdminItem])
async def admin_list_reviews(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
    event_id: int | None = Query(None, ge=1, description="Фильтр по мероприятию"),
) -> list[ReviewAdminItem]:
    stmt = (
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.event))
        .order_by(Review.created_at.desc())
    )
    if event_id is not None:
        stmt = stmt.where(Review.event_id == event_id)
    result = await db.execute(stmt)
    reviews = list(result.scalars().all())
    return [
        ReviewAdminItem(
            **review_to_response(r, r.user).model_dump(),
            event_title=r.event.title if r.event is not None else "",
        )
        for r in reviews
    ]


@router.get("", response_model=list[ReviewResponse])
async def list_reviews_for_event(
    db: Annotated[AsyncSession, Depends(get_db)],
    event_id: int = Query(..., ge=1, description="Идентификатор мероприятия"),
) -> list[ReviewResponse]:
    stmt = (
        select(Review)
        .where(
            Review.event_id == event_id,
            Review.is_published.is_(True),
        )
        .options(selectinload(Review.user))
        .order_by(Review.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    return [review_to_response(r, r.user) for r in rows]


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ReviewResponse:
    booking = await db.get(Booking, data.booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Бронирование не найдено",
        )
    if booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно оставить отзыв только по своему бронированию",
        )
    if booking.status not in (BookingStatus.confirmed, BookingStatus.completed):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв доступен после подтверждённой оплаты",
        )

    schedule = await db.get(Schedule, booking.schedule_id)
    if schedule is None or schedule.event_id != data.event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование не относится к указанному мероприятию",
        )

    if _schedule_end_aware(schedule) > _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв можно оставить после окончания мероприятия",
        )

    dup = await db.execute(
        select(Review.id).where(Review.booking_id == data.booking_id),
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв по этому бронированию уже существует",
        )

    stored = compute_review_stored_rating(
        data.guide_rating,
        data.engagement_rating,
        data.organization_rating,
    )
    review = Review(
        user_id=current_user.id,
        event_id=data.event_id,
        booking_id=data.booking_id,
        rating=stored,
        comment=data.comment,
        guide_rating=data.guide_rating,
        engagement_rating=data.engagement_rating,
        organization_rating=data.organization_rating,
        is_published=True,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review_to_response(review, current_user)


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ReviewResponse:
    review = await db.get(Review, review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отзыв не найден",
        )
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Можно редактировать только свой отзыв",
        )
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        u = await db.get(User, review.user_id)
        return review_to_response(review, u)
    for key, val in payload.items():
        setattr(review, key, val)
    parts = [
        x
        for x in (
            review.guide_rating,
            review.engagement_rating,
            review.organization_rating,
        )
        if x is not None
    ]
    if parts:
        review.rating = compute_review_stored_rating(*parts)
    await db.commit()
    await db.refresh(review)
    u = await db.get(User, review.user_id)
    return review_to_response(review, u)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    review = await db.get(Review, review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Отзыв не найден",
        )
    is_author = review.user_id == current_user.id
    is_admin = current_user.role == UserRole.admin
    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав",
        )
    await db.execute(delete(Review).where(Review.id == review_id))
    await db.commit()
