from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parent.parent
_BACKEND_DIR = Path(__file__).resolve().parent

load_dotenv(_ROOT_DIR / ".env")
load_dotenv(_BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            _ROOT_DIR / ".env",
            _BACKEND_DIR / ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    SENDGRID_API_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""
    EMAIL_FROM: str = ""

    @property
    def cors_origins(self) -> list[str]:
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        origins = {
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            frontend,
        }
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
