from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from database import get_db
from models import Booking, BookingStatus, Review, Schedule, User, UserRole
from schemas import ReviewCreate, ReviewResponse, ReviewUpdate

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewResponse])
async def list_reviews_for_event(
    db: Annotated[AsyncSession, Depends(get_db)],
    event_id: int = Query(..., ge=1, description="Идентификатор мероприятия"),
) -> list[Review]:
    stmt = (
        select(Review)
        .where(
            Review.event_id == event_id,
            Review.is_published.is_(True),
        )
        .order_by(Review.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: ReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Review:
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
    if booking.status != BookingStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв доступен только после завершённого посещения (статус бронирования: completed)",
        )

    schedule = await db.get(Schedule, booking.schedule_id)
    if schedule is None or schedule.event_id != data.event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Бронирование не относится к указанному мероприятию",
        )

    dup = await db.execute(
        select(Review.id).where(Review.booking_id == data.booking_id),
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отзыв по этому бронированию уже существует",
        )

    review = Review(
        user_id=current_user.id,
        event_id=data.event_id,
        booking_id=data.booking_id,
        rating=data.rating,
        comment=data.comment,
        guide_rating=data.guide_rating,
        is_published=True,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Review:
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
        return review
    for key, val in payload.items():
        setattr(review, key, val)
    await db.commit()
    await db.refresh(review)
    return review


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
