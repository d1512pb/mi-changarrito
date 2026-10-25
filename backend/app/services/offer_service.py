import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.errors import Conflict, Invalid, NotFound
from app.services.ai_extractor import OfferExtractor
from app.services.geo import haversine_km, norm

# Sin estos campos no se puede publicar.
REQUIRED = ["negocio", "producto", "precio_declarado", "ubicacion"]


def now() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def missing_fields(doc: dict) -> list[str]:
    return [f for f in REQUIRED if doc.get(f) in (None, "")]


def effective(doc: dict) -> dict:
    """Una oferta publicada con vigencia pasada se trata como 'vencida' al leerla.
    No hace falta ningún job que cambie estados."""
    if doc["estado"] == "publicada" and aware(doc["vigente_hasta"]) <= now():
        doc = {**doc, "estado": "vencida"}
    return doc


class OfferService:
    def __init__(self, db, extractor: OfferExtractor):
        self.db = db
        self.offers = db.offer
        self.extractor = extractor

    # ---------- locatario ----------
    async def create_draft(self, merchant: dict, texto: Optional[str], imagen: Optional[bytes],
                           mime: Optional[str], foto_url: Optional[str]) -> dict:
        if not texto and not imagen:
            raise Invalid("Envía una foto o un texto con tu oferta")
        ext = await self.extractor.extract(texto, imagen, mime)
        doc = {
            "id": uuid.uuid4().hex,
            "id_merchant": merchant["id"],
            "negocio": merchant["nombre_negocio"],
            "producto": None, "precio_declarado": None, "unidad": None, "descripcion": None,
            "horario": merchant.get("horario"),
            "ubicacion": merchant["ubicacion"],
            **ext.campos,
            "estado": "borrador",
            "vigente_hasta": None,
            "confirmado_en": None,
            "foto_url": foto_url,
            "texto_original": texto,
            "campos_ambiguos": ext.ambiguos,
            "reportes": [],
            "creado_en": now(),
        }
        doc["campos_faltantes"] = missing_fields(doc)
        return await self.offers.insert(doc)

    async def _own(self, offer_id: str, merchant_id: str) -> dict:
        doc = await self.offers.get(offer_id)
        # 404 también si es de otro locatario: no revelamos que existe
        if not doc or doc["id_merchant"] != merchant_id:
            raise NotFound("No se encontró la oferta")
        if doc["estado"] == "suspendida":
            raise Conflict("Tu oferta fue suspendida por seguridad", {"motivo_suspension": doc.get("motivo_suspension")})
        return doc

    async def update(self, offer_id: str, merchant_id: str, changes: dict) -> dict:
        doc = await self._own(offer_id, merchant_id)
        if effective(doc)["estado"] in ("agotada", "vencida"):
            raise Conflict("Esta oferta ya no se puede editar; crea una nueva")
        merged = {**doc, **changes}
        changes["campos_faltantes"] = missing_fields(merged)
        changes["campos_ambiguos"] = [c for c in doc["campos_ambiguos"] if c not in changes]
        if doc["estado"] == "publicada":  # editar una publicada obliga a reconfirmar
            changes.update(estado="borrador", confirmado_en=None, vigente_hasta=None)
        return await self.offers.update(offer_id, changes)

    async def publish(self, offer_id: str, merchant_id: str, vigencia_horas: Optional[int],
                      vigente_hasta: Optional[datetime]) -> dict:
        doc = await self._own(offer_id, merchant_id)
        if effective(doc)["estado"] in ("agotada", "vencida"):
            raise Conflict("Esta oferta ya terminó; crea una nueva")
        faltan = missing_fields(doc)
        if faltan:
            raise Invalid("Faltan datos para publicar", {"campos_faltantes": faltan})
        t = now()
        hasta = aware(vigente_hasta) if vigente_hasta else t + timedelta(hours=vigencia_horas or 24)
        if hasta <= t:
            raise Invalid("La vigencia debe estar en el futuro")
        return await self.offers.update(offer_id, {
            "estado": "publicada", "vigente_hasta": hasta, "confirmado_en": t,
            "campos_faltantes": [], "campos_ambiguos": [],
        })

    async def sold_out(self, offer_id: str, merchant_id: str) -> dict:
        doc = await self._own(offer_id, merchant_id)
        if effective(doc)["estado"] != "publicada":
            raise Conflict("Solo se puede marcar como agotada una oferta publicada y vigente")
        return await self.offers.update(offer_id, {"estado": "agotada"})

    async def list_mine(self, merchant_id: str) -> list[dict]:
        docs = [effective(d) for d in await self.offers.find(id_merchant=merchant_id)]
        return sorted(docs, key=lambda d: d["creado_en"], reverse=True)

    # ---------- público ----------
    async def get_public(self, offer_id: str) -> dict:
        doc = await self.offers.get(offer_id)
        if not doc or doc["estado"] in ("borrador", "suspendida"):
            raise NotFound("No se encontró la oferta")
        return effective(doc)  # agotada/vencida se muestran como tales, nunca como disponibles

    async def search(self, q: Optional[str], lat: Optional[float], lng: Optional[float],
                     radio_km: float, limit: int) -> list[dict]:
        docs = [effective(d) for d in await self.offers.find(estado="publicada")]
        docs = [d for d in docs if d["estado"] == "publicada"]  # descarta las vencidas
        if q:
            terms = norm(q).split()

            def match(d):
                hay = norm(" ".join(filter(None, [d["producto"], d["negocio"], d.get("descripcion")])))
                return all(t in hay for t in terms)

            docs = [d for d in docs if match(d)]
        if lat is not None and lng is not None:
            for d in docs:
                u = d["ubicacion"]
                d["distancia_km"] = round(haversine_km(lat, lng, u["lat"], u["lng"]), 2)
            docs = [d for d in docs if d["distancia_km"] <= radio_km]
            docs.sort(key=lambda d: d["distancia_km"])
        else:
            docs.sort(key=lambda d: d["confirmado_en"], reverse=True)
        return docs[:limit]

    # ---------- consumidor ----------
    async def report(self, offer_id: str, user_id: str, motivo: str) -> None:
        doc = await self.get_public(offer_id)
        if any(r["id_user"] == user_id for r in doc.get("reportes", [])):
            raise Conflict("Ya reportaste esta oferta")
        reportes = [*doc.get("reportes", []), {"id_user": user_id, "motivo": motivo, "creado_en": now().isoformat()}]
        await self.offers.update(offer_id, {"reportes": reportes})

    # ---------- seguridad / PRO ----------
    async def moderation_list(self, estado: Optional[str], solo_reportadas: bool) -> list[dict]:
        docs = [effective(d) for d in await self.offers.find()]
        if estado:
            docs = [d for d in docs if d["estado"] == estado]
        if solo_reportadas:
            docs = [d for d in docs if d.get("reportes")]
        return sorted(docs, key=lambda d: (len(d.get("reportes", [])), d["creado_en"]), reverse=True)

    async def _any(self, offer_id: str) -> dict:
        doc = await self.offers.get(offer_id)
        if not doc:
            raise NotFound("No se encontró la oferta")
        return doc

    async def suspend(self, offer_id: str, actor_id: str, motivo: str) -> dict:
        doc = await self._any(offer_id)
        if doc["estado"] == "suspendida":
            raise Conflict("La oferta ya está suspendida")
        return await self.offers.update(offer_id, {
            "estado_previo": doc["estado"], "estado": "suspendida",
            "motivo_suspension": motivo, "suspendida_por": actor_id,
        })

    async def reinstate(self, offer_id: str) -> dict:
        doc = await self._any(offer_id)
        if doc["estado"] != "suspendida":
            raise Conflict("La oferta no está suspendida")
        # vuelve a su estado previo; si su vigencia ya pasó, effective() la mostrará como vencida
        return await self.offers.update(offer_id, {
            "estado": doc.get("estado_previo") or "borrador", "estado_previo": None,
            "motivo_suspension": None, "suspendida_por": None, "reportes": [],
        })

    async def dismiss_reports(self, offer_id: str) -> dict:
        await self._any(offer_id)
        return await self.offers.update(offer_id, {"reportes": []})
