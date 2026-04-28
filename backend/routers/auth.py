from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from config import settings
from database import get_db
from models import User, UserRole
from schemas import (
    LoginRequest,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
    VkExchangeRequest,
    VkLoginUrlResponse,
)
from services.guide_account import ensure_guide_profile

router = APIRouter(prefix="/auth", tags=["Авторизация"])
VK_OAUTH_AUTHORIZE_URL = "https://oauth.vk.com/authorize"
VK_OAUTH_ACCESS_TOKEN_URL = "https://oauth.vk.com/access_token"
VK_API_USERS_GET_URL = "https://api.vk.com/method/users.get"
VK_API_VERSION = "5.199"
VK_STATE_TTL_SECONDS = 15 * 60


def _make_token(user: User) -> Token:
    access_token = create_access_token(
        {"sub": str(user.id)},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return Token(access_token=access_token)


def _sign_state(payload: str) -> str:
    mac = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    raw = f"{payload}.{mac}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _unsign_state(state: str) -> tuple[int, str]:
    try:
        raw = base64.urlsafe_b64decode(state.encode("ascii")).decode("utf-8")
        payload, sign = raw.rsplit(".", 1)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Некорректный state OAuth") from exc
    expected = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(sign, expected):
        raise HTTPException(status_code=400, detail="Некорректная подпись state OAuth")
    try:
        ts_str, redirect_path = payload.split(":", 1)
        ts = int(ts_str)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Повреждённый state OAuth") from exc
    if ts + VK_STATE_TTL_SECONDS < int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=400, detail="State OAuth устарел, попробуйте снова")
    if not redirect_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Некорректный redirect в state OAuth")
    return ts, redirect_path


def _build_vk_state(redirect: str) -> str:
    safe_redirect = redirect.strip() if redirect else "/profile"
    if not safe_redirect.startswith("/"):
        safe_redirect = "/profile"
    if safe_redirect.startswith("//"):
        safe_redirect = "/profile"
    payload = f"{int(datetime.now(timezone.utc).timestamp())}:{safe_redirect}"
    return _sign_state(payload)


async def _fetch_vk_profile(code: str) -> tuple[int, str | None, str | None, str | None]:
    if not settings.VK_CLIENT_ID or not settings.VK_CLIENT_SECRET or not settings.VK_REDIRECT_URI:
        raise HTTPException(
            status_code=500,
            detail="VK OAuth не настроен на сервере",
        )
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.get(
            VK_OAUTH_ACCESS_TOKEN_URL,
            params={
                "client_id": settings.VK_CLIENT_ID,
                "client_secret": settings.VK_CLIENT_SECRET,
                "redirect_uri": settings.VK_REDIRECT_URI,
                "code": code,
            },
        )
        token_data = token_resp.json()
        if token_resp.status_code >= 400 or "error" in token_data:
            raise HTTPException(status_code=400, detail="VK вернул ошибку при авторизации")
        access_token = token_data.get("access_token")
        user_id = token_data.get("user_id")
        email = token_data.get("email")
        if not access_token or not user_id:
            raise HTTPException(status_code=400, detail="VK не вернул данные доступа")
        profile_resp = await client.get(
            VK_API_USERS_GET_URL,
            params={
                "access_token": access_token,
                "v": VK_API_VERSION,
                "fields": "photo_200",
            },
        )
        profile_data = profile_resp.json()
        if profile_resp.status_code >= 400 or "error" in profile_data:
            raise HTTPException(status_code=400, detail="VK не вернул профиль пользователя")
        users = profile_data.get("response") or []
        if not users:
            raise HTTPException(status_code=400, detail="Профиль VK пустой")
        profile = users[0]
        return int(user_id), email, profile.get("first_name"), profile.get("last_name")


