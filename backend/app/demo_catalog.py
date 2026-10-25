"""Catálogo de demostración: tianguis oficiales con puestos y ofertas SINTÉTICAS.

Sólo se carga con DEMO_CATALOG=true y sólo escribe datos públicos: tianguis y ofertas. No crea
usuarios, contraseñas ni sesiones; las cuentas reales (administrador, gerentes, puestos) se
siguen creando desde la aplicación.

- Tianguis: ubicación, día y horario tomados del conjunto «Tianguis de la Ciudad de México» de
  SEDECO (https://datos.cdmx.gob.mx/dataset/tianguis-de-la-ciudad-de-mexico, CC-BY-4.0-ESP). El
  conjunto no trae el nombre comercial; se usa el del propio registro o «Tianguis <colonia>».
- Puestos, productos y precios: inventados para la demostración. Todo documento lleva
  is_demo=true y un id «demo-…»; los ids permiten borrarlos o refrescarlos sin tocar datos reales.
- Cada arranque renueva vigencia y estado de las ofertas de demostración, así que siempre
  aparecen vigentes mientras DEMO_CATALOG esté activo.
"""
import random
from datetime import timedelta

from app.services.offer_service import now

VIGENCIA_DIAS = 14

# (clave, nombre, dirección, lat, lng, horario)
TIANGUIS = [
    ("medellin", "Tianguis Medellín", "Medellín, entre Insurgentes y Yucatán · Roma Norte, Cuauhtémoc",
     19.414894, -99.165415, "Viernes · 7:00 a 17:00 h"),
    ("oro", "Tianguis Oro", "Oro, entre Monterrey y Plaza de la Cibeles · Roma Norte, Cuauhtémoc",
     19.419350, -99.165173, "Miércoles · 7:00 a 17:00 h"),
    ("mercado-100", "Mercado el 100", "Orizaba esq. Manuel Antonio Anzures, Plaza del Lanzador · Roma Sur, Cuauhtémoc",
     19.411539, -99.158014, "Domingo · 7:00 a 17:00 h"),
    ("san-felipe", "Tianguis San Felipe de Jesús", "Villa de Ayala, entre Cuautla y León de los Aldama · San Felipe de Jesús, Gustavo A. Madero",
     19.491765, -99.082171, "Domingo · 7:00 a 17:00 h"),
    ("portales-oriente", "Tianguis Portales Oriente", "Miravalle, entre Presidentes y Fuentes Brotantes · Portales Oriente, Benito Juárez",
     19.366699, -99.139532, "Domingo · 6:00 a 16:00 h"),
    ("villa-coapa", "Tianguis Villa Coapa", "Periférico Sur / Acoxpa y Lateral Cafetales · Villa Coapa, Tlalpan",
     19.289647, -99.115876, "Domingo · 8:00 a 19:00 h"),
    ("moctezuma", "Tianguis Moctezuma 1.ª Sección", "Luis Preciado de la Torre, entre Iztaccíhuatl y Juan A. Gutiérrez · Moctezuma, Venustiano Carranza",
     19.427534, -99.103980, "Sábado · 8:00 a 19:00 h"),
    ("agricola-oriental", "Tianguis Agrícola Oriental VI", "Oriente 257, entre Sur 12 y Sur 16 · Agrícola Oriental, Iztacalco",
     19.394145, -99.062749, "Domingo · 8:00 a 19:00 h"),
    ("claveria", "Tianguis Clavería", "Irapuato, entre Clavería y Egipto · Clavería, Azcapotzalco",
     19.464186, -99.181388, "Jueves · 8:00 a 19:00 h"),
    ("prados-coyoacan", "Tianguis Prados de Coyoacán", "Lira, entre Pléyades y Mar de la Tranquilidad · Prados de Coyoacán, Coyoacán",
     19.317566, -99.131643, "Lunes · 8:00 a 19:00 h"),
]

