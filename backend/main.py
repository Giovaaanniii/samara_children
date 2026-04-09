import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import engine
from routers import api_router
from routers.auth import router as auth_router
from routers.events import router as events_router
from routers.schedules import router as schedules_router
from routers.guides import router as guides_router
from routers.reviews import router as reviews_router
from routers.bookings import router as bookings_router
from routers.payments import router as payments_router
from routers.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Подтягивает схему БД без ручного SQL (колонки критериев у reviews)."""
    async with engine.begin() as conn:
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
    yield


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
