from typing import List, Optional
from fastapi import APIRouter, Depends, status

from app.api.dependencies.deps import get_user_service, require_roles
from app.schemas.user_schema import AdminResetPassword, AdminUserCreate, AdminUserUpdate, Rol, UserProfileResponse
from app.services.user_service import UserService
from app.services.market_service import MarketService

router = APIRouter(prefix="/admin", tags=["Admin (PRO)"])
only_pro = require_roles("pro")


@router.get("/users", response_model=List[UserProfileResponse])
async def get_users(rol: Optional[Rol] = None, _: dict = Depends(only_pro),
                    service: UserService = Depends(get_user_service)):
    return await service.list_users(rol)


@router.post("/users", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: AdminUserCreate, actor: dict = Depends(only_pro),
                      service: UserService = Depends(get_user_service)):
    """Único camino para crear usuarios seguridad o pro."""
    return await MarketService(service.db).create_managed_user(data.model_dump(), actor)


@router.patch("/users/{user_id}", response_model=UserProfileResponse)
async def update_user(user_id: str, data: AdminUserUpdate, current_user: dict = Depends(only_pro),
                      service: UserService = Depends(get_user_service)):
    """Cambiar rol o activar/desactivar. Cierra las sesiones de ese usuario."""
    return await service.admin_update(user_id, current_user["id"], data.model_dump(exclude_unset=True))


@router.post("/users/{user_id}/reset_password")
async def reset_password(user_id: str, data: AdminResetPassword, _: dict = Depends(only_pro),
                         service: UserService = Depends(get_user_service)):
    """Para quien olvidó su contraseña: fija una nueva y cierra sus sesiones."""
    closed = await service.admin_reset_password(user_id, data.new_password)
    return {"message": f"Contraseña actualizada; se cerraron {closed} sesiones"}
