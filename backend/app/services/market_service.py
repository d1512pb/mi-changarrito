from datetime import datetime, timezone

from app.core.errors import Forbidden, Invalid, NotFound
from app.services.user_service import UserService


class MarketService:
    def __init__(self, db):
        self.db = db
        self.users = UserService(db)

    async def market(self, identifier):
        market = await self.db.tianguis.get(identifier)
        if not market:
            raise NotFound("No se encontró el tianguis")
        return market

    async def list_public(self):
        return await self.db.tianguis.find(activo=True)

    async def create_market(self, data):
        return await self.db.tianguis.insert({**data, "activo": True, "creado_en": datetime.now(timezone.utc)})

    async def create_managed_user(self, data, actor):
        data = dict(data)
        role = data["rol"]
        if role == "gerente":
            identifiers = list(dict.fromkeys(data.get("tianguis_ids") or []))
            if not identifiers:
                raise Invalid("Asigna al menos un tianguis al gerente")
            for identifier in identifiers:
                market = await self.market(identifier)
                if not market.get("activo", True):
                    raise Invalid("El tianguis está inactivo")
            data["tianguis_ids"] = identifiers
            data["tianguis_id"] = None
        elif role == "locatario":
            market = await self.market(data.get("tianguis_id")) if data.get("tianguis_id") else None
            if not market:
                raise Invalid("El puesto debe pertenecer a un tianguis")
            if not market.get("activo", True):
                raise Invalid("El tianguis está inactivo")
            data.update(tianguis_nombre=market["nombre"], is_demo=market.get("is_demo", False), tianguis_ids=[])
        else:
            data.update(tianguis_id=None, tianguis_ids=[])
        data["creado_por"] = actor["id"]
        return await self.users.create_user(data)

    def allowed_ids(self, actor):
        return set(actor.get("tianguis_ids") or [])

    async def manager_markets(self, actor):
        return [market for market in await self.db.tianguis.find() if market["id"] in self.allowed_ids(actor)]

    async def manager_stalls(self, actor):
        return [user for user in await self.db.user.find(rol="locatario")
                if user.get("tianguis_id") in self.allowed_ids(actor)]

    async def create_stall(self, data, actor):
        if data["tianguis_id"] not in self.allowed_ids(actor):
            raise Forbidden("Sólo puedes registrar puestos de tus tianguis")
        return await self.create_managed_user({**data, "rol": "locatario"}, actor)

    async def own_stall(self, user_id, actor):
        user = await self.db.user.get(user_id)
        if not user or user.get("rol") != "locatario" or user.get("tianguis_id") not in self.allowed_ids(actor):
            raise NotFound("No se encontró el puesto en tus tianguis")
        return user

    async def set_stall_status(self, user_id, active, actor):
        await self.own_stall(user_id, actor)
        result = await self.db.user.update(user_id, {"activo": active})
        if not active:
            await self.users.session_service.invalidate_all_sessions(user_id)
        return result

    async def reset_stall_password(self, user_id, password, actor):
        await self.own_stall(user_id, actor)
        await self.users.admin_reset_password(user_id, password)
