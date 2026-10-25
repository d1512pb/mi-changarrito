from fastapi.testclient import TestClient

from main import app


def test_frontend_and_api_share_origin_without_serving_repository_files():
    with TestClient(app) as client:
        index = client.get("/")
        assert index.status_code == 200
        assert "text/html" in index.headers["content-type"]
        assert "js/live.js" in index.text
        assert client.get("/api/health").json()["status"] == "ok"
        assert client.get("/api/offer/search").status_code == 200
        assert client.get("/api/user/profile").status_code == 401
        assert client.get("/.env").status_code == 404
        assert client.get("/backend/main.py").status_code == 404
        assert client.get("/api/does-not-exist").status_code == 404
        assert client.get("/api/offer/search").headers["cache-control"] == "no-store"
        assert client.get("/sw.js").headers["cache-control"] == "no-cache"


def test_long_unicode_password_is_validation_error_instead_of_server_error():
    with TestClient(app) as client:
        response = client.post("/api/user/register", json={
            "email": "unicode@example.com", "password": "ñ" * 40, "nombre": "Prueba",
        })
        assert response.status_code == 422
        assert client.post("/api/user/login", json={
            "email": "loc1@changarrito.mx", "password": "ñ" * 40,
        }).status_code == 401


def test_photo_read_is_bounded_and_oversize_upload_rejected():
    with TestClient(app) as client:
        auth = client.post("/api/user/login", json={
            "email": "loc1@changarrito.mx", "password": "Demo1234",
        })
        headers = {"Authorization": "Bearer " + auth.json()["token"]}
        response = client.post("/api/offer/draft", headers=headers, data={"texto": "mango $10"},
                               files={"foto": ("large.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")})
        assert response.status_code == 422
