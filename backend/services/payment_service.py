"""Интеграция с ЮKassa; пока заглушка — возвращает демо-URL."""

from __future__ import annotations

from decimal import Decimal

from config import settings


async def create_yookassa_payment(
    *,
    booking_id: int,
    amount: Decimal,
    description: str,
) -> str:
    """
    Создаёт платёж в ЮKassa и возвращает URL оплаты.
    После настройки shop_id/secret — подключить SDK yookassa.
    """
    _ = (settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)
    return (
        f"https://yookassa.ru/demo-checkout?"
        f"booking_id={booking_id}&amount={amount}&desc={description[:40]}"
    )
