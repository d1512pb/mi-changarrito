import asyncio

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import database
from app.demo_catalog import STALLS, TIANGUIS, ensure_demo_catalog
from app.services.offer_service import now
from main import app

DEMO_OFFERS = sum(len(products) for _, _, products in STALLS)


def demo_search(client, **params):
    rows = client.get("/api/offer/search", params={"limit": 100, **params}).json()
    return [row for row in rows if row["id"].startswith("demo-oferta-")]


def test_demo_catalog_loads_markets_and_offers_without_accounts(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_CATALOG", True)
    with TestClient(app) as client:
        markets = [m for m in client.get("/api/tianguis").json() if m["id"].startswith("demo-tianguis-")]
        assert len(markets) == len(TIANGUIS) and all(m["is_demo"] for m in markets)
        offers = demo_search(client)
        assert len(offers) == DEMO_OFFERS
        assert all(o["is_demo"] and o["estado"] == "publicada" and o["tianguis_nombre"] and o["precio_declarado"] > 0
                   for o in offers)
        one = offers[0]["tianguis_id"]
        scoped = demo_search(client, tianguis_id=one)
        assert scoped and all(o["tianguis_id"] == one for o in scoped)
        assert {o["producto"] for o in demo_search(client, q="pan de muerto")} == {"Pan de muerto"}
        assert demo_search(client, q="no existe este producto") == []
        detail = client.get(f"/api/offer/{offers[0]['id']}")
        assert detail.status_code == 200 and detail.json()["is_demo"] is True
    users = asyncio.run(database.user.find())
    assert not any(str(u["id"]).startswith("demo-") for u in users)


def test_demo_catalog_is_idempotent_and_renews_state(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_CATALOG", True)
    with TestClient(app) as client:
        first = demo_search(client)
        asyncio.run(database.offer.update(first[0]["id"], {"estado": "agotada"}))
        assert len(demo_search(client)) == DEMO_OFFERS - 1
        again = asyncio.run(ensure_demo_catalog(database))
        assert again == {"tianguis": 0, "ofertas": 0}
        assert len(demo_search(client)) == DEMO_OFFERS


def test_demo_catalog_is_off_by_default():
    with TestClient(app) as client:
        assert demo_search(client) == []
        assert not [m for m in client.get("/api/tianguis").json() if m["id"].startswith("demo-")]


def test_only_demo_offers_may_skip_the_merchant_account(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_CATALOG", True)
    base = dict(estado="publicada", producto="Oferta huérfana", negocio="Sin cuenta", precio_declarado=10.0,
                ubicacion={"lat": 19.4, "lng": -99.1}, tianguis_id="demo-tianguis-oro", tianguis_nombre="Tianguis Oro",
                vigente_hasta=now().replace(year=now().year + 1), confirmado_en=now(), reportes=[],
                campos_faltantes=[], campos_ambiguos=[], creado_en=now())
    with TestClient(app) as client:
        for doc in (
            {**base, "id": "ghost-1", "id_merchant": "no-existe", "is_demo": False},
            {**base, "id": "ghost-2", "id_merchant": "no-existe", "is_demo": True},
            {**base, "id": "demo-ghost-3", "id_merchant": "demo-puesto-99", "is_demo": False},
        ):
            asyncio.run(database.offer.insert(doc))
        names = {row["id"] for row in client.get("/api/offer/search", params={"limit": 100}).json()}
        assert not names & {"ghost-1", "ghost-2", "demo-ghost-3"}


def test_recommendations_use_the_demo_catalog(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_CATALOG", True)
    with TestClient(app) as client:
        login = client.post("/api/user/login", json={"email": "consumidor@changarrito.mx", "password": "Demo1234"})
        headers = {"Authorization": "Bearer " + login.json()["token"]}
        result = client.post("/api/ai/recommend", headers=headers, json={"query": "quiero tacos con $50"}).json()
        assert result["status"] == "ok" and result["recommendations"]
        assert all(r["is_demo"] and "taco" in r["name"].lower() for r in result["recommendations"])
