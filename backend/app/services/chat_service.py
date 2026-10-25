"""Read-only chat: provider selects IDs/plans; backend supplies all facts."""
import asyncio
from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
from decimal import Decimal
import json
import time

from fastapi import HTTPException

from app.core.config import settings
from app.schemas.offer_schema import ResponseOffer
from app.services.ai_extractor import get_extractor
from app.services.offer_service import OfferService, effective

_requests = defaultdict(deque)
_locks = defaultdict(asyncio.Lock)


def provider_enabled():
    import os
    return settings.CHAT_PROVIDER == "claude" and bool(os.environ.get("ANTHROPIC_API_KEY"))


def _client():
    from ia.claude_client import ClaudeClient, load_credentials
    return ClaudeClient(load_credentials(), timeout=20)


def _result_text(response):
    if response.get("stop_reason") != "end_turn":
        raise ValueError("Incomplete provider response")
    return json.loads("".join(block.get("text", "") for block in response.get("content", []) if block.get("type") == "text"))


def public_card(row):
    result = ResponseOffer.model_validate(row).model_dump(mode="json")
    cents = Decimal(str(row["precio_declarado"])) * 100
    if not cents.is_finite() or cents != cents.to_integral_value():
        raise ValueError("Invalid price")
    result.update(offer_id=row["id"], name=row["producto"], price_cents=int(cents), currency="MXN")
    return result


