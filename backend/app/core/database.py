"""Almacén en memoria con la misma forma que usabas con Mongo:
`db.user`, `db.offer`, `db.sessions`. Los datos se pierden al reiniciar.

Cuando se elija una base real, solo hay que reimplementar `Collection`
(insert, get, find, find_one, update, delete); los servicios no cambian."""
import copy
import uuid
from typing import Callable, Optional


class Collection:
    def __init__(self):
        self._docs: dict[str, dict] = {}

    async def insert(self, doc: dict) -> dict:
        doc = copy.deepcopy(doc)
        doc.setdefault("id", uuid.uuid4().hex)
        self._docs[doc["id"]] = doc
        return copy.deepcopy(doc)

    async def get(self, doc_id: str) -> Optional[dict]:
        d = self._docs.get(doc_id)
        return copy.deepcopy(d) if d else None

    async def find(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> list[dict]:
        out = []
        for d in self._docs.values():
            if any(d.get(k) != v for k, v in equals.items()):
                continue
            if where and not where(d):
                continue
            out.append(copy.deepcopy(d))
        return out

    async def find_one(self, where: Optional[Callable[[dict], bool]] = None, **equals) -> Optional[dict]:
        found = await self.find(where, **equals)
        return found[0] if found else None

    async def update(self, doc_id: str, fields: dict) -> Optional[dict]:
        d = self._docs.get(doc_id)
        if not d:
            return None
        d.update(copy.deepcopy(fields))
        return copy.deepcopy(d)

    async def delete(self, doc_id: str) -> bool:
        return self._docs.pop(doc_id, None) is not None


class Database:
    def __init__(self):
        self.reset()

    def reset(self):
        self.user = Collection()
        self.offer = Collection()
        self.sessions = Collection()

    async def connect(self):
        self.reset()  # arranque limpio: todo vive en memoria

    async def disconnect(self):
        pass


database = Database()


async def get_database() -> Database:
    return database
