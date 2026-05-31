import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from config import settings
from database import async_session_maker, engine
from routers import api_router
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.schedules import router as schedules_router
from routers.guides import router as guides_router
from routers.reviews import router as reviews_router
from routers.bookings import router as bookings_router
from routers.payments import router as payments_router
from routers.reports import router as reports_router
from services.guide_reminders import dispatch_guide_schedule_reminders
logger = logging.getLogger(__name__)

async def _ensure_schedule_guide_columns(conn) -> None:
    await conn.execute(text('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_confirmed_at TIMESTAMPTZ'))
    await conn.execute(text('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_rejected_at TIMESTAMPTZ'))
    await conn.execute(text('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_reject_reason TEXT'))
    await conn.execute(text('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_completed_at TIMESTAMPTZ'))
    await conn.execute(text('\n                ALTER TABLE schedules\n                ADD COLUMN IF NOT EXISTS rejected_by_guide_id INTEGER\n                REFERENCES guides(id) ON DELETE SET NULL\n                '))

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await _ensure_schedule_guide_columns(conn)
        await conn.execute(text("\n                DO $$\n                BEGIN\n                    IF NOT EXISTS (\n                        SELECT 1\n                        FROM pg_enum e\n                        JOIN pg_type t ON t.oid = e.enumtypid\n                        WHERE t.typname = 'user_role' AND e.enumlabel = 'guide'\n                    ) THEN\n                        ALTER TYPE user_role ADD VALUE 'guide';\n                    END IF;\n                END\n                $$;\n                "))
        await conn.execute(text('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS engagement_rating INTEGER'))
        await conn.execute(text('UPDATE reviews SET engagement_rating = rating WHERE engagement_rating IS NULL'))
        await conn.execute(text('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS organization_rating INTEGER'))
        await conn.execute(text('UPDATE reviews SET organization_rating = rating WHERE organization_rating IS NULL'))
        await conn.execute(text('\n                ALTER TABLE users\n                ADD COLUMN IF NOT EXISTS guide_id INTEGER UNIQUE REFERENCES guides(id) ON DELETE SET NULL\n                '))
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(32)'))
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_user_id VARCHAR(255)'))
        await conn.execute(text('ALTER TABLE users ADD COLUMN IF NOT EXISTS vk_user_id BIGINT'))
        await conn.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_vk_user_id ON users(vk_user_id) WHERE vk_user_id IS NOT NULL'))
        await conn.execute(text("\n                ALTER TABLE guides\n                ADD COLUMN IF NOT EXISTS availability_status VARCHAR(32) DEFAULT 'active'\n                "))
        await conn.execute(text("UPDATE guides SET availability_status = 'active' WHERE availability_status IS NULL"))
        await conn.execute(text('\n                CREATE TABLE IF NOT EXISTS guide_salary_events (\n                    id SERIAL PRIMARY KEY,\n                    guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,\n                    schedule_id INTEGER NOT NULL UNIQUE REFERENCES schedules(id) ON DELETE CASCADE,\n                    amount NUMERIC(12,2) NOT NULL DEFAULT 0,\n                    note TEXT NULL,\n                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n                )\n                '))
        await conn.execute(text('\n                CREATE TABLE IF NOT EXISTS guide_chat_messages (\n                    id SERIAL PRIMARY KEY,\n                    guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,\n                    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n                    sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n                    message TEXT NOT NULL,\n                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n                )\n                '))
        await conn.execute(text('\n                CREATE TABLE IF NOT EXISTS guide_schedule_reminders (\n                    id SERIAL PRIMARY KEY,\n                    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,\n                    guide_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n                    reminder_type VARCHAR(16) NOT NULL,\n                    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n                    UNIQUE(schedule_id, guide_user_id, reminder_type)\n                )\n                '))

    async def _guide_reminders_worker() -> None:
        while True:
            try:
                async with async_session_maker() as session:
                    await dispatch_guide_schedule_reminders(session)
            except Exception:
                logger.exception('Ошибка фоновой отправки напоминаний гидов')
            await asyncio.sleep(300)
    reminders_task = asyncio.create_task(_guide_reminders_worker())
    try:
        yield
    finally:
        reminders_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminders_task
app = FastAPI(title='Самара Детям API', description='Информационно-сервисная платформа экскурсионного бюро', version='0.1.0', docs_url='/docs', redoc_url='/redoc', openapi_url='/openapi.json', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_origin_regex='https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$', allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.middleware('http')
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    start = time.perf_counter()
    response = await call_next(request)
    response.headers['X-Request-ID'] = request_id
    response.headers['X-Process-Time'] = f'{time.perf_counter() - start:.4f}'
    return response
app.include_router(api_router, prefix='/api/v1')
app.include_router(auth_router, prefix='/api/v1')
app.include_router(events_router, prefix='/api/v1')
app.include_router(schedules_router, prefix='/api/v1')
app.include_router(guides_router, prefix='/api/v1')
app.include_router(reviews_router, prefix='/api/v1')
app.include_router(bookings_router, prefix='/api/v1')
app.include_router(payments_router, prefix='/api/v1')
app.include_router(reports_router, prefix='/api/v1')
