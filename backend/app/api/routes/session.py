from fastapi import APIRouter, Depends

from app.api.dependencies.deps import get_current_user, get_session_service, require_roles
from app.core.config import settings
from app.schemas.session_schema import ActiveSessionsResponse
from app.services.session_service import SessionService

router = APIRouter(prefix="/session", tags=["Sessions"])


@router.get("/active", response_model=ActiveSessionsResponse)
async def get_active_sessions(current_user: dict = Depends(get_current_user),
                              service: SessionService = Depends(get_session_service)):
    sessions = await service.get_active_sessions(current_user["id"])
    return {"active_sessions": sessions, "total": len(sessions), "max_allowed": settings.MAX_SESSIONS_PER_USER}


@router.post("/logout_all/{user_id}")
async def invalidate_all_user_sessions(user_id: str, _: dict = Depends(require_roles("pro")),
                                       service: SessionService = Depends(get_session_service)):
    count = await service.invalidate_all_sessions(user_id)
    return {"message": f"Se cerraron {count} sesiones en todos los dispositivos"}
