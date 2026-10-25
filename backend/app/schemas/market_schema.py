from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.offer_schema import Ubicacion


class MarketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nombre: str = Field(min_length=2, max_length=160)
    ubicacion: Optional[Ubicacion] = None
    horario: Optional[str] = Field(None, max_length=200)
    is_demo: bool = False


class MarketResponse(MarketCreate):
    id: str
    activo: bool = True
    creado_en: datetime


class StallCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    nombre: str = Field(min_length=1, max_length=120)
    nombre_negocio: str = Field(min_length=1, max_length=120)
    ubicacion: Ubicacion
    horario: Optional[str] = Field(None, max_length=120)
    tianguis_id: str = Field(min_length=1)


class StallStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activo: bool
