from datetime import datetime, timezone
from typing import Optional

from app.core.errors import Conflict, Forbidden, Invalid, NotFound, Unauthorized
from app.core.security import hash_password, verify_password
from app.services.session_service import SessionService


class UserService:
    def __init__(self, db):
        self.db = db
        self.session_service = SessionService(db)

    async def email_exists(self, email: str) -> bool:
        return await self.db.user.find_one(email=email.lower()) is not None

    async def create_user(self, data: dict) -> dict:
        data = dict(data)
        data["email"] = data["email"].lower()
        if await self.email_exists(data["email"]):
            raise Conflict(f"El correo {data['email']} ya se encuentra registrado")
        data["password"] = await hash_password(data["password"])
        data.setdefault("activo", True)
        data["creado_en"] = datetime.now(timezone.utc)
        return await self.db.user.insert(data)

    async def login_user(self, email: str, password: str, ip_address: str, user_agent: str) -> dict:
        user = await self.db.user.find_one(email=email.lower())
        # mismo mensaje si no existe o la contraseña falla: no revela qué correos están registrados
        if not user or not await verify_password(password, user["password"]):
            raise Unauthorized("Credenciales incorrectas")
        if not user.get("activo", True):
            raise Forbidden("Tu cuenta está desactivada")
        token = await self.session_service.create_session(user["id"], ip_address, user_agent)
        return {"token": token, "token_type": "bearer", "rol": user["rol"]}

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        return await self.db.user.get(user_id)

    async def update_user(self, user_id: str, changes: dict) -> dict:
        user = await self.db.user.get(user_id)
        if not user:
            raise NotFound("No se encontró el usuario")
        current = changes.pop("current_password", None)
        if changes.get("password"):
            if not current:
                raise Invalid("Debes proporcionar tu contraseña actual para cambiarla")
            if not await verify_password(current, user["password"]):
                raise Invalid("La contraseña actual es incorrecta")
            changes["password"] = await hash_password(changes["password"])
        else:
            changes.pop("password", None)
        if user["rol"] != "locatario":  # estos campos solo aplican a locatarios
            for k in ("nombre_negocio", "ubicacion", "horario"):
                changes.pop(k, None)
        updated = await self.db.user.update(user_id, changes)
        if "password" in changes:  # cambio de contraseña: cierra todas las sesiones
            await self.session_service.invalidate_all_sessions(user_id)
        return updated

    # ---- administración (rol PRO) ----
    async def list_users(self, rol: Optional[str] = None) -> list[dict]:
        return await (self.db.user.find(rol=rol) if rol else self.db.user.find())

    async def admin_update(self, user_id: str, acting_id: str, changes: dict) -> dict:
        if user_id == acting_id and (changes.get("activo") is False or ("rol" in changes and changes["rol"] != "pro")):
            raise Conflict("Un PRO no puede desactivarse ni quitarse su propio rol")
        user = await self.db.user.get(user_id)
        if not user:
            raise NotFound("No se encontró el usuario")
        if changes.get("rol") == "locatario" and not (user.get("nombre_negocio") and user.get("ubicacion")):
            raise Conflict("Para volverlo locatario debe tener nombre_negocio y ubicacion")
        updated = await self.db.user.update(user_id, changes)
        if changes.get("activo") is False or "rol" in changes:
            await self.session_service.invalidate_all_sessions(user_id)
        return updated

    async def admin_reset_password(self, user_id: str, new_password: str) -> int:
        if not await self.db.user.get(user_id):
            raise NotFound("No se encontró el usuario")
        await self.db.user.update(user_id, {"password": await hash_password(new_password)})
        return await self.session_service.invalidate_all_sessions(user_id)
