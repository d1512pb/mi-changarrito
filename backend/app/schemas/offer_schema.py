from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Estado = Literal["borrador", "publicada", "agotada", "vencida", "suspendida"]


class Ubicacion(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    direccion: Optional[str] = None


class UpdateOffer(BaseModel):
    """Todos opcionales: solo se actualiza lo que se envía."""
    negocio: Optional[str] = Field(None, min_length=1, max_length=120)
    producto: Optional[str] = Field(None, min_length=1, max_length=120)
    precio_declarado: Optional[float] = Field(None, ge=0)
    unidad: Optional[str] = Field(None, max_length=40)
    horario: Optional[str] = Field(None, max_length=120)
    descripcion: Optional[str] = Field(None, max_length=500)
    ubicacion: Optional[Ubicacion] = None


class PublishOffer(BaseModel):
    """Envía vigencia_horas (más simple) o vigente_hasta (ISO 8601 con zona horaria)."""
    vigencia_horas: Optional[int] = Field(None, ge=1, le=24 * 30)
    vigente_hasta: Optional[datetime] = None


class ReportOffer(BaseModel):
    motivo: str = Field(min_length=3, max_length=300)


class ResponseOffer(BaseModel):
    id: str
    id_merchant: str
    tianguis_id: Optional[str] = None
    tianguis_nombre: Optional[str] = None
    is_demo: bool = False
    negocio: Optional[str] = None
    producto: Optional[str] = None
    precio_declarado: Optional[float] = None
    unidad: Optional[str] = None
    horario: Optional[str] = None
    descripcion: Optional[str] = None
    ubicacion: Optional[Ubicacion] = None
    estado: Estado
    vigente_hasta: Optional[datetime] = None
    confirmado_en: Optional[datetime] = None
    foto_url: Optional[str] = None
    extraction_mode: Optional[str] = None
    campos_faltantes: List[str] = []
    campos_ambiguos: List[str] = []
    motivo_suspension: Optional[str] = None
    creado_en: datetime
    distancia_km: Optional[float] = None
