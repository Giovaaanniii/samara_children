from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
_ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT_DIR / '.env')

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ROOT_DIR / '.env', env_file_encoding='utf-8', extra='ignore')
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    YOOKASSA_SHOP_ID: str
    YOOKASSA_SECRET_KEY: str
    PAYMENT_RETURN_URL: str
    BOOKING_CANCEL_MIN_HOURS_BEFORE_EVENT: int = 24
    BOOKING_ONLINE_REFUND_ENABLED: bool = True
    VK_CLIENT_ID: str
    VK_CLIENT_SECRET: str
    VK_REDIRECT_URI: str
    FRONTEND_URL: str
    CORS_ALLOWED_ORIGINS: str = ''

    @property
    def cors_origins(self) -> list[str]:
        origins: set[str] = set()
        frontend = self.FRONTEND_URL.strip()
        if frontend:
            origins.add(frontend.rstrip('/'))
        for raw in self.CORS_ALLOWED_ORIGINS.split(','):
            origin = raw.strip()
            if origin:
                origins.add(origin.rstrip('/'))
        return sorted(origins)

@lru_cache
def get_settings() -> Settings:
    return Settings()
settings = get_settings()
