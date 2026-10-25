from typing import List, Optional
from fastapi import APIRouter, Depends

from app.api.dependencies.deps import get_offer_service, require_roles
from app.schemas.moderation_schema import ResponseModerationOffer, SuspendOffer
from app.schemas.offer_schema import Estado
from app.services.offer_service import OfferService

router = APIRouter(prefix="/moderation", tags=["Moderation"])
staff = require_roles("seguridad", "pro")


@router.get("/", response_model=List[ResponseModerationOffer])
async def get_all_offers(estado: Optional[Estado] = None, solo_reportadas: bool = False,
                         _: dict = Depends(staff), service: OfferService = Depends(get_offer_service)):
    """Todas las ofertas de todos los estados; las más reportadas primero."""
    return await service.moderation_list(estado, solo_reportadas)


@router.post("/suspend/{offer_id}", response_model=ResponseModerationOffer)
async def suspend_offer(offer_id: str, data: SuspendOffer, current_user: dict = Depends(staff),
                        service: OfferService = Depends(get_offer_service)):
    return await service.suspend(offer_id, current_user["id"], data.motivo)


@router.post("/reinstate/{offer_id}", response_model=ResponseModerationOffer)
async def reinstate_offer(offer_id: str, _: dict = Depends(staff), service: OfferService = Depends(get_offer_service)):
    """Vuelve a su estado previo y limpia los reportes."""
    return await service.reinstate(offer_id)


@router.post("/dismiss_reports/{offer_id}", response_model=ResponseModerationOffer)
async def dismiss_reports(offer_id: str, _: dict = Depends(staff), service: OfferService = Depends(get_offer_service)):
    """Revisó los reportes y no procede suspender."""
    return await service.dismiss_reports(offer_id)
