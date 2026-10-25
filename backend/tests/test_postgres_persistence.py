"""Opt-in integration check against a separate PostgreSQL test database."""
import asyncio
import os
import uuid
from datetime import datetime, timezone

import pytest

from app.core.database import Database, PostgresCollection


@pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL not configured")
def test_documents_survive_new_database_connection():
    async def check():
        url = os.environ["TEST_DATABASE_URL"]
        identifier = "deployment-check-" + uuid.uuid4().hex
        first, second = Database(), Database()
        timestamp = datetime.now(timezone.utc)
        try:
            await first.connect(url)
            collection = PostgresCollection(first, "_verification")
            await collection.insert({"id": identifier, "expires_at": timestamp, "enabled": True})
            await first.disconnect()

            await second.connect(url)
            collection = PostgresCollection(second, "_verification")
            restored = await collection.get(identifier)
            assert restored["expires_at"] == timestamp
            assert (await collection.find_one(id=identifier, enabled=True))["id"] == identifier
            await collection.update(identifier, {"enabled": False})
            assert (await collection.get(identifier))["enabled"] is False
        finally:
            if second.pool is None:
                await second.connect(url)
            await PostgresCollection(second, "_verification").delete(identifier)
            await first.disconnect()
            await second.disconnect()
    asyncio.run(check())
