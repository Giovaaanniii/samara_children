"""Push-уведомления через Firebase Cloud Messaging (Admin SDK)."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, messaging
from config import settings
from database import async_session_maker
from models import User

logger = logging.getLogger(__name__)

_firebase_initialized = False


def _ensure_firebase_app() -> bool:
    """Один раз инициализирует приложение Firebase из JSON ключа."""
    global _firebase_initialized
    if _firebase_initialized and firebase_admin._apps:
        return True
    path_str = (settings.FIREBASE_CREDENTIALS_PATH or "").strip()
    if not path_str:
        logger.warning("FIREBASE_CREDENTIALS_PATH не задан — push не отправляются")
        return False
    path = Path(path_str)
    if not path.is_file():
        logger.warning("Файл учётных данных Firebase не найден: %s", path)
        return False
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(str(path.resolve()))
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception:
        logger.exception("Не удалось инициализировать Firebase Admin SDK")
        return False


def _normalize_data(data: dict[str, Any] | None) -> dict[str, str]:
    """FCM требует строковые значения в data."""
    if not data:
        return {}
    out: dict[str, str] = {}
    for k, v in data.items():
        if v is None:
            continue
        out[str(k)] = v if isinstance(v, str) else str(v)
    return out


def _send_fcm_sync(token: str, title: str, body: str, data: dict[str, str]) -> str | None:
    kw: dict[str, Any] = {
        "notification": messaging.Notification(title=title, body=body),
        "token": token,
    }
    if data:
        kw["data"] = data
    msg = messaging.Message(**kw)
    return messaging.send(msg)


async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> None:
    """
    Отправляет push пользователю по сохранённому FCM-токену.

    Для Web Push в браузере клиент получает токен через Firebase JS SDK (getToken
    с VAPID-ключом) и сохраняет его через PUT /api/v1/auth/me (поле fcm_token).

    :param data: произвольные поля (приводятся к строкам для FCM data).
    """
    if not _ensure_firebase_app():
        return

    payload = _normalize_data(data)

    async with async_session_maker() as session:
        user = await session.get(User, user_id)
        if user is None:
            logger.warning("Push: пользователь user_id=%s не найден", user_id)
            return
        fcm_token = (user.fcm_token or "").strip()

    if not fcm_token:
        logger.info(
            "Push: у пользователя user_id=%s нет FCM-токена, пропуск",
            user_id,
        )
        return

    try:
        await asyncio.to_thread(_send_fcm_sync, fcm_token, title, body, payload)
    except Exception as exc:
        err_name = type(exc).__name__
        if "Unregistered" in err_name or "NOT_FOUND" in str(exc):
            logger.warning(
                "Push: токен недействителен для user_id=%s (%s)",
                user_id,
                err_name,
            )
        else:
            logger.exception("Push: ошибка отправки FCM user_id=%s", user_id)
