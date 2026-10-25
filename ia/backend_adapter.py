"""Pure adapter from backend's Spanish ResponseOffer to recommendation input.

The backend must supply approved placements and dated sessions. Coordinates,
merchant names and free text never establish tianguis membership or permissions.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime, timedelta
from decimal import Decimal, DecimalException, localcontext
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class BackendAdapterError(ValueError):
    pass


class _Rejected(ValueError):
    pass


def _identifier(value):
    if type(value) is int or isinstance(value, (str, UUID)):
        result = str(value).strip()
        if result and len(result) <= 100:
            return result
    raise _Rejected("invalid_id")


def _aware(value):
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        raise ValueError("Invalid date")
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timezone required")
    return parsed


def _optional_text(value, reason):
    if value is None:
        return None
    if not isinstance(value, str):
        raise _Rejected(reason)
    return value.strip() or None


def _price_cents(value):
    if value is None:
        raise _Rejected("missing_price")
    if type(value) is bool or not isinstance(value, (int, float, str, Decimal)):
        raise _Rejected("invalid_price")
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount < 0:
            raise _Rejected("invalid_price")
        digits = amount.as_tuple()
        if len(digits.digits) > 1000 or abs(digits.exponent) > 1000:
            raise _Rejected("invalid_price")
        with localcontext() as context:
            # Preserve every supplied digit: never round away a sub-cent amount.
            context.prec = max(28, len(digits.digits) + max(0, digits.exponent) + 4)
            cents = amount * 100
            if cents != cents.to_integral_value():
                raise _Rejected("subcent_price")
            # Keep identifiers and money safe for JSON consumers using JS numbers.
            if cents > 9_007_199_254_740_991:
                raise _Rejected("invalid_price")
            return int(cents)
    except DecimalException:
        raise _Rejected("invalid_price") from None


def _mapping(value):
    if isinstance(value, Mapping):
        return value
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        try:
            result = dump(mode="python")
        except (ValueError, TypeError):
            return None
        return result if isinstance(result, Mapping) else None
    return None


def _active_placement(context, merchant, market, as_of, local_zone):
    context = _mapping(context)
    if context is None or context.get("business_active") is not True:
        return None
    try:
        if _identifier(context.get("tianguis_id")) != market:
            return None
        participation = _mapping(context.get("participation"))
        session = _mapping(context.get("session"))
        if participation is None or session is None or participation.get("status") != "approved":
            return None
        if _identifier(participation.get("business_id")) != merchant or _identifier(participation.get("tianguis_id")) != market or _identifier(session.get("tianguis_id")) != market:
            return None
        participation_id, session_id = _identifier(participation.get("id")), _identifier(session.get("id"))
        days = participation.get("weekdays")
        if not isinstance(days, list) or not days or any(type(day) is not int or day not in range(1, 8) for day in days):
            return None
        starts, ends = _aware(session.get("starts_at")), _aware(session.get("ends_at"))
        if not timedelta(0) < ends - starts <= timedelta(days=1) or not starts <= as_of < ends:
            return None
        if starts.astimezone(local_zone).isoweekday() not in days:
            return None
        location_label = _optional_text(participation.get("location_label"), "invalid_location_label")
    except (ValueError, TypeError, OverflowError):
        return None
    safe_participation = {
        "id": participation_id, "business_id": merchant, "tianguis_id": market,
        "status": "approved", "weekdays": sorted(set(days)),
    }
    if "location_label" in participation:
        safe_participation["location_label"] = location_label
    return {
        "business_active": True,
        "participation": safe_participation,
        "session": {"id": session_id, "tianguis_id": market, "starts_at": starts.isoformat(), "ends_at": ends.isoformat()},
    }


def build_recommendation_payload(offers, *, query, tianguis_id, as_of, placements, is_demo, budget_cents=None):
    """Normalize public offers only when one explicit approved placement matches.

    Returns payload, warnings and per-offer rejections. No network, credentials,
    inferred associations or mutations are used. Caller supplies the provenance.
    """
    if not isinstance(offers, list):
        raise BackendAdapterError("offers debe ser una lista.")
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        raise BackendAdapterError("query debe contener entre 1 y 1000 caracteres.")
    if type(is_demo) is not bool:
        raise BackendAdapterError("is_demo debe ser un booleano explícito del llamador.")
    if budget_cents is not None and (type(budget_cents) is not int or not 0 < budget_cents <= 100_000_000):
        raise BackendAdapterError("budget_cents debe ser un entero positivo de centavos dentro del límite del recomendador.")
    try:
        market, instant = _identifier(tianguis_id), _aware(as_of)
        local_zone = ZoneInfo("America/Mexico_City")
    except (ValueError, TypeError, OverflowError, ZoneInfoNotFoundError):
        raise BackendAdapterError("Se requiere tianguis_id, as_of con zona explícita y datos horarios de CDMX.") from None
    if placements is None:
        placements = {}
    if not isinstance(placements, Mapping):
        raise BackendAdapterError("placements debe ser un diccionario por id_merchant.")
    normalized_placements = {}
    for key, contexts in placements.items():
        try:
            merchant = _identifier(key)
        except _Rejected:
            continue
        if isinstance(contexts, list):
            normalized_placements.setdefault(merchant, []).extend(contexts)

    normalized, rejected = [], []
    for raw_offer in offers:
        offer, offer_id = _mapping(raw_offer), None
        try:
            if offer is None:
                raise _Rejected("invalid_offer")
            offer_id = _identifier(offer.get("id"))
            merchant = _identifier(offer.get("id_merchant"))
            state = offer.get("estado")
            if not isinstance(state, str) or state.strip().casefold() != "publicada":
                raise _Rejected("not_published")
            name = offer.get("producto")
            if not isinstance(name, str) or not name.strip():
                raise _Rejected("missing_name")
            try:
                confirmed, valid_until = _aware(offer.get("confirmado_en")), _aware(offer.get("vigente_hasta"))
            except (ValueError, TypeError, OverflowError):
                raise _Rejected("invalid_dates") from None
            if confirmed > instant:
                raise _Rejected("future_confirmation")
            if valid_until <= instant:
                raise _Rejected("expired_offer")
            price = _price_cents(offer.get("precio_declarado"))
            unit = _optional_text(offer.get("unidad"), "invalid_unit")
            schedule = _optional_text(offer.get("horario"), "invalid_schedule")
            category = _optional_text(offer.get("categoria", offer.get("category")), "invalid_category")
            contexts = normalized_placements.get(merchant)
            if not contexts:
                raise _Rejected("missing_placement")
            matching = [value for context in contexts if (value := _active_placement(context, merchant, market, instant, local_zone)) is not None]
            if not matching:
                raise _Rejected("no_active_placement")
            if len(matching) != 1:
                raise _Rejected("ambiguous_placement")
            if len(normalized) >= 100:
                raise _Rejected("recommendation_capacity_exceeded")
            normalized.append({
                "id": offer_id, "business_id": merchant, "tianguis_id": market,
                "name": name.strip(), "category": category, "price_cents": price,
                "currency": "MXN", "unit": unit, "schedule_text": schedule,
                "status": "published", "confirmed_at": confirmed.isoformat(),
                "valid_until": valid_until.isoformat(), "visibility": "public",
                "is_demo": is_demo, **matching[0],
            })
        except _Rejected as error:
            rejected.append({"offer_id": offer_id, "reason": str(error)})
    warnings = []
    if rejected:
        warnings.append(f"Se rechazaron {len(rejected)} ofertas; consulta rejected para conocer las razones.")
    if any(row["reason"] in {"missing_placement", "no_active_placement", "ambiguous_placement"} for row in rejected):
        warnings.append("Se requiere una participación y jornada aprobadas de backend; no se infirieron tianguis a partir de ubicación o texto.")
    if not normalized:
        warnings.append("No hay ofertas adaptadas elegibles; la lista queda vacía sin inventar datos.")
    return {
        "payload": {"query": query.strip(), "tianguis_id": market, "as_of": instant.isoformat(), "budget_cents": budget_cents, "offers": normalized},
        "warnings": warnings,
        "rejected": rejected,
    }
