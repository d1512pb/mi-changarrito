from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies.deps import bearer, get_current_user, get_user_service
from app.schemas.user_schema import UserCreate, UserLogin, UserLoginResponse, UserProfileResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["User"])


@router.post("/register", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, service: UserService = Depends(get_user_service)):
    """Registro público de locatario o consumidor."""
    return await service.create_user(user_data.model_dump())


@router.post("/login", response_model=UserLoginResponse)
async def login_user(user_data: UserLogin, request: Request, service: UserService = Depends(get_user_service)):
    """Devuelve `token`. El front lo guarda y lo manda como `Authorization: Bearer <token>`."""
    return await service.login_user(user_data.email, user_data.password,
                                    request.state.client_ip, request.state.user_agent)


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user


@router.put("/update", response_model=UserProfileResponse)
async def update_user(user_update: UserUpdate, current_user: dict = Depends(get_current_user),
                      service: UserService = Depends(get_user_service)):
    return await service.update_user(current_user["id"], user_update.model_dump(exclude_unset=True))


@router.post("/logout")
async def logout_user(credentials: HTTPAuthorizationCredentials = Depends(bearer),
                      current_user: dict = Depends(get_current_user),
                      service: UserService = Depends(get_user_service)):
    await service.session_service.invalidate_session(credentials.credentials)
    return {"message": "Sesión cerrada exitosamente"}


@router.post("/logout_all")
async def close_all_sessions(current_user: dict = Depends(get_current_user),
                             service: UserService = Depends(get_user_service)):
    count = await service.session_service.invalidate_all_sessions(current_user["id"])
    return {"message": f"Se cerraron {count} sesiones en todos los dispositivos"}
