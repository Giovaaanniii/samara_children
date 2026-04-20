from __future__ import annotations

from datetime import timedelta

import pytest

from auth import create_access_token, hash_password
from models import User, UserRole


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_user(db_session, *, role: UserRole, login: str, email: str) -> User:
    user = User(
        login=login,
        email=email,
        password_hash=hash_password("StrongPass123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_create_event_forbidden_for_non_admin(client, db_session):
    user = await _create_user(
        db_session,
        role=UserRole.client,
        login="client_create_event",
        email="client_event@example.com",
    )
    token = create_access_token({"sub": str(user.id)}, timedelta(minutes=30))
    payload = {
        "title": "Мастер-класс",
        "category": "workshop",
        "base_price": "1000.00",
        "status": "active",
    }

    resp = await client.post("/api/v1/events", json=payload, headers=_auth_headers(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_event_allowed_for_admin(client, db_session):
    admin = await _create_user(
        db_session,
        role=UserRole.admin,
        login="admin_create_event",
        email="admin_event@example.com",
    )
    token = create_access_token({"sub": str(admin.id)}, timedelta(minutes=30))
    payload = {
        "title": "Экскурсия по Самаре",
        "description": "Тестовое мероприятие",
        "category": "excursion",
        "base_price": "1500.00",
        "status": "active",
    }

    resp = await client.post("/api/v1/events", json=payload, headers=_auth_headers(token))
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == payload["title"]
    assert body["category"] == payload["category"]

