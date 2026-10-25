"""Collection API backed by PostgreSQL in deployment and memory in local tests.

Documents retain the current service interface while PostgreSQL owns persistence,
unique email/session constraints and atomic updates. JSON tags preserve datetime
objects across restarts without changing user-supplied strings.
"""
import copy
import json
import uuid
from datetime import datetime
from typing import Callable, Optional

from app.core.config import settings
from app.core.errors import Conflict

_DATETIME_TAG = "__changarrito_datetime__"


def _json_default(value):
    if isinstance(value, datetime):
        return {_DATETIME_TAG: value.isoformat()}
    raise TypeError(f"Unsupported document value: {type(value).__name__}")


def _json_dumps(value) -> str:
    return json.dumps(value, default=_json_default, ensure_ascii=False, allow_nan=False)


def _restore(value):
    if isinstance(value, dict):
        if set(value) == {_DATETIME_TAG}:
            return datetime.fromisoformat(value[_DATETIME_TAG])
        return {key: _restore(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_restore(item) for item in value]
    return value


class Collection:
    """Development store; deployment refuses to start without DATABASE_URL."""

    def __init__(self, name: str = ""):
        self.name = name
        self._docs: dict[str, dict] = {}

    async def insert(self, doc: dict) -> dict:
        doc = copy.deepcopy(doc)
        doc.setdefault("id", uuid.uuid4().hex)
        if doc["id"] in self._docs:
            raise Conflict("El registro ya existe")
        if self.name == "user" and any(d.get("email") == doc.get("email") for d in self._docs.values()):
            raise Conflict("El correo ya se encuentra registrado")
        self._docs[doc["id"]] = doc
        return copy.deepcopy(doc)

    async def get(self, doc_id: str) -> Optional[dict]:
        doc = self._docs.get(doc_id)
        return copy.deepcopy(doc) if doc is not None else None

    async def find(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> list[dict]:
        return [copy.deepcopy(doc) for doc in self._docs.values()
                if all(doc.get(key) == value for key, value in equals.items()) and (not where or where(doc))]

    async def find_one(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> Optional[dict]:
        docs = await self.find(where, **equals)
        return docs[0] if docs else None

    async def update(self, doc_id: str, fields: dict) -> Optional[dict]:
        doc = self._docs.get(doc_id)
        if doc is None:
            return None
        doc.update(copy.deepcopy(fields))
        doc["id"] = doc_id
        return copy.deepcopy(doc)

    async def delete(self, doc_id: str) -> bool:
        return self._docs.pop(doc_id, None) is not None


class PostgresCollection:
    def __init__(self, database, name: str):
        self.database = database
        self.name = name

    @staticmethod
    def _json(value):
        from psycopg.types.json import Jsonb
        return Jsonb(value, dumps=_json_dumps)

    async def insert(self, doc: dict) -> dict:
        from psycopg.errors import UniqueViolation
        doc = copy.deepcopy(doc)
        doc.setdefault("id", uuid.uuid4().hex)
        try:
            async with self.database.pool.connection() as conn:
                await conn.execute(
                    "INSERT INTO changarrito_documents (collection, id, document) VALUES (%s, %s, %s)",
                    (self.name, doc["id"], self._json(doc)),
                )
        except UniqueViolation:
            raise Conflict("El registro ya existe") from None
        return doc

    async def get(self, doc_id: str) -> Optional[dict]:
        async with self.database.pool.connection() as conn:
            cursor = await conn.execute(
                "SELECT document FROM changarrito_documents WHERE collection = %s AND id = %s",
                (self.name, doc_id),
            )
            row = await cursor.fetchone()
        return _restore(row[0]) if row else None

    async def find(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> list[dict]:
        async with self.database.pool.connection() as conn:
            cursor = await conn.execute(
                "SELECT document FROM changarrito_documents WHERE collection = %s AND document @> %s",
                (self.name, self._json(equals)),
            )
            rows = await cursor.fetchall()
        docs = [_restore(row[0]) for row in rows]
        return [doc for doc in docs if not where or where(doc)]

    async def find_one(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> Optional[dict]:
        docs = await self.find(where, **equals)
        return docs[0] if docs else None

    async def update(self, doc_id: str, fields: dict) -> Optional[dict]:
        from psycopg.errors import UniqueViolation
        fields = {**fields, "id": doc_id}
        try:
            async with self.database.pool.connection() as conn:
                cursor = await conn.execute(
                    "UPDATE changarrito_documents SET document = document || %s "
                    "WHERE collection = %s AND id = %s RETURNING document",
                    (self._json(fields), self.name, doc_id),
                )
                row = await cursor.fetchone()
        except UniqueViolation:
            raise Conflict("El registro ya existe") from None
        return _restore(row[0]) if row else None

    async def delete(self, doc_id: str) -> bool:
        async with self.database.pool.connection() as conn:
            cursor = await conn.execute(
                "DELETE FROM changarrito_documents WHERE collection = %s AND id = %s RETURNING id",
                (self.name, doc_id),
            )
            return await cursor.fetchone() is not None


class Database:
    def __init__(self):
        self.pool = None
        self.reset()

    @property
    def backend(self) -> str:
        return "postgresql" if self.pool is not None else "memory"

    def reset(self):
        self.user = Collection("user")
        self.offer = Collection("offer")
        self.sessions = Collection("sessions")
        self.tianguis = Collection("tianguis")

    async def connect(self, database_url: Optional[str] = None):
        url = database_url or settings.DATABASE_URL
        if not url:
            if settings.ENVIRONMENT.lower() == "production":
                raise RuntimeError("DATABASE_URL es obligatoria en production")
            self.reset()
            return
        from psycopg_pool import AsyncConnectionPool
        self.pool = AsyncConnectionPool(
            conninfo=url, min_size=1, max_size=5, open=False,
            timeout=15, kwargs={"autocommit": True, "connect_timeout": 10},
        )
        try:
            await self.pool.open(wait=True, timeout=20)
            async with self.pool.connection() as conn:
                async with conn.transaction():
                    # Serialize idempotent schema initialization across instances.
                    await conn.execute("SELECT pg_advisory_xact_lock(6802510115)")
                    await conn.execute(
                        "CREATE TABLE IF NOT EXISTS changarrito_documents ("
                        "collection text NOT NULL, id text NOT NULL, document jsonb NOT NULL, "
                        "PRIMARY KEY (collection, id))"
                    )
                    await conn.execute(
                        "CREATE UNIQUE INDEX IF NOT EXISTS changarrito_users_email "
                        "ON changarrito_documents (lower(document->>'email')) WHERE collection = 'user'"
                    )
                    await conn.execute(
                        "CREATE UNIQUE INDEX IF NOT EXISTS changarrito_session_hash "
                        "ON changarrito_documents ((document->>'session_hash')) WHERE collection = 'sessions'"
                    )
                    await conn.execute(
                        "CREATE INDEX IF NOT EXISTS changarrito_documents_search "
                        "ON changarrito_documents USING gin (document jsonb_path_ops)"
                    )
            self.user = PostgresCollection(self, "user")
            self.offer = PostgresCollection(self, "offer")
            self.sessions = PostgresCollection(self, "sessions")
            self.tianguis = PostgresCollection(self, "tianguis")
        except BaseException:
            await self.disconnect()
            raise

    async def ping(self):
        if self.pool is not None:
            async with self.pool.connection() as conn:
                cursor = await conn.execute("SELECT 1")
                if (await cursor.fetchone())[0] != 1:
                    raise RuntimeError("Database health check failed")

    async def disconnect(self):
        if self.pool is not None:
            await self.pool.close()
            self.pool = None


database = Database()


async def get_database() -> Database:
    return database
