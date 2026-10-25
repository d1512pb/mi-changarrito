"""Scoped, read-only institutional analytics; all arithmetic is deterministic."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import math
import re
import unicodedata
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class AdminAnalyticsError(ValueError):
    pass


ACTION_PERMISSIONS = {
    "overview": "analytics:read", "map": "analytics:read",
    "composition": "analytics:read", "coverage": "analytics:read",
    "prices": "prices:read", "attendance": "attendance:read",
    "reports": "reports:read", "managers": "managers:read",
}
FILTER_KEYS = {"period", "borough", "tianguis_ids", "category", "article_id", "date"}


def _norm(value):
    return "".join(c for c in unicodedata.normalize("NFKD", str(value).strip().casefold()) if not unicodedata.combining(c))


def _date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Invalid date")
    return date.fromisoformat(value)


def _datetime(value):
    if not isinstance(value, str):
        raise ValueError("Invalid timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timezone required")
    return parsed


def _number(value, places="0.01"):
    rounded = value.quantize(Decimal(places), rounding=ROUND_HALF_UP)
    return int(rounded) if rounded == rounded.to_integral_value() else float(rounded)


def _percentage(part, total):
    return _number(Decimal(part) * 100 / Decimal(total)) if total else None


def _median(values):
    ordered = sorted(values)
    mid = len(ordered) // 2
    return ordered[mid] if len(ordered) % 2 else (ordered[mid - 1] + ordered[mid]) / 2


def _list(snapshot, key):
    value = snapshot.get(key, [])
    if not isinstance(value, list) or len(value) > 100_000 or any(not isinstance(row, dict) for row in value):
        raise AdminAnalyticsError(f"{key} debe ser una lista acotada de objetos.")
    return value


def _authorize(authorization):
    if not isinstance(authorization, dict) or authorization.get("role") != "admin":
        raise AdminAnalyticsError("Se requiere un contexto administrativo autorizado por backend.")
    if not isinstance(authorization.get("actor_id"), str) or not authorization["actor_id"].strip():
        raise AdminAnalyticsError("El contexto autorizado necesita actor_id.")
    allowed, permissions = authorization.get("allowed_tianguis_ids"), authorization.get("permissions")
    if not isinstance(allowed, list) or any(not isinstance(value, str) or not value for value in allowed):
        raise AdminAnalyticsError("Se requiere una lista explícita de tianguis autorizados.")
    if not isinstance(permissions, list) or any(not isinstance(value, str) for value in permissions):
        raise AdminAnalyticsError("Se requiere una lista explícita de permisos.")
    return set(allowed), set(permissions)


def _prepare(snapshot, filters, authorization, action):
    allowed, permissions = _authorize(authorization)
    if action not in ACTION_PERMISSIONS or ACTION_PERMISSIONS[action] not in permissions:
        raise AdminAnalyticsError("La acción solicitada no está autorizada.")
    if not isinstance(snapshot, dict) or not isinstance(filters, dict):
        raise AdminAnalyticsError("snapshot y filtros deben ser objetos JSON.")
    if set(filters) - FILTER_KEYS:
        raise AdminAnalyticsError("Hay filtros no reconocidos.")
    if not isinstance(snapshot.get("snapshot_id"), str) or type(snapshot.get("is_demo")) is not bool:
        raise AdminAnalyticsError("El snapshot necesita identificador y procedencia explícita.")
    try:
        as_of = _datetime(snapshot.get("as_of"))
        local_date = as_of.astimezone(ZoneInfo("America/Mexico_City")).date()
    except (ValueError, TypeError, ZoneInfoNotFoundError):
        raise AdminAnalyticsError("as_of necesita zona explícita y datos horarios de America/Mexico_City.") from None
    period = filters.get("period") or snapshot.get("period")
    try:
        if not isinstance(period, str) or not re.fullmatch(r"\d{4}-\d{2}", period):
            raise ValueError()
        _date(period + "-01")
    except ValueError:
        raise AdminAnalyticsError("period debe ser un mes válido YYYY-MM.") from None
    requested = filters.get("tianguis_ids", [])
    if not isinstance(requested, list) or any(not isinstance(item, str) or not item for item in requested):
        raise AdminAnalyticsError("tianguis_ids debe ser una lista de identificadores.")
    if set(requested) - allowed:
        raise AdminAnalyticsError("El filtro solicita tianguis fuera del alcance autorizado.")
    normalized = {"period": period, "borough": filters.get("borough"), "tianguis_ids": sorted(set(requested)),
                  "category": filters.get("category"), "article_id": filters.get("article_id"), "date": filters.get("date")}
    for key in ("borough", "category", "article_id"):
        if normalized[key] is not None and (not isinstance(normalized[key], str) or not normalized[key].strip() or len(normalized[key]) > 200):
            raise AdminAnalyticsError(f"{key} debe ser texto o null.")
    if normalized["date"] is not None:
        try:
            chosen = _date(normalized["date"])
        except (ValueError, TypeError):
            raise AdminAnalyticsError("date debe ser una fecha válida YYYY-MM-DD.") from None
        if chosen.strftime("%Y-%m") != period:
            raise AdminAnalyticsError("date debe pertenecer al periodo elegido.")
        if chosen > local_date:
            raise AdminAnalyticsError("No se puede consultar asistencia o precios futuros como observados.")
    markets = [row for row in _list(snapshot, "tianguis") if row.get("id") in allowed and (not requested or row.get("id") in requested)]
    if normalized["borough"]:
        markets = [row for row in markets if _norm(row.get("borough", "")) == _norm(normalized["borough"])]
    ids = {row["id"] for row in markets}
    parts = [row for row in _list(snapshot, "participations") if row.get("tianguis_id") in ids and row.get("status") == "approved"]
    business_ids = {row.get("business_id") for row in parts}
    businesses = {row.get("id"): row for row in _list(snapshot, "businesses") if row.get("id") in business_ids}
    parts = [row for row in parts if row.get("business_id") in businesses]
    managers = {}
    if "managers:read" in permissions:
        manager_ids = {row.get("manager_id") for row in markets}
        managers = {row.get("id"): row for row in _list(snapshot, "managers") if row.get("id") in manager_ids}
    warnings = ["Datos sintéticos de demostración; no se recibió ni leyó un PDF mensual real."] if snapshot["is_demo"] else []
    if period > local_date.strftime("%Y-%m"):
        warnings.append("El periodo elegido es futuro; no se presenta como información observada.")
    if period != local_date.strftime("%Y-%m"):
        warnings.append("El padrón y las ubicaciones corresponden al corte del snapshot; el periodo filtra precios, jornadas y entregas, no reconstruye un padrón histórico.")
    if normalized["article_id"] and action not in {"prices", "coverage"}:
        warnings.append("El filtro de artículo se aplica a precios y cobertura; no se usa para inferir asistencia, entregas o cambios del padrón.")
    if normalized["category"] and action in {"attendance", "reports", "managers"}:
        warnings.append("El pase de lista, las entregas y la asignación de gerentes dependen del tianguis y periodo, no de la categoría de sus productos.")
    return {"snapshot": snapshot, "filters": normalized, "as_of": as_of, "date": local_date,
            "markets": markets, "market_ids": ids, "market_lookup": {row["id"]: row for row in markets},
            "parts": parts, "businesses": businesses, "managers": managers,
            "permissions": permissions, "warnings": warnings}


def _members(ctx, tianguis_id=None):
    result = [row for row in ctx["parts"] if tianguis_id is None or row.get("tianguis_id") == tianguis_id]
    category = ctx["filters"]["category"]
    return [row for row in result if not category or _norm(ctx["businesses"][row["business_id"]].get("category", "")) == _norm(category)]


def _manager_fields(ctx, market):
    if "managers:read" not in ctx["permissions"]:
        return {}
    manager = ctx["managers"].get(market.get("manager_id"), {})
    return {"manager_id": market.get("manager_id"), "manager_name": manager.get("name")}


def _source_ids(*rows):
    return sorted({row["source_id"] for row in rows if isinstance(row.get("source_id"), str)})


def _finish(ctx, action, metrics=None, rows=None, charts=None, map_points=None):
    rows = rows or []
    used = {source for row in rows for source in row.get("source_ids", [])}
    used.update(market["source_id"] for market in ctx["markets"] if isinstance(market.get("source_id"), str))
    sources = []
    for source in _list(ctx["snapshot"], "sources"):
        if source.get("id") in used:
            sources.append({key: source[key] for key in ("id", "label", "kind", "period", "is_demo", "page_count", "note") if key in source})
    if used - {source.get("id") for source in sources}:
        ctx["warnings"].append("Algunas referencias no tienen metadatos de fuente en este snapshot.")
    if not ctx["markets"]:
        ctx["warnings"].append("No hay tianguis dentro del alcance y filtros seleccionados.")
    return {"schema_version": "admin-analytics-1.0", "is_demo": ctx["snapshot"]["is_demo"],
            "snapshot_id": ctx["snapshot"]["snapshot_id"], "action": action,
            "filters": ctx["filters"], "metrics": metrics or {}, "rows": rows,
            "charts": charts or [], "map_points": map_points or [], "sources": sources,
            "warnings": list(dict.fromkeys(ctx["warnings"]))}


def _overview(ctx):
    rows = []
    for market in ctx["markets"]:
        parts = _members(ctx, market["id"])
        unique = {row["business_id"] for row in parts}
        counts = Counter(ctx["businesses"][business].get("category") or "sin_categoria" for business in unique)
        primary = sorted(counts, key=lambda category: (-counts[category], category))[0] if counts else None
        rows.append({"tianguis_id": market["id"], "tianguis_name": market.get("name"), "borough": market.get("borough"),
                     "unique_businesses": len(unique), "approved_participations": len(parts),
                     "primary_category": primary, "primary_category_count": counts.get(primary, 0),
                     "source_ids": _source_ids(market, *parts), **_manager_fields(ctx, market)})
    parts = _members(ctx)
    metrics = {"tianguis_count": len(ctx["markets"]), "unique_businesses": len({row["business_id"] for row in parts}),
               "approved_participations": len(parts), "manager_count": len({row.get("manager_id") for row in ctx["markets"] if row.get("manager_id")})}
    charts = [{"type": "bar", "title": "Changarritos únicos por tianguis dentro del filtro",
               "x_label": "Tianguis", "y_label": "Changarritos únicos (cantidad)",
               "data": [{"tianguis": row["tianguis_name"], "business_count": row["unique_businesses"]} for row in rows]}] if rows else []
    return _finish(ctx, "overview", metrics, rows, charts)


def _map(ctx):
    overview = _overview(ctx)
    points = []
    for row in overview["rows"]:
        market = ctx["market_lookup"][row["tianguis_id"]]
        lat, lng = market.get("lat"), market.get("lng")
        if type(lat) not in (int, float) or type(lng) not in (int, float) or not math.isfinite(lat) or not math.isfinite(lng) or not -90 <= lat <= 90 or not -180 <= lng <= 180:
            continue
        points.append({**row, "lat": lat, "lng": lng})
    missing = len(ctx["markets"]) - len(points)
    if missing:
        ctx["warnings"].append(f"{missing} tianguis sin coordenadas válidas; no se inventaron puntos.")
    return _finish(ctx, "map", {"located_tianguis": len(points), "missing_coordinates": missing}, overview["rows"], map_points=points)


def _composition(ctx):
    rows = []
    for market in ctx["markets"]:
        parts = _members(ctx, market["id"])
        categories = defaultdict(set)
        for part in parts:
            categories[ctx["businesses"][part["business_id"]].get("category") or "sin_categoria"].add(part["business_id"])
        denominator = len({part["business_id"] for part in parts})
        for category, businesses in sorted(categories.items()):
            matching = [part for part in parts if part["business_id"] in businesses]
            rows.append({"tianguis_id": market["id"], "tianguis_name": market.get("name"), "category": category,
                         "business_count": len(businesses), "participation_count": len(matching),
                         "denominator_businesses": denominator, "share_percent": _percentage(len(businesses), denominator),
                         "source_ids": _source_ids(market, *matching)})
    charts = [{"type": "bar", "title": "Composición de changarritos por categoría dentro del filtro",
               "x_label": "Tianguis y categoría", "y_label": "Changarritos únicos (cantidad)",
               "data": [{"tianguis": row["tianguis_name"], "category": row["category"], "business_count": row["business_count"]} for row in rows]}] if rows else []
    return _finish(ctx, "composition", {"category_count": len({row["category"] for row in rows}), "denominator": "changarritos únicos por tianguis dentro del filtro"}, rows, charts)


def _price_samples(ctx):
    valid_parts = {(part.get("id"), part.get("business_id"), part.get("tianguis_id")) for part in ctx["parts"]}
    candidates = defaultdict(list)
    raw_counts = Counter()
    excluded = Counter()
    sources = {source.get("id"): source for source in _list(ctx["snapshot"], "sources") if isinstance(source.get("id"), str)}
    for row in _list(ctx["snapshot"], "price_observations"):
        market_id = row.get("tianguis_id")
        if market_id not in ctx["market_ids"]:
            continue
        if (row.get("participation_id"), row.get("business_id"), market_id) not in valid_parts:
            excluded["sin participación aprobada"] += 1
            continue
        if ctx["filters"]["category"] and _norm(row.get("category", "")) != _norm(ctx["filters"]["category"]):
            continue
        if ctx["filters"]["article_id"] and row.get("article_id") != ctx["filters"]["article_id"]:
            continue
        try:
            observed = _date(row.get("observed_on"))
        except (ValueError, TypeError):
            excluded["fecha inválida"] += 1
            continue
        if observed > ctx["date"]:
            excluded["fechas futuras"] += 1
            continue
        if observed.strftime("%Y-%m") != ctx["filters"]["period"] or (ctx["filters"]["date"] and row["observed_on"] != ctx["filters"]["date"]):
            continue
        raw_counts[market_id] += 1
        source = sources.get(row.get("source_id"))
        page = row.get("page")
        if not source or (page is not None and (type(page) is not int or page < 1)) or (type(source.get("page_count")) is int and (type(page) is not int or page > source["page_count"])):
            excluded["fuente o página insuficiente"] += 1
            continue
        try:
            price = row.get("price_cents")
            if type(price) is not int or price < 0 or row.get("confirmed") is not True:
                raise ValueError()
            quantity = row.get("quantity")
            if type(quantity) not in (int, float, str):
                raise ValueError()
            quantity = Decimal(str(quantity))
            if not quantity.is_finite() or quantity <= 0 or not -12 <= quantity.adjusted() <= 12:
                raise ValueError()
            unit = row.get("unit")
            if not isinstance(unit, str) or not unit.strip():
                raise ValueError()
            unit = _norm(unit)
            base_unit, factor = {"kg": ("kg", Decimal(1)), "g": ("kg", Decimal("0.001")), "l": ("l", Decimal(1)), "ml": ("l", Decimal("0.001"))}.get(unit, (unit, Decimal(1)))
            currency = row.get("currency")
            if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
                raise ValueError()
            if not isinstance(row.get("article_id"), str) or not row["article_id"] or not isinstance(row.get("variant"), str):
                raise ValueError()
            normalized = Decimal(price) / (quantity * factor)
        except (ValueError, TypeError, InvalidOperation, ZeroDivisionError):
            excluded["precio, unidad o confirmación insuficiente"] += 1
            continue
        key = (market_id, row["business_id"], row["article_id"], _norm(row["variant"]), base_unit, currency)
        candidates[key].append({"row": row, "observed": observed, "normalized": normalized, "unit": base_unit})
    latest = []
    for samples in candidates.values():
        newest = max(sample["observed"] for sample in samples)
        tied = [sample for sample in samples if sample["observed"] == newest]
        if len({sample["normalized"] for sample in tied}) > 1:
            excluded["último precio ambiguo en la misma fecha"] += len(tied)
            continue
        latest.append(sorted(tied, key=lambda sample: str(sample["row"].get("id", "")))[-1])
    for reason, count in sorted(excluded.items()):
        ctx["warnings"].append(f"Se excluyeron {count} registros de precios: {reason}.")
    return latest, raw_counts


def _prices(ctx):
    samples, raw_counts = _price_samples(ctx)
    groups = defaultdict(list)
    for sample in samples:
        row = sample["row"]
        groups[(row["article_id"], _norm(row["variant"]), sample["unit"], row["currency"])].append(sample)
    rows, charts = [], []
    comparable_groups = 0
    for group, all_samples in sorted(groups.items()):
        by_market = defaultdict(list)
        for sample in all_samples:
            by_market[sample["row"]["tianguis_id"]].append(sample)
        medians = {market_id: _median([sample["normalized"] for sample in values]) for market_id, values in by_market.items()}
        spread = max(medians.values()) - min(medians.values()) if len(medians) >= 2 else None
        baseline = min(medians.values())
        if len(medians) >= 2:
            comparable_groups += 1
        article_name = all_samples[0]["row"].get("article_name", group[0])
        chart_data = []
        for market_id, values in sorted(by_market.items()):
            source_rows = [sample["row"] for sample in values]
            market = ctx["market_lookup"][market_id]
            prices = [sample["normalized"] for sample in values]
            entry = {"article_id": group[0], "article_name": article_name, "variant": group[1], "unit": group[2], "currency": group[3],
                     "tianguis_id": market_id, "tianguis_name": market.get("name"), "n_samples": len(values),
                     "n_businesses": len({row["business_id"] for row in source_rows}), "median_price_cents": _number(medians[market_id]),
                     "min_price_cents": _number(min(prices)), "max_price_cents": _number(max(prices)),
                     "spread_market_medians_cents": _number(spread) if spread is not None else None,
                     "spread_market_medians_percent": _number(spread * 100 / baseline) if spread is not None and baseline > 0 else None,
                     "source_ids": _source_ids(*source_rows),
                     "references": [{"observation_id": row.get("id"), "source_id": row.get("source_id"), "page": row.get("page"), "observed_on": row["observed_on"]} for row in source_rows]}
            rows.append(entry)
            chart_data.append({"tianguis": market.get("name"), "median_price": _number(medians[market_id] / 100), "n_samples": len(values)})
        charts.append({"type": "bar", "title": f"Precio mediano: {article_name}, {group[1]} ({ctx['filters']['period']})",
                       "x_label": "Tianguis", "y_label": f"Precio mediano ({group[3]}/{group[2]})", "data": chart_data})
    ctx["warnings"].append("Comparaciones descriptivas por artículo, variante, unidad y moneda; no se promedian categorías heterogéneas ni se infieren causas.")
    return _finish(ctx, "prices", {"price_records": sum(raw_counts.values()), "normalized_samples": len(samples), "article_groups": len(groups), "comparable_groups": comparable_groups,
                                   "sample_policy": "última observación confirmada por negocio-tianguis-artículo-variante-unidad-moneda del periodo"}, rows, charts)


def _attendance(ctx):
    rows = []
    records = [row for row in _list(ctx["snapshot"], "attendance") if row.get("tianguis_id") in ctx["market_ids"]]
    for market in ctx["markets"]:
        if not isinstance(market.get("manager_id"), str) or not market["manager_id"]:
            ctx["warnings"].append(f"Sin gerente esperado para {market.get('name', market['id'])}; no se inventa una asignación.")
            continue
        scheduled = market.get("scheduled_dates")
        if not isinstance(scheduled, list):
            ctx["warnings"].append(f"Sin calendario explícito para {market.get('name', market['id'])}; no se infiere asistencia.")
            continue
        dates = set()
        for value in scheduled:
            try:
                day = _date(value)
            except (ValueError, TypeError):
                continue
            if day <= ctx["date"] and day.strftime("%Y-%m") == ctx["filters"]["period"] and (not ctx["filters"]["date"] or value == ctx["filters"]["date"]):
                dates.add(value)
        for day in sorted(dates):
            matches = [row for row in records if row.get("tianguis_id") == market["id"] and row.get("manager_id") == market.get("manager_id") and row.get("date") == day]
            statuses = {row.get("status") for row in matches if isinstance(row.get("status"), str)}
            status = next(iter(statuses)) if len(statuses) == 1 and statuses <= {"present", "absent", "unreported"} else "unreported"
            if len(statuses) > 1 or any(row.get("status") not in ("present", "absent", "unreported") for row in matches):
                status = "unreported"
                ctx["warnings"].append("Hay registros de asistencia contradictorios; se dejan pendientes de revisión.")
            rows.append({"tianguis_id": market["id"], "tianguis_name": market.get("name"), "date": day, "status": status,
                         "source_ids": _source_ids(market, *matches), **_manager_fields(ctx, market)})
    counts = Counter(row["status"] for row in rows)
    metrics = {"expected_manager_sessions": len(rows), "present": counts["present"], "explicit_absent": counts["absent"], "unreported": counts["unreported"],
               "attendance_percent_of_expected": _percentage(counts["present"], len(rows))}
    ctx["warnings"].append("La asistencia usa sólo jornadas programadas y registros explícitos. Pendiente no equivale a ausencia ni a falta de entrega mensual.")
    chart = [{"type": "bar", "title": "Pase de lista de gerentes en jornadas programadas", "x_label": "Estado de asistencia", "y_label": "Jornadas de gerente (cantidad)",
              "data": [{"status": status, "count": counts[status]} for status in ("present", "absent", "unreported")]}] if rows else []
    return _finish(ctx, "attendance", metrics, rows, chart)


def _reports(ctx):
    rows = []
    candidates = [row for row in _list(ctx["snapshot"], "monthly_reports") if row.get("tianguis_id") in ctx["market_ids"] and row.get("period") == ctx["filters"]["period"]]
    for market in ctx["markets"]:
        matches = [row for row in candidates if row.get("tianguis_id") == market["id"] and row.get("manager_id") == market.get("manager_id")]
        if len(matches) > 1:
            ctx["warnings"].append("Hay más de un registro de entrega para el mismo gerente, tianguis y mes; requiere conciliación.")
        report = matches[0] if len(matches) == 1 else {}
        status, submitted, due = "unreported", None, report.get("due_on")
        if report:
            try:
                due_date = _date(due)
            except (ValueError, TypeError):
                due_date = None
            status = "overdue" if due_date and due_date < ctx["date"] else "pending"
            if report.get("submitted_at"):
                try:
                    submitted_at = _datetime(report["submitted_at"])
                    if submitted_at <= ctx["as_of"]:
                        status, submitted = "submitted", report["submitted_at"]
                    else:
                        ctx["warnings"].append("Una entrega con fecha futura no se considera recibida.")
                except (ValueError, TypeError):
                    ctx["warnings"].append("Una entrega tiene fecha inválida y requiere revisión.")
        rows.append({"tianguis_id": market["id"], "tianguis_name": market.get("name"), "period": ctx["filters"]["period"],
                     "status": status, "due_on": due, "submitted_at": submitted,
                     "source_ids": _source_ids(market, *matches), **_manager_fields(ctx, market)})
    counts = Counter(row["status"] for row in rows)
    metrics = {"expected_monthly_reports": len(rows), "submitted": counts["submitted"], "pending": counts["pending"], "overdue": counts["overdue"], "unreported": counts["unreported"]}
    return _finish(ctx, "reports", metrics, rows, [{"type": "bar", "title": "Entregas del reporte mensual", "x_label": "Estado de entrega", "y_label": "Reportes (cantidad)",
                  "data": [{"status": status, "count": counts[status]} for status in ("submitted", "pending", "overdue", "unreported")]}] if rows else [])


def _managers(ctx):
    rows = [{"tianguis_id": market["id"], "tianguis_name": market.get("name"), "borough": market.get("borough"),
             "source_ids": _source_ids(market), **_manager_fields(ctx, market)} for market in ctx["markets"]]
    return _finish(ctx, "managers", {"manager_count": len({row["manager_id"] for row in rows if row.get("manager_id")}), "assignments": len(rows)}, rows)


def _coverage(ctx):
    samples, raw_counts = _price_samples(ctx)
    counts = Counter(sample["row"]["tianguis_id"] for sample in samples)
    rows = []
    for market in ctx["markets"]:
        lat, lng = market.get("lat"), market.get("lng")
        located = type(lat) in (int, float) and type(lng) in (int, float) and math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180
        market_samples = [sample["row"] for sample in samples if sample["row"]["tianguis_id"] == market["id"]]
        rows.append({"tianguis_id": market["id"], "tianguis_name": market.get("name"), "price_records": raw_counts[market["id"]],
                     "normalized_price_samples": counts[market["id"]], "unique_articles": len({row["article_id"] for row in market_samples}),
                     "has_coordinates": bool(located), "source_ids": _source_ids(market, *market_samples)})
    return _finish(ctx, "coverage", {"tianguis_count": len(rows), "located_tianguis": sum(row["has_coordinates"] for row in rows),
                                     "price_records": sum(raw_counts.values()), "normalized_price_samples": len(samples)}, rows)


def analyze(snapshot, plan, authorization):
    """Execute an allowlisted analytical action after scope and permission checks."""
    if not isinstance(plan, dict):
        raise AdminAnalyticsError("plan debe ser un objeto JSON.")
    action = plan.get("action")
    if not isinstance(action, str) or action not in ACTION_PERMISSIONS:
        raise AdminAnalyticsError("Acción analítica no reconocida.")
    filters = {key: value for key, value in plan.items() if key != "action"}
    ctx = _prepare(snapshot, filters, authorization, action)
    handlers = {"overview": _overview, "map": _map, "composition": _composition, "prices": _prices,
                "attendance": _attendance, "reports": _reports, "managers": _managers, "coverage": _coverage}
    return handlers[action](ctx)


def dashboard(snapshot, filters, authorization):
    """Return only sections permitted by the backend-supplied authorization."""
    _, permissions = _authorize(authorization)
    if not isinstance(filters, dict) or set(filters) - FILTER_KEYS:
        raise AdminAnalyticsError("El dashboard requiere filtros planos reconocidos, sin action.")
    sections = {}
    for action, permission in ACTION_PERMISSIONS.items():
        if permission in permissions:
            sections[action] = analyze(snapshot, {"action": action, **filters}, authorization)
    if not sections:
        raise AdminAnalyticsError("No hay secciones de dashboard autorizadas.")
    first = next(iter(sections.values()))
    return {"schema_version": "admin-dashboard-1.0", "snapshot_id": first["snapshot_id"], "is_demo": first["is_demo"],
            "filters": first["filters"], "sections": sections}
