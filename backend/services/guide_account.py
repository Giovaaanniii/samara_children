"""Связь учётной записи пользователя с профилем гида."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from models import Guide, GuideAvailabilityStatus, User, UserRole


async def ensure_guide_profile(db: AsyncSession, user: User) -> User:
    """
    Если у пользователя роль guide, но нет guide_id — создаёт запись в guides
    и привязывает её к аккаунту (имя/телефон/email из users).
    """
    if user.role != UserRole.guide or user.guide_id is not None:
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
