"""Связь учётной записи пользователя с профилем гида."""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Guide, GuideAvailabilityStatus, User, UserRole


async def ensure_guide_profile(db: AsyncSession, user: User) -> User:
    """
    Если у пользователя роль guide, но нет guide_id — создаёт запись в guides
    и привязывает её к аккаунту (имя/телефон/email из users).
    """
    if user.role != UserRole.guide or user.guide_id is not None:
        return user

    # Если админ уже создал карточку гида по email/телефону, связываем её с аккаунтом.
    email = (user.email or "").strip()
    phone = (user.phone or "").strip()
    match_filters = []
    if email:
        match_filters.append(Guide.email == email)
    if phone:
        match_filters.append(Guide.phone == phone)
    if match_filters:
        existing = (
            await db.execute(
                select(Guide).where(or_(*match_filters)).order_by(Guide.id.asc()),
            )
        ).scalars().first()
        if existing is not None:
            occupied = (
                await db.execute(
                    select(User.id).where(User.guide_id == existing.id, User.id != user.id),
                )
            ).scalar_one_or_none()
            if occupied is None:
                user.guide_id = existing.id
                await db.commit()
                await db.refresh(user)
                return user

    first = (user.first_name or user.login or "Гид").strip()[:255]
    last = (user.last_name or "").strip()[:255]
    if not last:
        last = "Гид"

    guide = Guide(
        first_name=first,
        last_name=last,
        patronymic=user.patronymic,
        phone=user.phone,
        email=user.email,
        is_active=True,
        availability_status=GuideAvailabilityStatus.active,
    )
    db.add(guide)
    await db.flush()
    user.guide_id = guide.id
    await db.commit()
    await db.refresh(user)
    return user
