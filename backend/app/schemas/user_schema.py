from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.schemas.offer_schema import Ubicacion

Rol = Literal["locatario", "seguridad", "consumidor", "pro"]


class _UserBase(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    nombre: str = Field(..., min_length=1, max_length=120)
    nombre_negocio: Optional[str] = Field(None, min_length=1, max_length=120) #solo locatarios
    ubicacion: Optional[Ubicacion] = None
    horario: Optional[str] = Field(None, max_length=120)

    @model_validator(mode="after")
    def _locatario_needs_business(self):
        if getattr(self, "rol", None) == "locatario" and not (self.nombre_negocio and self.ubicacion):
            raise ValueError("Un locatario necesita nombre_negocio y ubicacion")
        return self


class UserCreate(_UserBase):
    rol: Literal["locatario", "consumidor"] = "consumidor"


class AdminUserCreate(_UserBase):
    rol: Rol


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=72)


class UserLoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    rol: Rol


class UserUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=120)
    nombre_negocio: Optional[str] = Field(None, min_length=1, max_length=120)
    ubicacion: Optional[Ubicacion] = None
    horario: Optional[str] = Field(None, max_length=120)
    password: Optional[str] = Field(None, min_length=8, max_length=72)
    current_password: Optional[str] = Field(None, max_length=72)


class AdminUserUpdate(BaseModel):
    rol: Optional[Rol] = None
    activo: Optional[bool] = None


class AdminResetPassword(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=72)


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    nombre: str
    rol: Rol
    activo: bool = True
    nombre_negocio: Optional[str] = None
    ubicacion: Optional[Ubicacion] = None
    horario: Optional[str] = None
