"""Exercise a deployment with synthetic records; keep QA credentials in .local/.

Run prepare, restart only the application, then run verify with the same state.
No provider calls. The final phase removes the test offer from public search.
"""
import argparse
import base64
import json
from pathlib import Path
import secrets
import sys
import uuid

import httpx

PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=")


def checked(response, status=200):
    if response.status_code != status:
        raise AssertionError(f"Unexpected HTTP {response.status_code}; expected {status}")
    return response


def prepare(client, state_path, base):
    identifier = uuid.uuid4().hex[:14]
    password = secrets.token_urlsafe(24)
    headers = {}
    for role in ("locatario", "consumidor"):
        email = f"deployment-{role}-{identifier}@example.com"
        account = {"email": email, "password": password, "nombre": "Verificación técnica (sintético)", "rol": role}
        if role == "locatario":
            account.update(nombre_negocio="Verificación técnica (sintético)",
                           ubicacion={"lat": 0, "lng": 0, "direccion": "Registro sintético de prueba; no es un comercio real"})
        checked(client.post("/api/user/register", json=account), 201)
        token = checked(client.post("/api/user/login", json={"email": email, "password": password})).json()["token"]
        headers[role] = {"Authorization": "Bearer " + token}
    product = "Verificación técnica " + identifier
    draft = checked(client.post("/api/offer/draft", headers=headers["locatario"],
                                data={"texto": product + " $1 la pieza"},
                                files={"foto": ("synthetic.png", PNG, "image/png")}), 201).json()
    offer_id, photo = draft["id"], draft["foto_url"]
    assert draft["estado"] == "borrador" and draft["extraction_mode"] == "mock"
    assert client.get(photo).status_code == 404
    assert checked(client.get(photo, headers=headers["locatario"])).content == PNG
    assert client.post(f"/api/offer/publish/{offer_id}", headers=headers["consumidor"]).status_code == 403
    checked(client.put(f"/api/offer/update/{offer_id}", headers=headers["locatario"], json={
        "producto": product, "precio_declarado": 1,
        "descripcion": "Oferta sintética usada exclusivamente para verificar el despliegue.",
    }))
    assert not any(row["id"] == offer_id for row in checked(client.get("/api/offer/search")).json())
    state = {"base": base, "offer_id": offer_id, "photo": photo, "product": product, "headers": headers}
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state), encoding="utf-8")
    return {"phase": "prepare", "registration": "ok", "draft_private": "ok", "photo_round_trip": "ok", "mode": "mock"}


def verify(client, state):
    merchant, consumer = state["headers"]["locatario"], state["headers"]["consumidor"]
    checked(client.get("/api/user/profile", headers=merchant))
    checked(client.get("/api/user/profile", headers=consumer))
    offers = checked(client.get("/api/offer/mine", headers=merchant)).json()
    found = next(row for row in offers if row["id"] == state["offer_id"])
    assert found["producto"] == state["product"] and found["estado"] == "borrador"
    assert checked(client.get(state["photo"], headers=merchant)).content == PNG
    checked(client.post(f"/api/offer/publish/{state['offer_id']}", headers=merchant, json={"vigencia_horas": 1}))
    try:
        rows = checked(client.get("/api/offer/search", params={"q": state["product"]})).json()
        assert any(row["id"] == state["offer_id"] for row in rows)
        assert checked(client.get(state["photo"])).content == PNG
        recommendations = checked(client.post("/api/ai/recommend", headers=consumer,
                                              json={"query": state["product"], "budget_cents": 100})).json()
        assert recommendations["mode"] == "rules"
        assert any(row["id"] == state["offer_id"] for row in recommendations["recommendations"])
    finally:
        checked(client.post(f"/api/offer/sold_out/{state['offer_id']}", headers=merchant))
    assert not any(row["id"] == state["offer_id"] for row in checked(client.get("/api/offer/search")).json())
    assert client.get(state["photo"]).status_code == 404
    for credentials in (merchant, consumer):
        checked(client.post("/api/user/logout", headers=credentials))
        assert client.get("/api/user/profile", headers=credentials).status_code == 401
    return {"phase": "verify", "session_and_draft_survive": "ok", "photo_persists": "ok",
            "publish_search_recommend": "ok", "sold_out_removed": "ok", "logout_revoked": "ok"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("prepare", "verify"))
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--state", default=".local/deployment-smoke.json")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    state_path = Path(args.state)
    with httpx.Client(base_url=base, timeout=45, follow_redirects=True) as client:
        checked(client.get("/api/health"))
        if args.phase == "prepare":
            result = prepare(client, state_path, base)
        else:
            state = json.loads(state_path.read_text(encoding="utf-8"))
            assert state["base"] == base
            result = verify(client, state)
            state_path.unlink()
        print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except AssertionError as error:
        print(json.dumps({"error": str(error) or "Verification assertion failed"}))
        sys.exit(1)
    except Exception as error:
        # HTTP exception strings can contain signed URLs. Print only the type.
        print(json.dumps({"error_type": type(error).__name__}))
        sys.exit(1)
