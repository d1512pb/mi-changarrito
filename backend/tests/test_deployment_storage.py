import asyncio
import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, settings
from app.core.database import Collection, _json_dumps, _restore, database
from app.core.errors import Invalid
from app.services import storage
from main import app


def test_datetime_roundtrip_preserves_types_and_evidence_strings():
    moment = datetime.now(timezone.utc)
    document = {"expires_at": moment, "items": [{"creado_en": moment.isoformat()}]}
    restored = _restore(json.loads(_json_dumps(document)))
    assert restored["expires_at"] == moment
    assert isinstance(restored["items"][0]["creado_en"], str)


def test_development_collection_returns_detached_copies():
    async def check():
        collection = Collection("offer")
        saved = await collection.insert({"nested": {"name": "original"}})
        saved["nested"]["name"] = "modified"
        assert (await collection.get(saved["id"]))["nested"]["name"] == "original"
        await collection.update(saved["id"], {"estado": "publicada"})
        assert len(await collection.find(estado="publicada")) == 1
        assert await collection.delete(saved["id"])
    asyncio.run(check())


def test_production_requires_persistent_resources():
    config = Settings(_env_file=None, ENVIRONMENT="production", SESSION_SECRET="s" * 40,
                      SEED_ON_START=False, DATABASE_URL="", S3_ENDPOINT="",
                      S3_BUCKET="", S3_ACCESS_KEY_ID="", S3_SECRET_ACCESS_KEY="")
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        config.validate_startup()
    config.DATABASE_URL = "postgresql://example.invalid/database"
    with pytest.raises(RuntimeError, match="S3"):
        config.validate_startup()


def test_persistent_database_does_not_get_demo_seed():
    config = Settings(_env_file=None, SEED_ON_START=True, DATABASE_URL="postgresql://example.invalid/db")
    with pytest.raises(RuntimeError, match="SEED_ON_START"):
        config.validate_startup()


def test_storage_uses_private_object_and_stable_application_path(monkeypatch):
    calls = []
    class Client:
        def put_object(self, **kwargs):
            calls.append(kwargs)
    monkeypatch.setattr(settings, "S3_ENDPOINT", "https://example.invalid")
    monkeypatch.setattr(settings, "S3_BUCKET", "bucket")
    monkeypatch.setattr(settings, "S3_ACCESS_KEY_ID", "test-key")
    monkeypatch.setattr(settings, "S3_SECRET_ACCESS_KEY", "test-secret")
    monkeypatch.setattr(storage, "_s3_client", lambda: Client())
    result = storage.save_photo(b"png-data", "image/png", "unused", 5)
    assert result.startswith("/uploads/") and "?" not in result
    assert calls[0]["Key"] == "offers/" + result.rsplit("/", 1)[-1]
    assert calls[0]["Bucket"] == "bucket"
    assert "ACL" not in calls[0]
    with pytest.raises(Invalid):
        storage.save_photo(b"", "image/png", "unused", 5)
    with pytest.raises(Invalid):
        storage.save_photo(b"<svg/>", "image/svg+xml", "unused", 5)


def test_photo_access_tracks_publication_and_owner(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    filename = "a" * 32 + ".png"
    (tmp_path / filename).write_bytes(b"photo")
    with TestClient(app) as client:
        login = client.post("/user/login", json={"email": "loc1@changarrito.mx", "password": "Demo1234"})
        headers = {"Authorization": "Bearer " + login.json()["token"]}
        merchant = client.get("/user/profile", headers=headers).json()
        doc = asyncio.run(database.offer.insert({
            "id": "private-photo", "id_merchant": merchant["id"],
            "estado": "borrador", "foto_url": "/uploads/" + filename,
            "vigente_hasta": None,
        }))
        url = "/uploads/" + filename
        assert client.get(url).status_code == 404
        assert client.get(url, headers=headers).content == b"photo"
        asyncio.run(database.offer.update(doc["id"], {
            "estado": "publicada", "vigente_hasta": datetime.now(timezone.utc) + timedelta(hours=1)
        }))
        assert client.get(url).content == b"photo"
        asyncio.run(database.offer.update(doc["id"], {"estado": "agotada"}))
        assert client.get(url).status_code == 404
        assert client.get(url, headers=headers).status_code == 200
        assert client.get("/uploads/not-a-photo").status_code == 404


def test_health_reports_only_non_secret_resource_state():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "schema_version": "1.0",
                                   "database": "memory", "storage": "local"}
