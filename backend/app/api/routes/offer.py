from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from app.api.dependencies.deps import get_offer_service, require_roles
from app.core.config import settings
from app.schemas.offer_schema import PublishOffer, ReportOffer, ResponseOffer, UpdateOffer
from app.services.offer_service import OfferService
from app.services.storage import save_photo

router = APIRouter(prefix="/offer", tags=["Offer"])


# ---- público (vecinos, sin cuenta) ----
# OJO: /search y /mine van antes de /{offer_id} para que no los capture como id.
@router.get("/search", response_model=List[ResponseOffer])
async def search_offers(
    q: Optional[str] = Query(None, description="Producto o negocio"),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    radio: float = Query(3.0, gt=0, le=50, description="Radio en km (solo con lat/lng)"),
    limit: int = Query(30, ge=1, le=100),
    service: OfferService = Depends(get_offer_service),
):
    return await service.search(q, lat, lng, radio, limit)


# ---- locatario ----
@router.get("/mine", response_model=List[ResponseOffer])
async def get_my_offers(current_user: dict = Depends(require_roles("locatario")),
                        service: OfferService = Depends(get_offer_service)):
    """Mis ofertas en todos los estados (incluye suspendidas con su motivo)."""
    return await service.list_mine(current_user["id"])


@router.get("/{offer_id}", response_model=ResponseOffer)
async def get_offer_details(offer_id: str, service: OfferService = Depends(get_offer_service)):
    return await service.get_public(offer_id)


@router.post("/draft", response_model=ResponseOffer, status_code=status.HTTP_201_CREATED)
async def create_draft(
    texto: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_roles("locatario")),
    service: OfferService = Depends(get_offer_service),
):
    """multipart/form-data con `texto` y/o `foto`. Devuelve el borrador con
    campos_faltantes y campos_ambiguos para que el front los resalte."""
    imagen = mime = foto_url = None
    if foto is not None and foto.filename:
        imagen, mime = await foto.read(), foto.content_type
        foto_url = save_photo(imagen, mime, settings.UPLOADS_DIR, settings.MAX_PHOTO_MB)
    return await service.create_draft(current_user, texto, imagen, mime, foto_url)


@router.put("/update/{offer_id}", response_model=ResponseOffer)
async def update_offer(offer_id: str, offer_update: UpdateOffer,
                       current_user: dict = Depends(require_roles("locatario")),
                       service: OfferService = Depends(get_offer_service)):
    """Corrige un borrador. Si estaba publicada, vuelve a borrador (hay que reconfirmar)."""
    return await service.update(offer_id, current_user["id"], offer_update.model_dump(exclude_unset=True))


@router.post("/publish/{offer_id}", response_model=ResponseOffer)
async def publish_offer(offer_id: str, data: PublishOffer = PublishOffer(),
                        current_user: dict = Depends(require_roles("locatario")),
                        service: OfferService = Depends(get_offer_service)):
    return await service.publish(offer_id, current_user["id"], data.vigencia_horas, data.vigente_hasta)


@router.post("/sold_out/{offer_id}", response_model=ResponseOffer)
async def sold_out(offer_id: str, current_user: dict = Depends(require_roles("locatario")),
                   service: OfferService = Depends(get_offer_service)):
    return await service.sold_out(offer_id, current_user["id"])


# ---- consumidor ----
@router.post("/report/{offer_id}", response_model=dict, status_code=status.HTTP_201_CREATED)
async def report_offer(offer_id: str, data: ReportOffer,
                       current_user: dict = Depends(require_roles("consumidor")),
                       service: OfferService = Depends(get_offer_service)):
    """El vecino avisa que una oferta es falsa o está mal. Llega a la cola de seguridad."""
    await service.report(offer_id, current_user["id"], data.motivo)
    return {"message": "Gracias, tu reporte fue enviado"}
