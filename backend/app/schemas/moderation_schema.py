from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.offer_schema import ResponseOffer


class SuspendOffer(BaseModel):
    motivo: str = Field(min_length=3, max_length=300)


class ReportItem(BaseModel):
    id_user: str
    motivo: str
    creado_en: str


class ResponseModerationOffer(ResponseOffer):
    reportes: List[ReportItem] = []
    estado_previo: Optional[str] = None
    suspendida_por: Optional[str] = None