# (tianguis, negocio, [(producto, precio MXN, unidad, descripción)])
STALLS = [
    ("medellin", "Tacos de Guisado Doña Chela", [
        ("Tacos de guisado", 18, "pieza", "Guisado del día: tinga, chicharrón en salsa verde o papas con chorizo"),
        ("Quesadilla de flor de calabaza", 35, "pieza", "Tortilla de maíz hecha a mano"),
        ("Agua de jamaica", 20, "vaso", "Preparada esta mañana"),
    ]),
    ("medellin", "Tamales Los Cuates", [
        ("Tamal de rajas con queso", 22, "pieza", None),
        ("Tamal de mole", 25, "pieza", "Con pollo deshebrado"),
        ("Atole de champurrado", 25, "vaso", "Con chocolate de metate"),
    ]),
    ("oro", "Panadería La Abuela", [
        ("Pan de muerto", 38, "pieza", "Con naranja y anís, espolvoreado con azúcar"),
        ("Conchas", 14, "pieza", "De vainilla y de chocolate"),
        ("Cuernitos", 16, "pieza", None),
    ]),
    ("oro", "Flor y Tradición", [
        ("Flor de cempasúchil", 35, "manojo", "Para ofrenda de Día de Muertos"),
        ("Papel picado", 30, "paquete", "10 pliegos de colores"),
        ("Cempasúchil en maceta", 60, "pieza", "Planta lista para la ofrenda"),
    ]),
    ("mercado-100", "Fruta y Verdura Doña Lupe", [
        ("Limón con semilla", 32, "kg", "De la semana"),
        ("Aguacate Hass", 78, "kg", "Maduro para hoy"),
        ("Plátano tabasco", 24, "kg", None),
        ("Papaya maradol", 30, "kg", "Madura, sin golpes"),
    ]),
    ("mercado-100", "Verduras Hermanos Ríos", [
        ("Cebolla blanca", 24, "kg", None),
        ("Zanahoria", 18, "kg", "Limpia y sin hoja"),
        ("Papa blanca", 26, "kg", None),
        ("Cilantro", 10, "manojo", "Manojo grande, recién cortado"),
    ]),
    ("san-felipe", "Pollería El Güero", [
        ("Pollo entero", 82, "kg", "Fresco, del día"),
        ("Pechuga de pollo", 118, "kg", "Sin hueso"),
        ("Huevo blanco", 54, "kg", "Huevo de granja"),
    ]),
    ("san-felipe", "Tortillería La Güera", [
        ("Tortillas de maíz", 26, "kg", "Recién hechas, azul y blanca"),
        ("Tostadas", 20, "paquete", "Paquete de 30 piezas"),
        ("Masa para tortillas", 18, "kg", "Maíz nixtamalizado"),
    ]),
    ("portales-oriente", "Frutas Tía Mary", [
        ("Mango ataulfo", 45, "kg", "Dulce y sin hilos"),
        ("Fresa", 65, "kg", "Charola de 1 kg"),
        ("Naranja de jugo", 18, "kg", None),
        ("Sandía", 16, "kg", "Rayada, entera o por rebanada"),
    ]),
    ("portales-oriente", "Abarrotes Don Beto", [
        ("Frijol negro", 42, "kg", "Cosecha nueva"),
        ("Leche entera", 27, "litro", "Pasteurizada"),
        ("Queso Oaxaca", 190, "kg", "En hebra, de leche de vaca"),
    ]),
    ("villa-coapa", "Comida Corrida Sazón de Mamá", [
        ("Comida corrida", 85, "orden", "Sopa, guisado, arroz, frijoles y agua del día"),
        ("Caldo de pollo", 60, "orden", "Con verduras y arroz"),
        ("Agua fresca de horchata", 18, "vaso", None),
    ]),
    ("villa-coapa", "Elotes y Esquites Pepe", [
        ("Elote cocido", 25, "pieza", "Con mayonesa, queso y chile"),
        ("Esquites", 30, "vaso", "Con epazote"),
        ("Elote asado", 28, "pieza", None),
    ]),
    ("moctezuma", "Chiles y Especias La Cholita", [
        ("Chile serrano", 45, "kg", None),
        ("Chile poblano", 55, "kg", "Para chiles rellenos"),
        ("Chile de árbol seco", 30, "bolsa", "Bolsa de 100 g"),
    ]),
    ("moctezuma", "Lácteos Santa Clara", [
        ("Queso panela", 150, "kg", "Fresco"),
        ("Crema de rancho", 38, "frasco", None),
        ("Leche entera", 26, "litro", "Pasteurizada"),
    ]),
    ("agricola-oriental", "Panadería La Espiga", [
        ("Bolillo", 4, "pieza", "Calientito de la mañana"),
        ("Pan de muerto", 35, "pieza", "Con ajonjolí"),
        ("Concha", 12, "pieza", None),
    ]),
    ("agricola-oriental", "Verdura Fresca Doña Ofelia", [
        ("Nopales limpios", 22, "bolsa", "Bolsa de medio kilo, picados"),
        ("Cebolla morada", 28, "kg", None),
        ("Cilantro y perejil", 12, "manojo", None),
    ]),
    ("claveria", "Frutas y Jugos Clavería", [
        ("Jugo de naranja natural", 30, "vaso", "Exprimido al momento"),
        ("Manzana roja", 40, "kg", None),
        ("Plátano", 22, "kg", None),
    ]),
    ("claveria", "Taquería La Esquina", [
        ("Tacos de pastor", 17, "pieza", "Con piña y cebolla"),
        ("Tacos de suadero", 17, "pieza", None),
        ("Agua de jamaica", 18, "vaso", None),
    ]),
    ("prados-coyoacan", "Hierbas y Verdura Prados", [
        ("Hierbabuena", 8, "manojo", None),
        ("Cilantro", 9, "manojo", None),
        ("Zanahoria", 17, "kg", None),
        ("Aguacate criollo", 60, "kg", "Chico, de sabor intenso"),
    ]),
    ("prados-coyoacan", "Antojitos La Lupita", [
        ("Tortillas de maíz", 25, "kg", None),
        ("Gorditas de chicharrón", 20, "pieza", "Rellenas de chicharrón prensado"),
        ("Tamal de elote", 18, "pieza", "Dulce"),
    ]),
]


