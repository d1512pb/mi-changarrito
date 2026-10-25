"""Read-only recommendations with deterministic market, session and money checks."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
import json
import re
import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

if __package__:
    from .claude_client import ClaudeAPIError, ClaudeClient, SMOKE_MODEL, load_credentials
else:
    from claude_client import ClaudeAPIError, ClaudeClient, SMOKE_MODEL, load_credentials

MAX_OFFERS = 100
MAX_CANDIDATES = 20


class RecommendationError(ValueError):
    pass


def _aware_datetime(value) -> datetime:
    if not isinstance(value, str):
        raise ValueError("Missing date")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("A timezone offset is required")
    return parsed


def _budget(payload: dict) -> int | None:
    supplied = payload.get("budget_cents")
    if supplied is not None:
        if type(supplied) is not int or supplied <= 0 or supplied > 100_000_000:
            raise RecommendationError("budget_cents debe ser un entero positivo de centavos, dentro del límite de prueba.")
        return supplied
    amounts = re.findall(r"\$\s*(\d+(?:[.,]\d{1,2})?)(?![\d.,])|(?<![\d.,])(\d+(?:[.,]\d{1,2})?)\s*(?:pesos|mxn)\b", payload["query"], flags=re.I)
    values = set()
    try:
        for first, second in amounts:
            values.add(int(Decimal((first or second).replace(",", ".")) * 100))
    except InvalidOperation:
        return None
    if len(values) == 1:
        result = values.pop()
        return result if 0 < result <= 100_000_000 else None
    return None


def _candidate(offer: dict, market: str, now: datetime, local_zone) -> tuple[dict | None, str]:
    if not isinstance(offer, dict):
        return None, "invalid"
    if offer.get("visibility") != "public" or offer.get("business_active") is not True:
        return None, "not_public"
    if offer.get("tianguis_id") != market:
        return None, "other_market"
    if offer.get("status") != "published":
        return None, "not_published"
    participation, session = offer.get("participation"), offer.get("session")
    if not isinstance(participation, dict) or not isinstance(session, dict):
        return None, "missing_session"
    business = offer.get("business_id")
    if not isinstance(business, str) or not business.strip() or len(business) > 100 or participation.get("business_id") != business or participation.get("tianguis_id") != market:
        return None, "invalid_membership"
    if participation.get("status") != "approved" or session.get("tianguis_id") != market:
        return None, "invalid_membership"
    try:
        starts = _aware_datetime(session.get("starts_at"))
        ends = _aware_datetime(session.get("ends_at"))
        confirmed = _aware_datetime(offer.get("confirmed_at"))
        valid_until = _aware_datetime(offer.get("valid_until"))
    except (ValueError, TypeError, OverflowError):
        return None, "invalid_dates"
    if not timedelta(0) < ends - starts <= timedelta(days=1):
        return None, "invalid_dates"
    if not starts <= now < ends or not confirmed <= now < valid_until:
        return None, "inactive_session_or_offer"
    weekdays = participation.get("weekdays")
    if not isinstance(weekdays, list) or not weekdays or any(type(day) is not int or not 1 <= day <= 7 for day in weekdays):
        return None, "invalid_schedule"
    # An overnight session belongs to the local day on which it starts.
    if starts.astimezone(local_zone).isoweekday() not in weekdays:
        return None, "wrong_weekday"
    price = offer.get("price_cents")
    if type(price) is not int or price < 0 or offer.get("currency") != "MXN":
        return None, "unknown_or_invalid_price"
    if not all(isinstance(value, str) and value.strip() and len(value) <= 100 for value in (offer.get("id"), participation.get("id"), session.get("id"))) or not isinstance(offer.get("name"), str) or not offer["name"].strip():
        return None, "invalid"
    if type(offer.get("is_demo")) is not bool:
        return None, "unknown_provenance"
    result = {
        "offer_id": offer["id"], "business_id": business,
        "participation_id": participation["id"], "session_id": session["id"],
        "tianguis_id": market, "name": offer["name"][:160],
        "category": offer["category"][:80] if isinstance(offer.get("category"), str) else None,
        "price_cents": price, "currency": "MXN",
        "unit": offer["unit"][:60] if isinstance(offer.get("unit"), str) else None,
        "location_label": participation["location_label"][:200] if isinstance(participation.get("location_label"), str) else None,
        "confirmed_at": offer["confirmed_at"], "valid_until": offer["valid_until"],
        "is_demo": offer["is_demo"],
    }
    return result, "eligible"


def recommend(payload: dict, *, mode: str = "mock", client=None) -> dict:
    """Backend supplies a trusted clock and public rows; no app writes are possible."""
    if mode not in {"mock", "live"}:
        raise RecommendationError("mode debe ser mock o live.")
    if not isinstance(payload, dict):
        raise RecommendationError("La entrada debe ser un objeto JSON.")
    query, market, offers = payload.get("query"), payload.get("tianguis_id"), payload.get("offers")
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        raise RecommendationError("query debe contener entre 1 y 1000 caracteres.")
    if not isinstance(market, str) or not market.strip() or len(market) > 100:
        raise RecommendationError("Se requiere un tianguis_id válido.")
    if not isinstance(offers, list) or len(offers) > MAX_OFFERS:
        raise RecommendationError("offers debe ser una lista de hasta 100 ofertas públicas.")
    try:
        now = _aware_datetime(payload.get("as_of"))
        local_zone = ZoneInfo("America/Mexico_City")
    except (ValueError, TypeError, OverflowError):
        raise RecommendationError("as_of debe ser una fecha ISO 8601 con zona, proporcionada por backend.") from None
    except ZoneInfoNotFoundError:
        raise RecommendationError("Este Python necesita los datos de zona horaria: instala tzdata.") from None
    budget = _budget(payload)
    result = {
        "schema_version": "recommendation-1.0", "mode": mode,
        "tianguis_id": market, "catalog_as_of": now.isoformat(),
        "budget_cents": budget, "currency": "MXN", "status": "ok",
        "recommendations": [], "message": "", "warnings": [],
        "metrics": {"generation_requests": 0},
    }
    if budget is None:
        result.update(status="needs_clarification", message="¿Cuál es tu presupuesto en pesos? Confírmalo para buscar opciones.")
        return result

    prepared = []
    exclusions = Counter()
    for offer in offers:
        candidate, reason = _candidate(offer, market, now, local_zone)
        if candidate is None:
            exclusions[reason] += 1
        else:
            prepared.append(candidate)
    # Duplicate IDs are ambiguous, so discard every occurrence instead of trusting order.
    counts = Counter(item["offer_id"] for item in prepared)
    eligible = [item for item in prepared if counts[item["offer_id"]] == 1]
    if len(eligible) != len(prepared):
        result["warnings"].append("Se excluyeron identificadores duplicados que requieren revisión.")
    within_budget = sorted((item for item in eligible if item["price_cents"] <= budget), key=lambda item: (item["price_cents"], item["offer_id"]))
    if not within_budget:
        incomplete = any(exclusions[reason] for reason in ("unknown_or_invalid_price", "missing_session", "invalid_dates", "invalid_schedule", "unknown_provenance"))
        result.update(
            status="insufficient_data" if incomplete else "no_match",
            message="Faltan datos confirmados para recomendar dentro del presupuesto." if incomplete else "No encontré ofertas públicas vigentes dentro de ese presupuesto en este tianguis.",
        )
        return result
    candidates = within_budget[:MAX_CANDIDATES]
    if len(within_budget) > MAX_CANDIDATES:
        result["warnings"].append("Se evaluó una selección limitada de ofertas; no todo el catálogo.")
    if mode == "mock":
        selection = {"status": "ok", "selected_offer_ids": [item["offer_id"] for item in candidates[:3]], "clarification": None}
        result["warnings"].append("Selección por reglas para prueba; no se consultó a Claude.")
    else:
        client = client or ClaudeClient(load_credentials(), timeout=45)
        started = time.perf_counter()
        response = client.select_offers(query, budget, candidates)
        result["metrics"] = {
            "generation_requests": 1, "model": response.get("model", SMOKE_MODEL),
            "effort": "high", "latency_ms": round((time.perf_counter() - started) * 1000),
        }
        usage = response.get("usage", {})
        input_tokens, output_tokens = usage.get("input_tokens"), usage.get("output_tokens")
        if all(type(value) is int and value >= 0 for value in (input_tokens, output_tokens)):
            result["metrics"].update(input_tokens=input_tokens, output_tokens=output_tokens,
                estimated_token_cost_usd=round((input_tokens * 0.10 + output_tokens * 0.50) / 1_000_000, 8))
        if response.get("stop_reason") != "end_turn":
            raise RecommendationError("Claude no terminó una respuesta válida; no se muestran recomendaciones parciales.")
        try:
            text = "".join(block.get("text", "") for block in response.get("content", []) if block.get("type") == "text")
            selection = json.loads(text)
        except (ValueError, TypeError, AttributeError):
            raise RecommendationError("La selección de Claude no contiene JSON utilizable.") from None

    if not isinstance(selection, dict) or set(selection) != {"status", "selected_offer_ids", "clarification"}:
        raise RecommendationError("La selección de IA no respeta el contrato.")
    status, ids, clarification = selection["status"], selection["selected_offer_ids"], selection["clarification"]
    if not isinstance(status, str) or status not in {"ok", "no_match", "needs_clarification"} or not isinstance(ids, list) or len(ids) > 3 or any(not isinstance(value, str) for value in ids):
        raise RecommendationError("La selección de IA tiene campos inválidos.")
    if len(ids) != len(set(ids)) or (status == "ok" and not ids) or (status != "ok" and ids):
        raise RecommendationError("La selección de IA contiene opciones duplicadas o inconsistentes.")
    allowed = {item["offer_id"]: item for item in candidates}
    if any(offer_id not in allowed for offer_id in ids):
        raise RecommendationError("La selección de IA referencia una oferta que no es elegible.")
    if clarification is not None and (not isinstance(clarification, str) or len(clarification) > 300):
        raise RecommendationError("La aclaración de IA no respeta el contrato.")
    if status == "needs_clarification":
        result.update(status=status, message=clarification or "Aclara qué tipo de comida u opción necesitas.")
        return result
    if status == "no_match":
        result.update(status=status, message="Las ofertas disponibles no coinciden con lo solicitado. ¿Quieres cambiar tu búsqueda?")
        return result
    for offer_id in ids:
        item = dict(allowed[offer_id])
        item.update(quantity=1, total_cents=item["price_cents"], remaining_cents=budget - item["price_cents"])
        item["explanation"] = f"Una unidad cuesta ${item['price_cents'] / 100:.2f}; te quedan ${item['remaining_cents'] / 100:.2f}."
        result["recommendations"].append(item)
    result["message"] = "Estas son alternativas independientes; sus precios no se suman entre sí."
    if any(item["is_demo"] for item in result["recommendations"]):
        result["warnings"].append("Contiene datos sintéticos de demostración.")
    return result
