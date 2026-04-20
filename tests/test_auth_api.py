from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_register_and_login_issue_token(client):
    payload = {
        "login": "user_one",
        "email": "user_one@example.com",
        "password": "StrongPass123",
        "first_name": "User",
        "last_name": "One",
    }
    reg = await client.post("/api/v1/auth/register", json=payload)
    assert reg.status_code == 201
    assert reg.json()["email"] == payload["email"]

    login = await client.post(
        "/api/v1/auth/login",
        json={"login": payload["login"], "password": payload["password"]},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


@pytest.mark.asyncio
async def test_register_requires_unique_login_and_email(client):
    payload = {
        "login": "duplicate_user",
        "email": "dup@example.com",
        "password": "StrongPass123",
    }
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 400
    assert "уже существует" in second.json()["detail"].lower()

