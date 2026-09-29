from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_name: str = "IndoWings Fleet Management API"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 4000
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "indowings_fleet"
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    payment_provider: str = ""
    payment_key_id: str = ""
    payment_key_secret: str = ""
    payment_webhook_secret: str = ""
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    model_config = SettingsConfigDict(env_file=BACKEND_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def jwt_secret_configured(self) -> bool:
        secret = self.jwt_secret_key.strip()
        return len(secret.encode("utf-8")) >= 32 and not secret.lower().startswith("replace-")


@lru_cache
def get_settings() -> Settings:
    return Settings()