async def _upsert_user_by_vk(
    db: AsyncSession,
    *,
    vk_user_id: int,
    email: str | None,
    first_name: str | None,
    last_name: str | None,
) -> User:
    existing_by_vk = (
        await db.execute(select(User).where(User.vk_user_id == vk_user_id))
    ).scalar_one_or_none()
    if existing_by_vk is not None:
        if first_name and not existing_by_vk.first_name:
            existing_by_vk.first_name = first_name
        if last_name and not existing_by_vk.last_name:
            existing_by_vk.last_name = last_name
        existing_by_vk.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing_by_vk)
        return existing_by_vk

    existing_by_email: User | None = None
    if email:
        existing_by_email = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
    if existing_by_email is not None:
        if existing_by_email.vk_user_id and existing_by_email.vk_user_id != vk_user_id:
            raise HTTPException(
                status_code=409,
                detail="Этот email уже привязан к другому VK-аккаунту",
            )
        existing_by_email.vk_user_id = vk_user_id
        existing_by_email.oauth_provider = "vk"
        existing_by_email.oauth_provider_user_id = str(vk_user_id)
        if first_name and not existing_by_email.first_name:
            existing_by_email.first_name = first_name
        if last_name and not existing_by_email.last_name:
            existing_by_email.last_name = last_name
        existing_by_email.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing_by_email)
        return existing_by_email

    safe_email = email or f"vk_{vk_user_id}@vk.local"
    base_login = f"vk_{vk_user_id}"
    login_candidate = base_login
    suffix = 1
    while (
        await db.execute(select(User.id).where(User.login == login_candidate))
    ).scalar_one_or_none() is not None:
        suffix += 1
        login_candidate = f"{base_login}_{suffix}"
    user = User(
        login=login_candidate,
        email=safe_email,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        role=UserRole.client,
        first_name=first_name,
        last_name=last_name,
        oauth_provider="vk",
        oauth_provider_user_id=str(vk_user_id),
        vk_user_id=vk_user_id,
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get(
    "/vk/login-url",
    response_model=VkLoginUrlResponse,
    summary="Ссылка для входа через VK",
)
async def vk_login_url(redirect: str = "/profile") -> VkLoginUrlResponse:
    if not settings.VK_CLIENT_ID or not settings.VK_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="VK OAuth не настроен")
    state = _build_vk_state(redirect)
    query = urlencode(
        {
            "client_id": settings.VK_CLIENT_ID,
            "redirect_uri": settings.VK_REDIRECT_URI,
            "response_type": "code",
            "scope": "email",
            "state": state,
            "v": VK_API_VERSION,
        },
    )
    return VkLoginUrlResponse(
        authorization_url=f"{VK_OAUTH_AUTHORIZE_URL}?{query}",
        state=state,
    )


@router.post(
    "/vk/exchange",
    response_model=Token,
    summary="Завершение входа через VK",
)
async def vk_exchange(
    body: VkExchangeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    _unsign_state(body.state)
    vk_user_id, email, first_name, last_name = await _fetch_vk_profile(body.code)
    user = await _upsert_user_by_vk(
        db,
        vk_user_id=vk_user_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учётная запись отключена",
        )
    user = await ensure_guide_profile(db, user)
    return _make_token(user)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация пользователя",
    description="Создаёт нового пользователя с ролью клиента. Логин и email должны быть уникальными.",
)
async def register(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    dup = await db.execute(
        select(User.id).where(
            or_(User.login == data.login, User.email == str(data.email)),
        ),
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким логином или email уже существует",
        )
    user = User(
        login=data.login,
        email=str(data.email),
        password_hash=hash_password(data.password),
        role=UserRole.client,
        first_name=data.first_name,
        last_name=data.last_name,
        patronymic=data.patronymic,
        phone=data.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    summary="Вход в систему",
    description="Проверяет логин/email и пароль, затем возвращает JWT токен доступа.",
)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Token:
    result = await db.execute(
        select(User).where(
            or_(User.login == body.login, User.email == body.login),
        ),
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учётная запись отключена",
        )
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    user = await ensure_guide_profile(db, user)
    return _make_token(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Профиль текущего пользователя",
    description="Возвращает данные пользователя по Bearer-токену.",
)
async def read_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Обновление профиля",
    description="Изменяет данные текущего пользователя. Можно обновить логин, email, пароль и персональные поля.",
)
async def update_me(
    body: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if body.login is not None:
        taken = await db.execute(
            select(User.id).where(User.login == body.login, User.id != current_user.id),
        )
        if taken.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Логин уже занят",
            )
        current_user.login = body.login
    if body.email is not None:
        email_str = str(body.email)
        taken = await db.execute(
            select(User.id).where(User.email == email_str, User.id != current_user.id),
        )
        if taken.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email уже занят",
            )
        current_user.email = email_str
    if body.password is not None:
        current_user.password_hash = hash_password(body.password)
    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name
    if body.patronymic is not None:
        current_user.patronymic = body.patronymic
    if body.phone is not None:
        current_user.phone = body.phone
    await db.commit()
    await db.refresh(current_user)
    return current_user