def market_id(key: str) -> str:
    return f"demo-tianguis-{key}"


def build_markets(t) -> list[dict]:
    return [
        {"id": market_id(key), "nombre": nombre, "ubicacion": {"lat": lat, "lng": lng, "direccion": direccion},
         "horario": horario, "is_demo": True, "activo": True, "creado_en": t}
        for key, nombre, direccion, lat, lng, horario in TIANGUIS
    ]


def build_offers(t) -> list[dict]:
    markets = {m["id"]: m for m in build_markets(t)}
    flat = []
    for number, (key, negocio, products) in enumerate(STALLS, start=1):
        for producto, precio, unidad, descripcion in products:
            flat.append((number, key, negocio, producto, precio, unidad, descripcion))
    # Orden estable pero mezclado, para que el inicio no muestre un solo puesto.
    random.Random(2510).shuffle(flat)
    offers = []
    for index, (number, key, negocio, producto, precio, unidad, descripcion) in enumerate(flat, start=1):
        market = markets[market_id(key)]
        confirmed = t - timedelta(minutes=3 * index)
        offers.append({
            "id": f"demo-oferta-{index:03d}", "id_merchant": f"demo-puesto-{number:02d}",
            "tianguis_id": market["id"], "tianguis_nombre": market["nombre"], "is_demo": True,
            "negocio": negocio, "producto": producto, "precio_declarado": float(precio), "unidad": unidad,
            "descripcion": descripcion, "horario": market["horario"], "ubicacion": market["ubicacion"],
            "estado": "publicada", "vigente_hasta": t + timedelta(days=VIGENCIA_DIAS), "confirmado_en": confirmed,
            "foto_url": None, "texto_original": None, "campos_faltantes": [], "campos_ambiguos": [],
            "extraction_mode": "demo", "reportes": [], "creado_en": confirmed,
        })
    return offers


async def ensure_demo_catalog(db) -> dict:
    """Crea o renueva los tianguis y ofertas de demostración. Idempotente y sin cuentas."""
    t = now()
    created = {"tianguis": 0, "ofertas": 0}
    for market in build_markets(t):
        if await db.tianguis.get(market["id"]) is None:
            await db.tianguis.insert(market)
            created["tianguis"] += 1
    for offer in build_offers(t):
        if await db.offer.get(offer["id"]) is None:
            await db.offer.insert(offer)
            created["ofertas"] += 1
        else:
            await db.offer.update(offer["id"], {key: value for key, value in offer.items() if key != "id"})
    return created
