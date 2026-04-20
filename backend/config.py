from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parent.parent

load_dotenv(_ROOT_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    # URL возврата пользователя после оплаты (redirect)
    PAYMENT_RETURN_URL: str
    # Отмена: не позже чем за N часов до начала сеанса
    BOOKING_CANCEL_MIN_HOURS_BEFORE_EVENT: int = 24
    # Автовозврат на карту через ЮKassa при отмене оплаченного бронирования
    BOOKING_ONLINE_REFUND_ENABLED: bool = True
    SENDGRID_API_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""
    EMAIL_FROM: str = ""
    # Публичный URL фронтенда (ссылки в письмах, QR, CORS)
    FRONTEND_URL: str
    # Явный список Origins для CORS через запятую (например http://localhost:3000,http://127.0.0.1:3000)
    CORS_ALLOWED_ORIGINS: str = ""

    @property
    def cors_origins(self) -> list[str]:
        origins: set[str] = set()
        frontend = self.FRONTEND_URL.strip()
        if frontend:
            origins.add(frontend.rstrip("/"))
        for raw in self.CORS_ALLOWED_ORIGINS.split(","):
            origin = raw.strip()
            if origin:
                origins.add(origin.rstrip("/"))
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
