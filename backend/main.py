import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin, ai, moderation, offer, session, user
from app.api.dependencies.deps import bearer, get_current_user
from app.core.config import settings
from app.core.database import database, get_database
from app.core.errors import DomainError, NotFound, Unauthorized
from app.middleware.session_middleware import SessionInfoMiddleware
from app.seed import ensure_pro, seed
from app.services.offer_service import effective
from app.services.storage import signed_photo_url, valid_photo_name

if not settings.s3_enabled:
    Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_startup()
    await database.connect()
    try:
        db = await get_database()
        if settings.SEED_ON_START:
            await seed(db)
        await ensure_pro(db)
        yield
    finally:
        await database.disconnect()


app = FastAPI(
    title="Mi Changarrito API",
    description="Comercio barrial con ofertas revisadas y vigentes.",
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


for route in (user.router, session.router, offer.router, moderation.router, admin.router, ai.router):
    app.include_router(route)
    app.include_router(route, prefix="/api")


@app.middleware("http")
async def response_cache_policy(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(("/api", "/user", "/session", "/offer", "/moderation", "/admin", "/ai", "/uploads")):
        response.headers["Cache-Control"] = "no-store"
    elif request.url.path in ("/", "/index.html", "/sw.js"):
        response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/health")
async def health():
    try:
        await database.ping()
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "schema_version": "1.0"})
    return {"status": "ok", "schema_version": "1.0", "database": database.backend,
            "storage": "s3" if settings.s3_enabled else "local"}


@app.get("/uploads/{name}")
async def uploaded_photo(name: str, request: Request, db=Depends(get_database)):
    if not valid_photo_name(name):
        raise NotFound("No se encontró la imagen")
    documents = await db.offer.find(foto_url=f"/uploads/{name}")
    if not documents:
        raise NotFound("No se encontró la imagen")
    is_public = any(effective(doc)["estado"] == "publicada" for doc in documents)
    if not is_public:
        credentials = await bearer(request)
        if not credentials:
            raise NotFound("No se encontró la imagen")
        try:
            current_user = await get_current_user(credentials=credentials, db=db)
        except Unauthorized:
            raise NotFound("No se encontró la imagen") from None
        can_read = current_user["rol"] in ("seguridad", "pro") or any(
            doc["id_merchant"] == current_user["id"] for doc in documents
        )
        if not can_read:
            raise NotFound("No se encontró la imagen")
    if settings.s3_enabled:
        url = await asyncio.to_thread(signed_photo_url, name)
        return RedirectResponse(url, status_code=302, headers={"Cache-Control": "private, no-store"})
    path = Path(settings.UPLOADS_DIR) / name
    if not path.is_file():
        raise NotFound("No se encontró la imagen")
    return FileResponse(path, headers={"Cache-Control": "private, no-store"})


@app.get("/api")
async def root():
    return {
        "message": "Bienvenido a la API de Mi Changarrito",
        "version": "0.1.0",
        "docs": "/docs"
    }


frontend_dir = Path(__file__).resolve().parents[1] / "fronted"
if frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
