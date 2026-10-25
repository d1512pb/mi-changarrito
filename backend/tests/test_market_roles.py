from fastapi.testclient import TestClient

from main import app


def auth(client, email, password="Demo1234"):
    response = client.post("/api/user/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def test_public_registration_creates_only_clients():
    with TestClient(app) as client:
        customer = {"email": "public-client@example.com", "password": "Cliente12345", "nombre": "Cliente"}
        assert client.post("/api/user/register", json=customer).status_code == 201
        for role in ("locatario", "gerente", "pro", "seguridad"):
            assert client.post("/api/user/register", json={**customer, "rol": role}).status_code == 422
        assert client.post("/api/user/register", json={**customer, "nombre_negocio": "Puesto no autorizado"}).status_code == 422


def test_administrator_manager_and_stall_permissions():
    with TestClient(app) as client:
        administrator = auth(client, "pro@changarrito.mx")
        markets, managers = [], []
        for number in (1, 2):
            market = client.post("/api/admin/tianguis", headers=administrator,
                                 json={"nombre": f"Tianguis sintético {number}", "is_demo": True})
            assert market.status_code == 201, market.text
            markets.append(market.json())
            email = f"manager-{number}@example.com"
            created = client.post("/api/admin/users", headers=administrator, json={
                "nombre": f"Gerente {number}", "email": email, "password": "Gerente12345",
                "rol": "gerente", "tianguis_ids": [market.json()["id"]],
            })
            assert created.status_code == 201, created.text
            managers.append(auth(client, email, "Gerente12345"))
        stall = {"email": "managed-stall@example.com", "password": "Puesto12345", "nombre": "Responsable",
                 "nombre_negocio": "Puesto sintético", "ubicacion": {"lat": 19.4, "lng": -99.1},
                 "tianguis_id": markets[1]["id"]}
        assert client.post("/api/management/stalls", headers=managers[0], json=stall).status_code == 403
        stall["tianguis_id"] = markets[0]["id"]
        created = client.post("/api/management/stalls", headers=managers[0], json=stall)
        assert created.status_code == 201, created.text
        assert created.json()["rol"] == "locatario" and "password" not in created.json()
        assert len(client.get("/api/management/stalls", headers=managers[0]).json()) == 1
        assert client.get("/api/management/stalls", headers=managers[1]).json() == []
        assert client.post("/api/admin/users", headers=managers[0], json={}).status_code == 403
        customer = auth(client, "consumidor@changarrito.mx")
        assert client.get("/api/management/stalls", headers=customer).status_code == 403
        merchant = auth(client, stall["email"], stall["password"])
        draft = client.post("/api/offer/draft", headers=merchant, data={"texto": "Mango $25 por kg"})
        assert draft.status_code == 201, draft.text
        offer = draft.json()
        assert offer["tianguis_id"] == markets[0]["id"] and offer["is_demo"] is True
        assert client.post(f"/api/offer/publish/{offer['id']}", headers=merchant).status_code == 200
        found = client.get("/api/offer/search", params={"tianguis_id": markets[0]["id"]}).json()
        assert any(row["id"] == offer["id"] for row in found)
        assert client.post(f"/api/moderation/suspend/{offer['id']}", headers=managers[1], json={"motivo": "fuera de alcance"}).status_code == 404
        assert client.post(f"/api/moderation/suspend/{offer['id']}", headers=managers[0], json={"motivo": "prueba de moderación"}).status_code == 200
        assert client.patch(f"/api/management/stalls/{created.json()['id']}", headers=managers[0], json={"activo": False}).status_code == 200
        assert client.get("/api/user/profile", headers=merchant).status_code == 401
