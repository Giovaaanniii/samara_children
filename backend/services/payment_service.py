"""Интеграция с ЮKassa: создание платежа и обработка webhook."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from redis.asyncio import Redis as RedisClient
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import (
    Booking,
    BookingStatus,
    PaymentMethod,
    Schedule,
    Transaction,
    TransactionStatus,
    User,
)
from services.booking_lock import clear_booking_lock_only
from services.notifications import (
    send_payment_confirmation_email,
    send_payment_confirmation_push,
)

logger = logging.getLogger(__name__)


def _configure_yookassa() -> bool:
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        return False
    from yookassa import Configuration

    Configuration.configure(
        settings.YOOKASSA_SHOP_ID,
        settings.YOOKASSA_SECRET_KEY,
    )
    return True


def _create_yookassa_payment_sync(
    booking_id: int,
    amount: Decimal,
    description: str,
    return_url: str,
) -> tuple[str, str]:
    from yookassa import Payment

    amount_str = f"{amount.quantize(Decimal('0.01')):.2f}"
    payment = Payment.create(
        {
            "amount": {"value": amount_str, "currency": "RUB"},
            "confirmation": {
                "type": "redirect",
                "return_url": return_url,
            },
            "capture": True,
            "description": description[:128],
            "metadata": {"booking_id": str(booking_id)},
        },
    )
    url = payment.confirmation.confirmation_url
    pid = payment.id
    if not url or not pid:
        raise RuntimeError("YooKassa: нет confirmation_url или id в ответе")
    return url, pid


async def create_payment(
    booking_id: int,
    amount: Decimal,
    description: str,
    return_url: str,
) -> tuple[str, str]:
    """
    Создаёт платёж в ЮKassa.
    Возвращает (payment_url, payment_id).
    Без учётных данных — демо-URL (для разработки).
    """
    if _configure_yookassa():
        return await asyncio.to_thread(
            _create_yookassa_payment_sync,
            booking_id,
            amount,
            description,
            return_url,
        )
    demo_url = (
        f"https://yookassa.ru/demo-checkout?"
        f"booking_id={booking_id}&amount={amount}"
    )
    return demo_url, f"demo-{booking_id}"


def _create_refund_sync(payment_id: str, amount: Decimal) -> str:
    from yookassa import Refund

    amount_str = f"{amount.quantize(Decimal('0.01')):.2f}"
    refund = Refund.create(
        {
            "payment_id": payment_id,
            "amount": {"value": amount_str, "currency": "RUB"},
        },
    )
    rid = refund.id
    if not rid:
        raise RuntimeError("YooKassa: нет id возврата в ответе")
    return rid


async def create_refund(payment_id: str, amount: Decimal) -> str:
    """Создаёт полный возврат по платежу в ЮKassa. Требуются shop_id и secret_key."""
    if not _configure_yookassa():
        raise ValueError("YooKassa не настроена")
    return await asyncio.to_thread(_create_refund_sync, payment_id, amount)


async def handle_webhook(
    request: Request,
    db: AsyncSession,
    redis_client: RedisClient,
) -> dict[str, Any]:
    """
    Обрабатывает POST-тело уведомления ЮKassa (payment.succeeded).
    """
    try:
        body = await request.json()
    except Exception:
        logger.exception("Webhook: невалидный JSON")
        return {"ok": False, "error": "invalid_json"}

    event = body.get("event")
    obj = body.get("object") or {}

    if event != "payment.succeeded":
        logger.info("Webhook: пропуск события %s", event)
        return {"ok": True, "ignored": event}

    payment_id = obj.get("id")
    metadata = obj.get("metadata") or {}
    booking_id_raw = metadata.get("booking_id")
    if not payment_id or booking_id_raw is None:
        logger.warning("Webhook: нет payment_id или booking_id в metadata")
        return {"ok": False, "error": "missing_fields"}

    try:
        booking_id = int(booking_id_raw)
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid_booking_id"}

    existing = await db.execute(
        select(Transaction.id).where(Transaction.external_id == payment_id),
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("Webhook: платёж %s уже обработан", payment_id)
        return {"ok": True, "duplicate": True}

    booking = await db.get(Booking, booking_id)
    if booking is None:
        logger.error("Webhook: бронирование %s не найдено", booking_id)
        return {"ok": False, "error": "booking_not_found"}

    if booking.status != BookingStatus.pending:
        logger.info(
            "Webhook: бронирование %s уже не pending (%s)",
            booking_id,
            booking.status,
        )
        return {"ok": True, "already_processed": True}

    schedule = await db.get(Schedule, booking.schedule_id)
    if schedule is None:
        return {"ok": False, "error": "schedule_not_found"}

    amount_str = (obj.get("amount") or {}).get("value")
    if amount_str is not None:
        paid = Decimal(str(amount_str))
        if paid != booking.total_price.quantize(Decimal("0.01")):
            logger.warning(
                "Webhook: сумма не совпадает booking=%s paid=%s expected=%s",
                booking_id,
                paid,
                booking.total_price,
            )

    user = await db.get(User, booking.user_id)
    if user is None:
        return {"ok": False, "error": "user_not_found"}

    new_slots = schedule.available_slots - booking.participants_count
    if new_slots < 0:
        logger.error(
            "Webhook: недостаточно мест в БД для schedule %s",
            schedule.id,
        )
        return {"ok": False, "error": "slots_underflow"}

    now = datetime.now(timezone.utc)
    schedule.available_slots = new_slots
    booking.status = BookingStatus.confirmed
    booking.confirmed_at = now

    tx = Transaction(
        booking_id=booking.id,
        payment_method=PaymentMethod.card_online,
        amount=booking.total_price,
        status=TransactionStatus.completed,
        external_id=payment_id,
        completed_at=now,
    )
    db.add(tx)

    await db.commit()

    await clear_booking_lock_only(redis_client, schedule.id, booking.user_id)

    try:
        if user.email:
            await send_payment_confirmation_email(user.email, booking.id)
        await send_payment_confirmation_push(user.id, booking.id)
    except Exception:
        logger.exception(
            "Webhook: уведомления после оплаты бронирования %s не отправлены",
            booking_id,
        )

    logger.info(
        "Webhook: бронирование %s подтверждено, платёж %s",
        booking_id,
        payment_id,
    )
    return {"ok": True, "booking_id": booking_id}
