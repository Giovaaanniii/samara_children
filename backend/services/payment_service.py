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
from models import Booking, BookingStatus, Event, PaymentMethod, Schedule, Transaction, TransactionStatus, User
from services.booking_lock import clear_booking_lock_only
from services.email_service import send_booking_confirmation_email
logger = logging.getLogger(__name__)

def _configure_yookassa() -> bool:
    if not settings.YOOKASSA_SHOP_ID or not settings.YOOKASSA_SECRET_KEY:
        return False
    from yookassa import Configuration
    Configuration.configure(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)
    return True

def _create_yookassa_payment_sync(booking_id: int, amount: Decimal, description: str, return_url: str) -> tuple[str, str]:
    from yookassa import Payment
    amount_str = f"{amount.quantize(Decimal('0.01')):.2f}"
    payment = Payment.create({'amount': {'value': amount_str, 'currency': 'RUB'}, 'confirmation': {'type': 'redirect', 'return_url': return_url}, 'capture': True, 'description': description[:128], 'metadata': {'booking_id': str(booking_id)}})
    url = payment.confirmation.confirmation_url
    pid = payment.id
    if not url or not pid:
        raise RuntimeError('YooKassa: нет confirmation_url или id в ответе')
    return (url, pid)

def _fetch_yookassa_payment_sync(payment_id: str):
    from yookassa import Payment
    return Payment.find_one(payment_id)

async def create_payment(booking_id: int, amount: Decimal, description: str, return_url: str) -> tuple[str, str]:
    if _configure_yookassa():
        return await asyncio.to_thread(_create_yookassa_payment_sync, booking_id, amount, description, return_url)
    demo_url = f'https://yookassa.ru/demo-checkout?booking_id={booking_id}&amount={amount}'
    return (demo_url, f'demo-{booking_id}')

def _create_refund_sync(payment_id: str, amount: Decimal) -> str:
    from yookassa import Refund
    amount_str = f"{amount.quantize(Decimal('0.01')):.2f}"
    refund = Refund.create({'payment_id': payment_id, 'amount': {'value': amount_str, 'currency': 'RUB'}})
    rid = refund.id
    if not rid:
        raise RuntimeError('YooKassa: нет id возврата в ответе')
    return rid

async def create_refund(payment_id: str, amount: Decimal) -> str:
    if not _configure_yookassa():
        raise ValueError('YooKassa не настроена')
    return await asyncio.to_thread(_create_refund_sync, payment_id, amount)

async def _confirm_booking_paid(
    db: AsyncSession,
    redis_client: RedisClient,
    *,
    booking_id: int,
    payment_id: str,
    paid_amount: Decimal | None,
) -> bool:
    existing = await db.execute(select(Transaction).where(Transaction.external_id == payment_id))
    existing_tx = existing.scalar_one_or_none()
    if existing_tx is not None and existing_tx.status == TransactionStatus.completed:
        logger.info('Платёж %s уже обработан', payment_id)
        return False
    booking = await db.get(Booking, booking_id)
    if booking is None:
        logger.error('Бронирование %s не найдено', booking_id)
        return False
    if booking.status != BookingStatus.pending:
        logger.info('Бронирование %s уже не pending (%s)', booking_id, booking.status)
        return False
    schedule = await db.get(Schedule, booking.schedule_id)
    if schedule is None:
        logger.error('Сеанс для бронирования %s не найден', booking_id)
        return False
    event = await db.get(Event, schedule.event_id)
    event_title = event.title if event else 'Мероприятие'
    if paid_amount is not None and paid_amount != booking.total_price.quantize(Decimal('0.01')):
        logger.warning(
            'Сумма не совпадает booking=%s paid=%s expected=%s',
            booking_id,
            paid_amount,
            booking.total_price,
        )
    user = await db.get(User, booking.user_id)
    if user is None:
        logger.error('Пользователь для бронирования %s не найден', booking_id)
        return False
    new_slots = schedule.available_slots - booking.participants_count
    if new_slots < 0:
        logger.error('Недостаточно мест в БД для schedule %s', schedule.id)
        return False
    now = datetime.now(timezone.utc)
    schedule.available_slots = new_slots
    booking.status = BookingStatus.confirmed
    booking.confirmed_at = now
    if existing_tx is not None:
        existing_tx.status = TransactionStatus.completed
        existing_tx.completed_at = now
    else:
        db.add(
            Transaction(
                booking_id=booking.id,
                payment_method=PaymentMethod.card_online,
                amount=booking.total_price,
                status=TransactionStatus.completed,
                external_id=payment_id,
                completed_at=now,
            )
        )
    await db.commit()
    await clear_booking_lock_only(redis_client, schedule.id, booking.user_id)
    try:
        if user.email:
            await send_booking_confirmation_email(
                user.email,
                booking.id,
                event_title=event_title,
                start_at=schedule.start_datetime,
                participants_count=booking.participants_count,
            )
    except Exception:
        logger.exception('Уведомления после оплаты бронирования %s не отправлены', booking_id)
    logger.info('Бронирование %s подтверждено, платёж %s', booking_id, payment_id)
    return True

