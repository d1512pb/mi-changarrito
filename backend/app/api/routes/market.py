from fastapi import APIRouter, Depends, status

from app.api.dependencies.deps import require_roles
from app.core.database import get_database
from app.schemas.market_schema import MarketCreate, MarketResponse, StallCreate, StallStatus
from app.schemas.user_schema import AdminResetPassword, UserProfileResponse
from app.services.market_service import MarketService

router = APIRouter(tags=["Tianguis"])
manager = require_roles("gerente")
administrator = require_roles("pro")


@router.get("/tianguis", response_model=list[MarketResponse])
async def public_markets(db=Depends(get_database)):
    return await MarketService(db).list_public()


@router.get("/admin/tianguis", response_model=list[MarketResponse])
async def admin_markets(_=Depends(administrator), db=Depends(get_database)):
    return await db.tianguis.find()


@router.post("/admin/tianguis", response_model=MarketResponse, status_code=status.HTTP_201_CREATED)
async def create_market(data: MarketCreate, _=Depends(administrator), db=Depends(get_database)):
    return await MarketService(db).create_market(data.model_dump())


@router.get("/management/tianguis", response_model=list[MarketResponse])
async def manager_markets(actor=Depends(manager), db=Depends(get_database)):
    return await MarketService(db).manager_markets(actor)


@router.get("/management/stalls", response_model=list[UserProfileResponse])
async def manager_stalls(actor=Depends(manager), db=Depends(get_database)):
    return await MarketService(db).manager_stalls(actor)


@router.post("/management/stalls", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_stall(data: StallCreate, actor=Depends(manager), db=Depends(get_database)):
    return await MarketService(db).create_stall(data.model_dump(), actor)


@router.patch("/management/stalls/{user_id}", response_model=UserProfileResponse)
async def stall_status(user_id: str, data: StallStatus, actor=Depends(manager), db=Depends(get_database)):
    return await MarketService(db).set_stall_status(user_id, data.activo, actor)


@router.post("/management/stalls/{user_id}/reset_password")
async def reset_stall_password(user_id: str, data: AdminResetPassword, actor=Depends(manager), db=Depends(get_database)):
    await MarketService(db).reset_stall_password(user_id, data.new_password, actor)
    return {"message": "Contraseña actualizada y sesiones anteriores cerradas"}
