"""Authenticated, local recommendations over the backend's public catalog.

No provider calls or client-supplied catalog, clock, identity or authorization.
The market-specific IA module stays separate until authoritative placements exist.
"""

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import re
import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.dependencies.deps import get_current_user, get_offer_service
from app.schemas.offer_schema import ResponseOffer
from app.services.offer_service import OfferService


router = APIRouter(prefix="/ai", tags=["Recomendaciones"])


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=1000)
    budget_cents: Optional[int] = Field(None, strict=True, gt=0, le=100_000_000)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    radio: float = Field(3.0, gt=0, le=50)

    @model_validator(mode="after")
    def validate_request(self):
        self.query = self.query.strip()
        if not self.query:
            raise ValueError("Escribe qué producto buscas")
        if (self.lat is None) != (self.lng is None):
            raise ValueError("Envía latitud y longitud juntas")
        return self


def _budget(query: str, supplied: Optional[int]) -> Optional[int]:
    if supplied is not None:
        return supplied
    amounts = re.findall(
        r"\$\s*(\d+(?:[.,]\d{1,2})?)(?![\d.,])|(?<![\d.,])(\d+(?:[.,]\d{1,2})?)\s*(?:pesos|mxn)\b",
        query, flags=re.I,
    )
    values = {int(Decimal((first or second).replace(",", ".")) * 100) for first, second in amounts}
    if len(values) == 1:
        value = values.pop()
        return value if 0 < value <= 100_000_000 else None
    return None


def _tokens(text: str) -> set[str]:
    normalized = "".join(c for c in unicodedata.normalize("NFKD", text.casefold()) if not unicodedata.combining(c))
    return set(re.findall(r"[a-z]+", normalized))


_FILLER = {
    "a", "al", "algo", "alternativas", "barato", "baratos", "buscar", "busca", "busco", "comprar",
    "con", "cuesta", "cuestan", "dame", "de", "del", "el", "en", "encuentra",
    "hasta", "hay", "la", "las", "los", "me", "mi", "mis", "mxn", "opciones", "para", "pesos",
    "por", "presupuesto", "puedo", "que", "quiero", "recomienda", "tengo", "un", "una", "unos", "y",
}


def _confirmed(value):
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime) or value.tzinfo is None:
        return None
    return value


def select_public_offers(rows: list[dict], query: str, budget_cents: Optional[int], *, as_of=None) -> dict:
    """Pure local selection; as_of is supplied only by server code or tests."""
    clock = as_of or datetime.now(timezone.utc)
    budget = _budget(query, budget_cents)
    result = {
        "schema_version": "public-catalog-recommendation-1.0", "mode": "rules", "read_only": True,
        "status": "ok", "answer": "", "message": "", "budget_cents": budget, "currency": "MXN",
        "catalog_as_of": clock.isoformat(), "recommendations": [],
        "warnings": [
            "Selección por coincidencia de palabras y presupuesto; no se consultó a un proveedor de IA.",
            "Se consultó el catálogo público; aún no se verifican participaciones o jornadas de tianguis.",
        ],
        "metrics": {"generation_requests": 0},
    }
    if budget is None:
        result.update(status="needs_clarification", answer="¿Cuál es tu presupuesto en pesos? Por ejemplo: tengo $100 para mango.")
        result["message"] = result["answer"]
        return result
    wanted = _tokens(query) - _FILLER
    candidates = []
    seen = set()
    for row in rows:
        if row.get("estado") != "publicada":
            continue
        confirmed, expires = _confirmed(row.get("confirmado_en")), _confirmed(row.get("vigente_hasta"))
        if confirmed is None or expires is None or not confirmed <= clock < expires:
            continue
        if not isinstance(row.get("producto"), str) or not row["producto"].strip():
            continue
        price = row.get("precio_declarado")
        if price is None or isinstance(price, bool):
            continue
        try:
            cents = Decimal(str(price)) * 100
            if not cents.is_finite() or cents != cents.to_integral_value() or not 0 <= cents <= budget:
                continue
        except (InvalidOperation, ValueError, TypeError):
            continue
        haystack = _tokens(" ".join(str(row.get(key) or "") for key in ("producto", "negocio", "descripcion")))
        if wanted and not wanted.issubset(haystack):
            continue
        identifier = row.get("id")
        if not isinstance(identifier, str) or not identifier or identifier in seen:
            continue
        seen.add(identifier)
        # ResponseOffer strips private capture text, reports and moderation identities.
        public = ResponseOffer.model_validate(row).model_dump(mode="json")
        public.update(offer_id=identifier, name=row["producto"], price_cents=int(cents), currency="MXN",
                      quantity=1, total_cents=int(cents), remaining_cents=budget - int(cents))
        candidates.append(public)
    candidates.sort(key=lambda row: (row["price_cents"], row["id"]))
    result["recommendations"] = candidates[:3]
    if result["recommendations"]:
        result["answer"] = "Estas son alternativas independientes dentro de tu presupuesto, para una unidad de cada producto. Confirma la disponibilidad con el comercio."
    else:
        result.update(status="no_match", answer="No encontré ofertas publicadas, vigentes y con precio confirmado que coincidan. Prueba otro producto o presupuesto.")
    result["message"] = result["answer"]
    return result


@router.get("/status")
async def status():
    return {"status": "ok", "extraction_mode": "mock", "recommendation_mode": "rules",
            "provider_requests": False, "administrative_analytics_connected": False}


@router.post("/recommend")
async def recommendation(
    request: RecommendationRequest,
    _: dict = Depends(get_current_user),
    service: OfferService = Depends(get_offer_service),
):
    rows = await service.search(None, request.lat, request.lng, request.radio, 100)
    active_rows = []
    for row in rows:
        merchant = await service.db.user.get(row.get("id_merchant"))
        if merchant and merchant.get("activo", True):
            active_rows.append(row)
    result = select_public_offers(active_rows, request.query, request.budget_cents)
    if len(rows) == 100:
        result["warnings"].append("La consulta está limitada a las primeras 100 ofertas públicas.")
    return result