async def sync_booking_payment_if_pending(
    db: AsyncSession,
    redis_client: RedisClient,
    booking: Booking,
) -> bool:
    if booking.status != BookingStatus.pending:
        return False
    if not _configure_yookassa():
        return False
    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.booking_id == booking.id,
            Transaction.status == TransactionStatus.pending,
            Transaction.external_id.isnot(None),
        )
        .order_by(Transaction.id.desc())
        .limit(1)
    )
    tx = result.scalar_one_or_none()
    if tx is None or not tx.external_id or tx.external_id.startswith('demo-'):
        return False
    try:
        payment = await asyncio.to_thread(_fetch_yookassa_payment_sync, tx.external_id)
    except Exception:
        logger.exception('Не удалось запросить платёж %s в ЮKassa', tx.external_id)
        return False
    status = getattr(payment, 'status', None)
    if status != 'succeeded':
        logger.info('Синхронизация: платёж %s в статусе %s', tx.external_id, status)
        return False
    paid_raw = getattr(getattr(payment, 'amount', None), 'value', None)
    paid = Decimal(str(paid_raw)) if paid_raw is not None else None
    return await _confirm_booking_paid(
        db,
        redis_client,
        booking_id=booking.id,
        payment_id=tx.external_id,
        paid_amount=paid,
    )

async def handle_webhook(request: Request, db: AsyncSession, redis_client: RedisClient) -> dict[str, Any]:
    try:
        body = await request.json()
    except Exception:
        logger.exception('Webhook: невалидный JSON')
        return {'ok': False, 'error': 'invalid_json'}
    event = body.get('event')
    obj = body.get('object') or {}
    if event != 'payment.succeeded':
        logger.info('Webhook: пропуск события %s', event)
        return {'ok': True, 'ignored': event}
    payment_id = obj.get('id')
    metadata = obj.get('metadata') or {}
    booking_id_raw = metadata.get('booking_id')
    if not payment_id or booking_id_raw is None:
        logger.warning('Webhook: нет payment_id или booking_id в metadata')
        return {'ok': False, 'error': 'missing_fields'}
    try:
        booking_id = int(booking_id_raw)
    except (TypeError, ValueError):
        return {'ok': False, 'error': 'invalid_booking_id'}
    amount_str = (obj.get('amount') or {}).get('value')
    paid = Decimal(str(amount_str)) if amount_str is not None else None
    confirmed = await _confirm_booking_paid(
        db,
        redis_client,
        booking_id=booking_id,
        payment_id=payment_id,
        paid_amount=paid,
    )
    if not confirmed:
        booking = await db.get(Booking, booking_id)
        if booking is not None and booking.status != BookingStatus.pending:
            return {'ok': True, 'already_processed': True}
        return {'ok': True, 'duplicate': True}
    return {'ok': True, 'booking_id': booking_id}
