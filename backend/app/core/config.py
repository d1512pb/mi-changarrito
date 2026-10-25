from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    ENVIRONMENT: str = "development"
    SESSION_SECRET: str = "dev-secret-cambia-esto"
    MAX_SESSIONS_PER_USER: int = 3
    SESSION_TTL_DAYS: int = 7
    BCRYPT_ROUNDS: int = 12
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:4321"
    SEED_ON_START: bool = True
    UPLOADS_DIR: str = "uploads"
    MAX_PHOTO_MB: int = 5
    PRO_EMAIL: Optional[str] = None
    PRO_PASSWORD: Optional[str] = None

    @property
    def CORS_ORIGIN(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
