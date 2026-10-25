"""Natural-language planning over scoped metadata; statistics stay deterministic."""

from datetime import date
import json
import re
import time
import unicodedata

from .security import AdminAccessError, PERMISSIONS, authorized_markets, check_action

if __package__ and "." in __package__:
    from ..claude_client import ClaudeClient, load_credentials, SMOKE_MODEL
else:
    from claude_client import ClaudeClient, load_credentials, SMOKE_MODEL

FILTER_KEYS = ("period", "borough", "tianguis_ids", "category", "article_id", "date")


class AdminChatError(ValueError):
    pass


def _normalized(value):
    return "".join(c for c in unicodedata.normalize("NFKD", str(value).casefold()) if not unicodedata.combining(c))


def scoped_metadata(snapshot, authorization):
    markets = authorized_markets(snapshot, authorization)
    allowed_ids = {market["id"] for market in markets}
    prices_allowed = "prices:read" in authorization["permissions"]
    articles = {}
    periods = {str(snapshot.get("period", ""))}
    if prices_allowed:
        for row in snapshot.get("price_observations", []):
            if isinstance(row, dict) and row.get("tianguis_id") in allowed_ids:
                article = row.get("article_id")
                if isinstance(article, str) and article:
                    articles[article] = {"id": article, "name": str(row.get("article_name", article))[:120], "category": str(row.get("category", ""))[:80]}
                observed = row.get("observed_on")
                if isinstance(observed, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", observed):
                    periods.add(observed[:7])
    return {
        "snapshot_period": snapshot.get("period"), "snapshot_as_of": snapshot.get("as_of"),
        "tianguis": [{"id": m["id"], "name": str(m.get("name", ""))[:120], "borough": str(m.get("borough", ""))[:100]} for m in markets[:100]],
        "periods": sorted(period for period in periods if re.fullmatch(r"\d{4}-\d{2}", period)),
        "articles": list(articles.values())[:100],
        "actions": [action for action, permission in PERMISSIONS.items() if permission in authorization["permissions"]],
    }


def _validate_plan(raw, metadata, authorization):
    if not isinstance(raw, dict) or set(raw) != {"action", *FILTER_KEYS, "clarification"}:
        raise AdminChatError("El plan del chat no respeta el contrato.")
    action = raw["action"]
    if not isinstance(action, str) or action not in {*PERMISSIONS, "unsupported"}:
        raise AdminChatError("La acción del chat no es válida.")
    plan = dict(raw)
    ids = plan["tianguis_ids"]
    if not isinstance(ids, list) or len(ids) > 100 or any(not isinstance(value, str) for value in ids):
        raise AdminChatError("El filtro de tianguis no es válido.")
    if len(ids) != len(set(ids)) or any(value not in {market["id"] for market in metadata["tianguis"]} for value in ids):
        raise AdminAccessError("El plan intenta consultar fuera del alcance permitido.")
    for field in ("borough", "category", "article_id", "clarification"):
        if plan[field] is not None and (not isinstance(plan[field], str) or len(plan[field]) > 300):
            raise AdminChatError("Hay un filtro de texto inválido.")
    boroughs = {market["borough"] for market in metadata["tianguis"]}
    if plan["borough"] is not None and plan["borough"] not in boroughs:
        raise AdminAccessError("La alcaldía solicitada no está en el alcance permitido.")
    if plan["article_id"] is not None and plan["article_id"] not in {article["id"] for article in metadata["articles"]}:
        raise AdminChatError("El artículo no está en el catálogo autorizado de esta consulta.")
    if plan["period"] is None:
        plan["period"] = metadata["snapshot_period"]
    if not isinstance(plan["period"], str) or not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", plan["period"]):
        raise AdminChatError("period debe tener formato YYYY-MM.")
    if plan["date"] is not None:
        try:
            date.fromisoformat(plan["date"])
        except (ValueError, TypeError):
            raise AdminChatError("date debe tener formato YYYY-MM-DD.") from None
    if action != "unsupported":
        check_action(action, authorization)
    return plan


def _mock_plan(query, metadata, previous):
    text = _normalized(query)
    action = metadata.get("previous_action", "overview")
    if any(word in text for word in ("borra", "elimina", "sanciona", "contrasena", "codi", "cobrar", "pagos")):
        action = "unsupported"
    elif any(word in text for word in ("asisten", "pase de lista", "ausent", "presentes")):
        action = "attendance"
    elif any(word in text for word in ("reporte", "entrega mensual", "cumplimiento")):
        action = "reports"
    elif any(word in text for word in ("precio", "compara", "barato", "caro")):
        action = "prices"
    elif "gerent" in text:
        action = "managers"
    elif any(word in text for word in ("mapa", "ubicacion", "donde")):
        action = "map"
    elif any(word in text for word in ("predomina", "composicion", "categorias", "giros")):
        action = "composition"
    elif any(word in text for word in ("faltan datos", "cobertura", "calidad")):
        action = "coverage"
    plan = {key: previous.get(key) for key in FILTER_KEYS}
    plan.update(action=action, tianguis_ids=previous.get("tianguis_ids", []), clarification=None)
    if not plan["period"]:
        plan["period"] = metadata["snapshot_period"]
    explicit = re.search(r"20\d{2}-(?:0[1-9]|1[0-2])", text)
    if explicit:
        plan["period"] = explicit.group(0)
    else:
        months = {"enero": "01", "febrero": "02", "marzo": "03", "abril": "04", "mayo": "05", "junio": "06", "julio": "07", "agosto": "08", "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12"}
        for name, month in months.items():
            if re.search(r"\b" + name + r"\b", text):
                plan["period"] = plan["period"][:4] + "-" + month
    for market in metadata["tianguis"]:
        if _normalized(market["name"]) in text:
            plan["tianguis_ids"] = [market["id"]]
        if market["borough"] and _normalized(market["borough"]) in text:
            plan["borough"] = market["borough"]
    article_matches = []
    for article in metadata["articles"]:
        first_word = _normalized(article["name"]).split()[0] if article["name"].strip() else ""
        if _normalized(article["name"]) in text or _normalized(article["id"]) in text or (len(first_word) >= 4 and re.search(r"\b" + re.escape(first_word) + r"\b", text)):
            article_matches.append(article["id"])
        if article["category"] and _normalized(article["category"]) in text:
            plan["category"] = article["category"]
    if len(set(article_matches)) == 1:
        plan["article_id"] = article_matches[0]
    if any(word in text for word in ("todos", "totalidad", "toda la ciudad")):
        plan.update(tianguis_ids=[], borough=None)
    if action == "unsupported":
        plan["clarification"] = "Puedo consultar mapas, composición, precios, gerentes, asistencia y reportes. Los pagos y cambios de datos quedan fuera de este chat."
    return plan


def admin_chat(payload, *, mode="mock", client=None):
    from .analytics import analyze

    if mode not in {"mock", "live"} or not isinstance(payload, dict):
        raise AdminChatError("Se requiere una solicitud JSON y modo mock o live.")
    query = payload.get("query")
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        raise AdminChatError("La pregunta debe contener entre 1 y 1000 caracteres.")
    snapshot, authorization = payload.get("snapshot"), payload.get("authorization")
    metadata = scoped_metadata(snapshot, authorization)
    previous_action = payload.get("conversation_state", {}).get("last_action", "overview") if isinstance(payload.get("conversation_state", {}), dict) else "overview"
    if not isinstance(previous_action, str) or previous_action not in {*PERMISSIONS, "unsupported"}:
        raise AdminChatError("La acción anterior no es válida.")
    metadata["previous_action"] = previous_action if previous_action in PERMISSIONS else "overview"
    previous = payload.get("conversation_state", {}).get("filters", {}) if isinstance(payload.get("conversation_state", {}), dict) else {}
    if not isinstance(previous, dict):
        raise AdminChatError("El contexto de filtros debe ser un objeto.")
    # Revalidate context before exposing it to the planner.
    previous_plan = {key: previous.get(key) for key in FILTER_KEYS}
    previous_plan.update(action="unsupported", tianguis_ids=previous.get("tianguis_ids", []), clarification=None)
    previous_plan = _validate_plan(previous_plan, metadata, authorization)
    safe_previous = {key: previous_plan[key] for key in FILTER_KEYS}
    metrics = {"generation_requests": 0}
    if mode == "mock":
        raw = _mock_plan(query, metadata, safe_previous)
    else:
        client = client or ClaudeClient(load_credentials(), timeout=45)
        started = time.perf_counter()
        response = client.plan_admin_query(query, metadata, safe_previous)
        if response.get("stop_reason") != "end_turn":
            raise AdminChatError("El plan de Claude quedó incompleto; no se ejecutó una consulta parcial.")
        try:
            raw = json.loads("".join(block.get("text", "") for block in response.get("content", []) if block.get("type") == "text"))
        except (ValueError, TypeError, AttributeError):
            raise AdminChatError("Claude no devolvió un plan JSON utilizable.") from None
        metrics.update(generation_requests=1, model=response.get("model", SMOKE_MODEL), effort="high", latency_ms=round((time.perf_counter() - started) * 1000))
        usage = response.get("usage", {})
        if isinstance(usage, dict) and all(type(usage.get(key)) is int and usage[key] >= 0 for key in ("input_tokens", "output_tokens")):
            metrics.update(input_tokens=usage["input_tokens"], output_tokens=usage["output_tokens"], estimated_token_cost_usd=round((usage["input_tokens"] * 0.10 + usage["output_tokens"] * 0.50) / 1_000_000, 8))
    plan = _validate_plan(raw, metadata, authorization)
    state = {"filters": {key: plan[key] for key in FILTER_KEYS}, "last_action": plan["action"]}
    if plan["action"] == "unsupported":
        return {"schema_version": "admin-chat-1.0", "mode": mode, "read_only": True,
                "status": "needs_clarification", "answer": plan["clarification"] or "¿Qué indicador o comparación quieres consultar?",
                "conversation_state": state, "data": None, "metrics": metrics}
    data = analyze(snapshot, {key: plan[key] for key in ("action", *FILTER_KEYS)}, authorization)
    labels = {"overview": "resumen general", "map": "mapa de ubicaciones", "composition": "composición por giros",
              "prices": "comparación de precios por artículo y unidad", "attendance": "asistencia registrada",
              "reports": "entrega mensual de reportes", "managers": "directorio de gerentes", "coverage": "calidad y cobertura de datos"}
    rows = data.get("rows", [])
    answer = f"Preparé {labels[plan['action']]} para {plan['period']} dentro de tu alcance autorizado. Hay {len(rows)} filas de resultado."
    counts = data.get("metrics", {})
    if plan["action"] == "overview":
        answer = f"En {plan['period']} hay {counts.get('tianguis_count', 0)} tianguis, {counts.get('unique_businesses', 0)} changarritos únicos y {counts.get('approved_participations', 0)} participaciones aprobadas dentro de tu alcance."
    if plan["action"] == "prices":
        answer += " Las comparaciones separan artículos, presentación y unidad; revisa mediana, rango y tamaño de muestra."
        groups = {}
        for row in rows:
            key = (row.get("article_id"), row.get("variant"), row.get("unit"), row.get("currency"))
            if type(row.get("median_price_cents")) in (int, float):
                groups.setdefault(key, []).append(row)
        comparable = [values for values in groups.values() if len({row.get("tianguis_id") for row in values}) > 1]
        for numeric in comparable[:3]:
            low, high = min(numeric, key=lambda row: row["median_price_cents"]), max(numeric, key=lambda row: row["median_price_cents"])
            difference = (high["median_price_cents"] - low["median_price_cents"]) / 100
            answer += f" Para {low.get('article_name')} ({low.get('variant')}), las medianas observadas van de ${low['median_price_cents'] / 100:.2f} en {low.get('tianguis_name')} a ${high['median_price_cents'] / 100:.2f} en {high.get('tianguis_name')}: diferencia de ${difference:.2f} {low.get('currency')}/{low.get('unit')}."
    if plan["action"] == "attendance":
        answer = f"En las {counts.get('expected_manager_sessions', 0)} jornadas-gerente con calendario conocido: {counts.get('present', 0)} presencias, {counts.get('explicit_absent', 0)} ausencias registradas y {counts.get('unreported', 0)} sin registro. Sin registro no significa ausente."
    if plan["action"] == "reports":
        answer = f"Para {plan['period']}: {counts.get('expected_monthly_reports', 0)} reportes esperados, {counts.get('submitted', 0)} entregados, {counts.get('pending', 0)} pendientes, {counts.get('overdue', 0)} vencidos y {counts.get('unreported', 0)} sin información de entrega."
    if data.get("is_demo"):
        answer += " Los datos son sintéticos; todavía no representan el PDF mensual real."
    return {"schema_version": "admin-chat-1.0", "mode": mode, "read_only": True, "status": "ok",
            "answer": answer, "conversation_state": state, "data": data, "metrics": metrics}
