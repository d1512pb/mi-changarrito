from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.database import get_database
from app.core.errors import Forbidden, Unauthorized
from app.services.ai_extractor import get_extractor
from app.services.offer_service import OfferService
from app.services.session_service import SessionService
from app.services.user_service import UserService

bearer = HTTPBearer(auto_error=False)


async def get_user_service(db=Depends(get_database)):
    return UserService(db)


async def get_session_service(db=Depends(get_database)):
    return SessionService(db)


async def get_offer_service(db=Depends(get_database)):
    return OfferService(db, get_extractor())


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db=Depends(get_database),
) -> dict:
    """Sesión por header `Authorization: Bearer <token>` (sin cookies)."""
    if not credentials:
        raise Unauthorized("No autorizado")
    session = await SessionService(db).validate_session(credentials.credentials)
    if not session:
        raise Unauthorized("Sesión inválida o expirada")
    user = await UserService(db).get_user_profile(session["user_id"])
    if not user:
        raise Unauthorized("Sesión inválida o expirada")
    if not user.get("activo", True):
        raise Forbidden("Tu cuenta está desactivada")
    user.pop("password", None)
    return user


def require_roles(*roles: str):
    """Uso: Depends(require_roles("seguridad", "pro"))"""
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["rol"] not in roles:
            raise Forbidden("No tienes los permisos suficientes")
        return user
    return checker
