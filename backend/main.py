from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, moderation, offer, session, user
from app.core.config import settings
from app.core.database import database, get_database
from app.core.errors import DomainError
from app.middleware.session_middleware import SessionInfoMiddleware
from app.seed import ensure_pro, seed

Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "production":
        if settings.SESSION_SECRET == "dev-secret-cambia-esto":
            raise RuntimeError("Define un SESSION_SECRET propio en production")
        if settings.SEED_ON_START:
            raise RuntimeError("SEED_ON_START debe ser false en production (usuarios de demo con contraseña conocida)")
    await database.connect()
    db = await get_database()
    if settings.SEED_ON_START:
        await seed(db)
    await ensure_pro(db)

    yield

    await database.disconnect()


app = FastAPI(
    title="Mi Changarrito API",
    description="xd",
    version="0.1.0",
    lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGIN,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.add_middleware(SessionInfoMiddleware)


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, **exc.extra})


app.include_router(user.router, tags=["User"])
app.include_router(session.router, tags=["Sessions"])
app.include_router(offer.router, tags=["Offer"])
app.include_router(moderation.router, tags=["Moderation"])
app.include_router(admin.router, tags=["Admin"])
app.mount("/uploads", StaticFiles(directory=settings.UPLOADS_DIR), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "Bienvenido a la API de Mi Changarrito",
        "version": "0.1.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
