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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Подтягивает схему БД без ручного SQL (новые поля/таблицы для текущей версии)."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_enum e
                        JOIN pg_type t ON t.oid = e.enumtypid
                        WHERE t.typname = 'user_role' AND e.enumlabel = 'guide'
                    ) THEN
                        ALTER TYPE user_role ADD VALUE 'guide';
                    END IF;
                END
                $$;
                """,
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS engagement_rating INTEGER",
            ),
        )
        await conn.execute(
            text(
                "UPDATE reviews SET engagement_rating = rating WHERE engagement_rating IS NULL",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE reviews ADD COLUMN IF NOT EXISTS organization_rating INTEGER",
            ),
        )
        await conn.execute(
            text(
                "UPDATE reviews SET organization_rating = rating WHERE organization_rating IS NULL",
            ),
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS guide_id INTEGER UNIQUE REFERENCES guides(id) ON DELETE SET NULL
                """,
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(32)",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_user_id VARCHAR(255)",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS vk_user_id BIGINT",
            ),
        )
        await conn.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_vk_user_id ON users(vk_user_id) WHERE vk_user_id IS NOT NULL",
            ),
        )
        await conn.execute(
            text(
                """
                ALTER TABLE guides
                ADD COLUMN IF NOT EXISTS availability_status VARCHAR(32) DEFAULT 'active'
                """,
            ),
        )
        await conn.execute(
            text(
                "UPDATE guides SET availability_status = 'active' WHERE availability_status IS NULL",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_confirmed_at TIMESTAMPTZ",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_rejected_at TIMESTAMPTZ",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_reject_reason TEXT",
            ),
        )
        await conn.execute(
            text(
                "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS guide_completed_at TIMESTAMPTZ",
            ),
        )
        await conn.execute(
            text(
                """
                ALTER TABLE schedules
                ADD COLUMN IF NOT EXISTS rejected_by_guide_id INTEGER
                REFERENCES guides(id) ON DELETE SET NULL
                """,
            ),
        )
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS guide_salary_events (
                    id SERIAL PRIMARY KEY,
                    guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
                    schedule_id INTEGER NOT NULL UNIQUE REFERENCES schedules(id) ON DELETE CASCADE,
                    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
                    note TEXT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """,
            ),
        )
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS guide_chat_messages (
                    id SERIAL PRIMARY KEY,
                    guide_id INTEGER NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
                    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    message TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """,
            ),
        )
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS guide_schedule_reminders (
                    id SERIAL PRIMARY KEY,
                    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
                    guide_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reminder_type VARCHAR(16) NOT NULL,
                    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE(schedule_id, guide_user_id, reminder_type)
                )
                """,
            ),
        )

    async def _guide_reminders_worker() -> None:
        while True:
            try:
                async with async_session_maker() as session:
                    await dispatch_guide_schedule_reminders(session)
            except Exception:
                logger.exception("Ошибка фоновой отправки напоминаний гидов")
            await asyncio.sleep(300)

    reminders_task = asyncio.create_task(_guide_reminders_worker())
    try:
        yield
    finally:
        reminders_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminders_task


app = FastAPI(
    title="Самара Детям API",
    description="Информационно-сервисная платформа экскурсионного бюро",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# allow_origin_regex — любой порт localhost (Docker :3000, Vite :5173 и т.д.);
# при 500 без заголовков CORS браузер показывает «blocked by CORS», хотя корень — ошибка сервера.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{(time.perf_counter() - start):.4f}"
    return response


app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(schedules_router, prefix="/api/v1")
app.include_router(guides_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
