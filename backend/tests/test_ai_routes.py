"""Local catalog integration checks. No provider, credentials or external requests."""

import asyncio
import copy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
import pytest

from app.api.dependencies.deps import get_current_user, get_offer_service
from app.api.routes.ai import router, select_public_offers
from app.core.errors import DomainError
from app.services.ai_extractor import get_extractor


CLOCK = datetime(2026, 10, 25, 12, tzinfo=timezone.utc)


def offer(identifier="mango", **updates):
    row = {
        "id": identifier, "id_merchant": "merchant", "producto": "Mango ataúlfo",
        "negocio": "Frutería", "precio_declarado": 35.5, "unidad": "kg", "estado": "publicada",
        "confirmado_en": CLOCK - timedelta(minutes=10), "vigente_hasta": CLOCK + timedelta(hours=1),
        "creado_en": CLOCK - timedelta(hours=1), "ubicacion": {"lat": 19.4, "lng": -99.1},
        "texto_original": "captura privada", "reportes": [{"motivo": "privado"}],
    }
    row.update(updates)
    return row


def test_rules_use_confirmed_public_offers_and_exact_money_without_mutation():
    valid = offer()
    rows = [valid, offer("draft", estado="borrador"), offer("sold", estado="agotada"),
            offer("expired", vigente_hasta=CLOCK), offer("future", confirmado_en=CLOCK + timedelta(seconds=1)),
            offer("unconfirmed", confirmado_en=None), offer("unknown", precio_declarado=None),
            offer("fractional-cent", precio_declarado=1.005), offer("negative", precio_declarado=-1),
            offer("nan", precio_declarado=float("nan")), offer("costly", precio_declarado=101)]
    previous = copy.deepcopy(valid)
    result = select_public_offers(rows, "Mango con $100", None, as_of=CLOCK)
    assert result["mode"] == "rules" and result["metrics"]["generation_requests"] == 0
    assert [row["id"] for row in result["recommendations"]] == ["mango"]
    selected = result["recommendations"][0]
    assert selected["price_cents"] == 3550 and selected["remaining_cents"] == 6450
    assert "texto_original" not in selected and "reportes" not in selected
    assert valid == previous


def test_rules_handle_budget_ambiguity_relevance_and_independent_alternatives():
    rows = [offer("b", precio_declarado=20), offer("a", precio_declarado=10),
            offer("c", precio_declarado=30), offer("d", precio_declarado=40)]
    assert select_public_offers(rows, "Mango de $50 o $100", None, as_of=CLOCK)["status"] == "needs_clarification"
    assert select_public_offers(rows, "Mango", None, as_of=CLOCK)["status"] == "needs_clarification"
    assert select_public_offers(rows, "Huevo por 100 pesos", None, as_of=CLOCK)["status"] == "no_match"
    result = select_public_offers(rows, "Mango", 3500, as_of=CLOCK)
    assert [row["id"] for row in result["recommendations"]] == ["a", "b", "c"]
    assert all(row["quantity"] == 1 and row["total_cents"] <= 3500 for row in result["recommendations"])


@pytest.fixture
def app_client(monkeypatch):
    # Guard provider HTTP without changing the socketpair used by asyncio on Windows.
    def disallow_network(*args, **kwargs):
        raise AssertionError("External network is disabled in IA integration tests")
    monkeypatch.setattr("urllib.request.OpenerDirector.open", disallow_network)
    application = FastAPI()
    application.include_router(router)

    @application.exception_handler(DomainError)
    async def domain_error(_, error):
        return JSONResponse(status_code=error.status_code, content={"detail": error.detail})

    service = SimpleNamespace(search=AsyncMock(return_value=[]),
                              db=SimpleNamespace(user=SimpleNamespace(get=AsyncMock(return_value={"activo": True}))))
    application.dependency_overrides[get_offer_service] = lambda: service
    with TestClient(application) as client:
        yield application, client, service


def test_recommendation_requires_auth_and_rejects_client_catalog_or_authorization(app_client):
    application, client, _ = app_client
    assert client.post("/ai/recommend", json={"query": "Mango $100"}).status_code == 401
    application.dependency_overrides[get_current_user] = lambda: {"id": "buyer", "rol": "consumidor"}
    for extra in ({"offers": []}, {"authorization": {"role": "admin"}}, {"as_of": CLOCK.isoformat()}, {"mode": "live"}):
        assert client.post("/ai/recommend", json={"query": "Mango $100", **extra}).status_code == 422
    assert client.post("/ai/recommend", json={"query": "Mango", "budget_cents": True}).status_code == 422
    assert client.post("/ai/recommend", json={"query": "Mango", "lat": 19.4}).status_code == 422


def test_route_loads_current_catalog_and_excludes_inactive_merchant(app_client):
    application, client, service = app_client
    application.dependency_overrides[get_current_user] = lambda: {"id": "buyer", "rol": "consumidor"}
    current = datetime.now(timezone.utc)
    row = offer(confirmado_en=current - timedelta(minutes=5), vigente_hasta=current + timedelta(hours=1))
    service.search.return_value = [row]
    result = client.post("/ai/recommend", json={"query": "Mango", "budget_cents": 10000})
    assert result.status_code == 200 and result.json()["recommendations"][0]["offer_id"] == "mango"
    service.search.assert_awaited_once_with(None, None, None, 3.0, 100)
    service.db.user.get.return_value = {"activo": False}
    assert client.post("/ai/chat", json={"query": "Mango $100"}).json()["status"] == "no_match"
    assert client.get("/ai/status").json()["provider_requests"] is False


def test_capture_stays_local_and_labels_mock(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "unused-test-value")
    result = asyncio.run(get_extractor().extract("Mango $35 el kilo", None, None))
    assert result.mode == "mock" and result.campos["precio_declarado"] == 35
    assert asyncio.run(get_extractor().extract(None, b"image-not-read", "image/jpeg")).campos == {}
