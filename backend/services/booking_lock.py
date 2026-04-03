"""Временная блокировка слотов бронирования в Redis."""

from __future__ import annotations

import redis.asyncio as redis

LOCK_TTL_SEC = 15 * 60

SLOTS_KEY = "schedule:slots:{schedule_id}"
LOCK_KEY = "booking:lock:{schedule_id}:{user_id}"

# Атомарно: SET lock NX, затем DECRBY слотов. Откат при ошибке — снаружи (INCRBY + DEL).


async def ensure_slots_mirror(r: redis.Redis, schedule_id: int, db_available: int) -> None:
    key = SLOTS_KEY.format(schedule_id=schedule_id)
    cur = await r.get(key)
    if cur is None:
        await r.set(key, db_available)


async def reserve_slots_and_lock(
    r: redis.Redis,
    schedule_id: int,
    user_id: int,
    need: int,
) -> tuple[bool, str | None]:
    """
    Возвращает (успех, код_ошибки).
    Коды: insufficient, lock_exists
    """
    slots_key = SLOTS_KEY.format(schedule_id=schedule_id)
    lock_k = LOCK_KEY.format(schedule_id=schedule_id, user_id=user_id)

    cur = await r.get(slots_key)
    if cur is None:
        return False, "insufficient"
    if int(cur) < need:
        return False, "insufficient"

    if await r.set(lock_k, str(need), nx=True, ex=LOCK_TTL_SEC) is None:
        return False, "lock_exists"

    new_val = await r.decrby(slots_key, need)
    if new_val < 0:
        await r.incrby(slots_key, need)
        await r.delete(lock_k)
        return False, "insufficient"

    return True, None


async def release_reservation(r: redis.Redis, schedule_id: int, user_id: int, need: int) -> None:
    slots_key = SLOTS_KEY.format(schedule_id=schedule_id)
    lock_k = LOCK_KEY.format(schedule_id=schedule_id, user_id=user_id)
    await r.incrby(slots_key, need)
    await r.delete(lock_k)
