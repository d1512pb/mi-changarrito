"""Datos de demo. SOLO desarrollo: todos los usuarios usan la contraseña Demo1234.

  locatarios : loc1@changarrito.mx ... loc4@changarrito.mx
  consumidor : consumidor@changarrito.mx
  seguridad  : seguridad@changarrito.mx
  pro        : pro@changarrito.mx
"""
import uuid
from datetime import timedelta

from app.core.config import settings
from app.services.offer_service import now
from app.services.user_service import UserService

DEMO_PASSWORD = "Demo1234"

MERCHANTS = [
    ("Fruta y Verdura Doña Lupe", 19.4326, -99.1332, "Centro, Calle Bolivia 12", "8:00 a 18:00"),
    ("Tortillería La Güera", 19.3467, -99.1617, "Coyoacán, Av. Hidalgo 44", "6:00 a 20:00"),
    ("Abarrotes El Güero", 19.3587, -99.0555, "Iztapalapa, Calle 5 #101", "7:00 a 22:00"),
    ("Tianguis Sobre Ruedas Lunes", 19.4285, -99.1277, "Centro, Calle Regina", "9:00 a 15:00"),
]

# (locatario_idx, producto, precio, unidad, descripcion, horas_vigencia)
OFFERS = [
    (0, "Limón", 28, "kg", "Limón con semilla, de la semana", 10),
    (0, "Jitomate", 32, "kg", "Jitomate saladet", 10),
    (0, "Aguacate Hass", 70, "kg", None, 6),
    (0, "Cebolla blanca", 24, "kg", None, 10),
    (1, "Tortillas de maíz", 24, "kg", "Recién hechas, azul y blanca", 8),
    (1, "Tostadas", 18, "paquete", None, 8),
    (2, "Huevo", 52, "kg", "Huevo blanco", 12),
    (2, "Leche entera", 26, "litro", "Marcas conocidas", 12),
    (2, "Frijol negro", 38, "kg", None, 24),
    (3, "Plátano tabasco", 22, "kg", None, 5),
    (3, "Papaya", 30, "kg", "Papaya maradol madura", 5),
    (3, "Nopales limpios", 20, "kg", None, 5),
]


async def seed(db):
    users = UserService(db)
    merchants = []
    for i, (negocio, lat, lng, direccion, horario) in enumerate(MERCHANTS, start=1):
        merchants.append(await users.create_user({
            "email": f"loc{i}@changarrito.mx", "password": DEMO_PASSWORD, "nombre": f"Locatario {i}",
            "rol": "locatario", "nombre_negocio": negocio, "horario": horario,
            "ubicacion": {"lat": lat, "lng": lng, "direccion": direccion},
        }))
    for email, nombre, rol in [("consumidor@changarrito.mx", "Vecina Demo", "consumidor"),
                               ("seguridad@changarrito.mx", "Guardia Demo", "seguridad"),
                               ("pro@changarrito.mx", "Equipo PRO", "pro")]:
        await users.create_user({"email": email, "password": DEMO_PASSWORD, "nombre": nombre, "rol": rol})

    t = now()

    async def add(m, producto, precio, unidad, desc, estado, vigente_hasta, confirmado_en):
        await db.offer.insert({
            "id": uuid.uuid4().hex, "id_merchant": m["id"], "negocio": m["nombre_negocio"],
            "producto": producto, "precio_declarado": float(precio), "unidad": unidad,
            "descripcion": desc, "horario": m["horario"], "ubicacion": m["ubicacion"],
            "estado": estado, "vigente_hasta": vigente_hasta, "confirmado_en": confirmado_en,
            "foto_url": None, "texto_original": None,
            "campos_faltantes": [], "campos_ambiguos": [], "reportes": [], "creado_en": t,
        })

    for idx, producto, precio, unidad, desc, horas in OFFERS:
        await add(merchants[idx], producto, precio, unidad, desc, "publicada",
                  t + timedelta(hours=horas), t - timedelta(minutes=10 * (idx + 1)))
    # casos para probar que lo terminado no se recomienda: una agotada y una vencida
    await add(merchants[1], "Masa para tamales", 20, "kg", None, "agotada",
              t + timedelta(hours=4), t - timedelta(hours=2))
    await add(merchants[2], "Pan de caja", 45, "pieza", None, "publicada",
              t - timedelta(hours=1), t - timedelta(hours=9))


async def ensure_pro(db):
    """Primer PRO en producción, desde PRO_EMAIL y PRO_PASSWORD."""
    users = UserService(db)
    if settings.PRO_EMAIL and settings.PRO_PASSWORD and not await users.email_exists(settings.PRO_EMAIL):
        await users.create_user({"email": settings.PRO_EMAIL, "password": settings.PRO_PASSWORD,
                                 "nombre": "PRO", "rol": "pro"})
