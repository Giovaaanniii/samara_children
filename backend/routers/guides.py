from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from database import get_db
from models import Guide, User
from schemas import GuideCreate, GuideResponse, GuideUpdate

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get("", response_model=list[GuideResponse])
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
) -> list[Guide]:
    stmt = select(Guide).order_by(Guide.last_name, Guide.first_name)
    if specialization:
        stmt = stmt.where(Guide.specialization.ilike(f"%{specialization}%"))
    if is_active is not None:
        stmt = stmt.where(Guide.is_active == is_active)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{guide_id}", response_model=GuideResponse)
async def get_guide(
    guide_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Guide:
    guide = await db.get(Guide, guide_id)
    if guide is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Гид не найден",
        )
    return guide


@router.post("", response_model=GuideResponse, status_code=status.HTTP_201_CREATED)
async def create_guide(
    data: GuideCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Guide:
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
    )
    db.add(guide)
    await db.commit()
    await db.refresh(guide)
    return guide


@router.put("/{guide_id}", response_model=GuideResponse)
async def update_guide(
    guide_id: int,
    data: GuideUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_admin)],
) -> Guide:
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
    return guide


@router.delete("/{guide_id}", status_code=status.HTTP_204_NO_CONTENT)
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
