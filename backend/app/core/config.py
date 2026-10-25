from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    ENVIRONMENT: str = "development"
    SESSION_SECRET: str = "dev-secret-cambia-esto"
    MAX_SESSIONS_PER_USER: int = 3
    SESSION_TTL_DAYS: int = 7
    BCRYPT_ROUNDS: int = 12
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:4321"
    SEED_ON_START: bool = False
    DATABASE_URL: Optional[str] = None
    UPLOADS_DIR: str = "uploads"
    MAX_PHOTO_MB: int = Field(5, ge=1, le=20)
    S3_ENDPOINT: Optional[str] = None
    S3_BUCKET: Optional[str] = None
    S3_REGION: str = "auto"
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_FORCE_PATH_STYLE: bool = False
    S3_URL_TTL_SECONDS: int = Field(300, ge=60, le=3600)
    PRO_EMAIL: Optional[str] = None
    PRO_PASSWORD: Optional[str] = None

    @property
    def CORS_ORIGIN(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def s3_enabled(self) -> bool:
        return all((self.S3_ENDPOINT, self.S3_BUCKET, self.S3_ACCESS_KEY_ID, self.S3_SECRET_ACCESS_KEY))

    def validate_startup(self) -> None:
        s3_values = (self.S3_ENDPOINT, self.S3_BUCKET, self.S3_ACCESS_KEY_ID, self.S3_SECRET_ACCESS_KEY)
        if any(s3_values) and not all(s3_values):
            raise RuntimeError("La configuración S3 está incompleta")
        if self.DATABASE_URL and self.SEED_ON_START:
            raise RuntimeError("No se permite SEED_ON_START con una base de datos persistente")
        if self.ENVIRONMENT.lower() != "production":
            return
        if self.SESSION_SECRET == "dev-secret-cambia-esto" or len(self.SESSION_SECRET) < 32:
            raise RuntimeError("Define un SESSION_SECRET de al menos 32 caracteres en production")
        if self.SEED_ON_START:
            raise RuntimeError("SEED_ON_START debe ser false en production")
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL es obligatoria en production")
        if not self.s3_enabled:
            raise RuntimeError("Configura el almacenamiento S3 en production")
        if bool(self.PRO_EMAIL) != bool(self.PRO_PASSWORD):
            raise RuntimeError("Configura PRO_EMAIL y PRO_PASSWORD juntos")
        if self.PRO_PASSWORD and (len(self.PRO_PASSWORD) < 12 or len(self.PRO_PASSWORD.encode("utf-8")) > 72):
            raise RuntimeError("PRO_PASSWORD debe tener al menos 12 caracteres y como máximo 72 bytes")


settings = Settings()
