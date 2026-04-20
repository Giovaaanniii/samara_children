from __future__ import annotations

import sys
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import get_db  # noqa: E402
from main import app  # noqa: E402
from models import Base  # noqa: E402
from services.redis_client import get_redis  # noqa: E402

TEST_DB_URL = "sqlite+aiosqlite:///./tests/test_api.db"

test_engine = create_async_engine(TEST_DB_URL, future=True)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class FakeRedis:
    def __init__(self) -> None:
        self._storage: dict[str, str] = {}

    async def get(self, key: str):
        return self._storage.get(key)

    async def set(self, key: str, value, nx: bool = False, ex: int | None = None):
        if nx and key in self._storage:
            return None
        self._storage[key] = str(value)
        return True

    async def decrby(self, key: str, value: int):
        current = int(self._storage.get(key, "0"))
        current -= value
        self._storage[key] = str(current)
        return current

    async def incrby(self, key: str, value: int):
        current = int(self._storage.get(key, "0"))
        current += value
        self._storage[key] = str(current)
        return current

    async def delete(self, key: str):
        self._storage.pop(key, None)
        return 1


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    fake_redis = FakeRedis()

    async def override_get_redis():
        return fake_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()