class ChatService:
    def __init__(self, db, actor):
        self.db, self.actor = db, actor
        self.offers = OfferService(db, get_extractor())

    async def history(self):
        rows = await self.db.chat.find(user_id=self.actor["id"], actor_role=self.actor["rol"])
        return sorted(rows, key=lambda row: row["created_at"])[-12:]

    async def visible_catalog(self):
        rows = await self.offers.search(None, None, None, 3, 100)
        cards = []
        for row in rows:
            try:
                cards.append(public_card(row))
            except (ValueError, TypeError):
                continue
        return cards

    async def ask(self, query, budget=None):
        key = self.actor["id"]
        if _locks[key].locked():
            raise HTTPException(429, "Espera la respuesta anterior antes de enviar otra pregunta")
        async with _locks[key]:
            clock = time.monotonic()
            recent = _requests[key]
            while recent and recent[0] < clock - 60:
                recent.popleft()
            if len(recent) >= settings.CHAT_CALLS_PER_MINUTE:
                raise HTTPException(429, "Alcanzaste el límite del chat por minuto. Intenta en un momento")
            recent.append(clock)
            history = await self.history()
            catalog = await self.visible_catalog()
            if self.actor["rol"] in ("pro", "gerente"):
                result = await self.administrative(query, catalog)
            else:
                result = await self.customer(query, budget, catalog, history)
            result.update(read_only=True, created_at=datetime.now(timezone.utc).isoformat())
            await self.db.chat.insert({"user_id": key, "actor_role": self.actor["rol"],
                                      "query": query, "answer": result["answer"], "mode": result["mode"],
                                      "offer_ids": [row["id"] for row in result.get("recommendations", [])],
                                      "created_at": datetime.now(timezone.utc)})
            return result

    async def customer(self, query, budget, catalog, history):
        from app.api.routes.ai import _budget, select_public_offers
        budget = _budget(query, budget)
        if budget is None:
            for turn in reversed(history):
                budget = _budget(turn["query"], None)
                if budget is not None:
                    break
        result = {"mode": "local", "answer": "", "recommendations": [], "warnings": [], "budget_cents": budget}
        if not catalog:
            result["answer"] = "Todavía no hay ofertas publicadas y vigentes en el catálogo. No voy a inventarte productos ni precios; cuando los puestos publiquen, podré mostrarte opciones con sus fotos."
            return result
        if provider_enabled():
            # Only public offer fields are sent, never photos, account data or private capture text.
            safe_catalog = [{key: row.get(key) for key in ("id", "producto", "negocio", "tianguis_nombre", "precio_declarado", "unidad", "descripcion")} for row in catalog]
            try:
                response = await asyncio.to_thread(_client().select_offers, query, budget, safe_catalog,
                                                   history=[turn["query"] for turn in history[-6:]])
                plan = _result_text(response)
                if set(plan) != {"status", "selected_offer_ids", "clarification"} or plan["status"] not in ("ok", "no_match", "needs_clarification"):
                    raise ValueError("Invalid selection")
                ids = plan["selected_offer_ids"]
                by_id = {row["id"]: row for row in catalog}
                if not isinstance(ids, list) or len(ids) > 3 or any(not isinstance(value, str) for value in ids) or len(set(ids)) != len(ids) or any(value not in by_id for value in ids):
                    raise ValueError("Unknown offer")
                if (plan["status"] == "ok") != bool(ids):
                    raise ValueError("Invalid selection state")
                selected = [by_id[value] for value in ids]
                if budget is not None and any(row["price_cents"] > budget for row in selected):
                    raise ValueError("Over budget")
                result.update(mode="claude", recommendations=selected)
                if selected:
                    result["answer"] = "Encontré estas opciones reales y vigentes. Son alternativas por una unidad; revisa el puesto, la unidad y la vigencia de cada una."
                elif plan["status"] == "needs_clarification" and isinstance(plan["clarification"], str):
                    result["answer"] = plan["clarification"][:600]
                else:
                    result["answer"] = "No encontré una oferta vigente que resuelva esa consulta. Puedes probar otro producto o decirme más sobre lo que buscas."
                return result
            except Exception:
                result["warnings"].append("El proveedor de IA no respondió correctamente. Estas opciones se calcularon con búsqueda local.")
                result["mode"] = "local_fallback"
        ceiling = budget if budget is not None else 100_000_000
        local = select_public_offers(catalog, query, ceiling)
        result.update(answer=local["answer"], recommendations=local["recommendations"])
        if not provider_enabled():
            result["warnings"].append("Modo local: el proveedor de IA aún no está habilitado.")
        return result

    async def administrative(self, query, catalog):
        markets = await self.db.tianguis.find()
        if self.actor["rol"] == "gerente":
            allowed = set(self.actor.get("tianguis_ids") or [])
            markets = [market for market in markets if market["id"] in allowed]
        allowed = {market["id"] for market in markets}
        offers = [effective(row) for row in await self.db.offer.find() if row.get("tianguis_id") in allowed]
        stalls = [row for row in await self.db.user.find(rol="locatario") if row.get("tianguis_id") in allowed]
        catalog = [row for row in catalog if row.get("tianguis_id") in allowed]
        states = Counter(row["estado"] for row in offers)
        action, mode = "overview", "local"
        text = query.casefold()
        if any(word in text for word in ("precio", "barato", "compara")):
            action = "prices"
        elif any(word in text for word in ("asistencia", "ausencia", "reporte mensual", "ventas")):
            action = "unsupported"
        warnings = []
        selected_markets = allowed
        if provider_enabled() and markets:
            metadata = {"snapshot_period": datetime.now(timezone.utc).strftime("%Y-%m"),
                        "snapshot_as_of": datetime.now(timezone.utc).isoformat(),
                        "tianguis": [{"id": m["id"], "name": m["nombre"], "borough": ""} for m in markets],
                        "periods": [datetime.now(timezone.utc).strftime("%Y-%m")],
                        "articles": [{"id": row["id"], "name": row["producto"], "category": ""} for row in catalog],
                        "actions": ["overview", "prices", "composition", "coverage", "map", "managers"]}
            try:
                plan = _result_text(await asyncio.to_thread(_client().plan_admin_query, query, metadata, {}))
                requested = plan.get("tianguis_ids")
                if not isinstance(requested, list) or any(not isinstance(value, str) or value not in allowed for value in requested):
                    raise ValueError("Out of scope")
                selected_markets = set(requested) if requested else allowed
                action = plan.get("action")
                if action not in ("overview", "prices", "composition", "coverage", "map", "managers", "attendance", "reports", "unsupported"):
                    raise ValueError("Unsupported action")
                mode = "claude"
            except Exception:
                mode = "local_fallback"
                warnings.append("No fue posible interpretar la consulta con IA; muestro el resumen actual de tu alcance.")
        markets = [m for m in markets if m["id"] in selected_markets]
        stalls = [row for row in stalls if row.get("tianguis_id") in selected_markets]
        offers = [row for row in offers if row.get("tianguis_id") in selected_markets]
        catalog = [row for row in catalog if row.get("tianguis_id") in selected_markets]
        states = Counter(row["estado"] for row in offers)
        answer = f"En tu alcance hay {len(markets)} tianguis, {len(stalls)} puestos registrados y {len(offers)} ofertas: {states['publicada']} publicadas y vigentes, {states['borrador']} en borrador, {states['agotada']} agotadas, {states['vencida']} vencidas y {states['suspendida']} suspendidas."
        if action in ("attendance", "reports", "unsupported"):
            answer = "Este MVP todavía no tiene registros de asistencia, reportes mensuales ni ventas. No puedo inventar esas cifras ni realizar cambios desde el chat. " + answer
        elif action == "prices":
            groups = defaultdict(list)
            for row in catalog:
                groups[(row["producto"].casefold(), row.get("unidad") or "unidad no declarada")].append(row["price_cents"])
            lines = [f"{product} ({unit}): ${min(prices)/100:.2f} a ${max(prices)/100:.2f} MXN; {len(prices)} ofertas vigentes."
                     for (product, unit), prices in list(groups.items())[:12]]
            answer = "\n".join(lines) if lines else "No hay precios publicados y vigentes en los tianguis de tu alcance."
            warnings.append("Se comparan nombres y unidades declaradas; las variantes comerciales todavía no están normalizadas.")
        return {"mode": mode, "answer": answer, "recommendations": catalog[:3] if action == "prices" else [],
                "warnings": warnings, "scope": "assigned_markets" if self.actor["rol"] == "gerente" else "all_markets",
                "data": {"tianguis": len(markets), "puestos": len(stalls), "ofertas": len(offers), "estados": dict(states)}}
