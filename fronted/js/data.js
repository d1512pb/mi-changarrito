/* Catálogos y datos de demostración.
 * En producción estos datos vienen del backend; Store (store.js) es la única capa que los toca.
 */
const CATEGORIES = ["abarrotes", "ferretería", "frutas", "verduras", "recaudería", "carnicería", "pollería", "pescadería", "papelería", "panadería", "comida", "florería", "decoraciones", "ropa"];
/* Categorías con etiqueta especial (rosa): temporada de Día de Muertos y antojitos. */
const SPECIAL_CATS = ["florería", "decoraciones"];
const CAT_ART = { abarrotes: "bread", "ferretería": null, frutas: "banana", verduras: "carrot", "recaudería": "tomato", "carnicería": null, "pollería": null, "pescadería": null, "papelería": null, "panadería": "bread", comida: "chile", "florería": "marigold", decoraciones: "marigold", ropa: null };
const CAT_ICON = { "ferretería": "tag", "carnicería": "stall", "pollería": "stall", "pescadería": "stall", "papelería": "edit", ropa: "tag" };
const CAT_TONE = { abarrotes: "mostaza", "ferretería": "petroleo", frutas: "cereza", verduras: "turquesa", "recaudería": "turquesa", "carnicería": "tierra", "pollería": "mostaza", "pescadería": "turquesa", "papelería": "lila", "panadería": "mostaza", comida: "tierra", "florería": "rosa", decoraciones: "rosa", ropa: "lila" };
const UNITS = [["kg", "kg"], ["1/2kg", "½ kg"], ["pza", "pieza"], ["manojo", "manojo"], ["docena", "docena"], ["litro", "litro"], ["caja", "caja"], ["bolsa", "bolsa"], ["pliego", "pliego"], ["orden", "orden"], ["vaso", "vaso"]];
const KEY_LABEL = { limon: "limón", platano: "plátano", sandia: "sandía", cempasuchil: "cempasúchil", azucar: "azúcar", camaron: "camarón", "foco led": "foco LED", "agua de jamaica": "agua de jamaica" };
const keyLabel = k => KEY_LABEL[k] || k;
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const ALCALDIAS = [
  { name: "Álvaro Obregón", colonias: ["San Ángel", "Olivar del Conde", "Las Águilas"] },
  { name: "Azcapotzalco", colonias: ["Clavería", "San Juan Tlihuaca", "Santa Bárbara"] },
  { name: "Benito Juárez", colonias: ["Portales", "Narvarte", "Del Valle"] },
  { name: "Coyoacán", colonias: ["Del Carmen", "Santa Úrsula Coapa", "Pedregal de Santo Domingo"] },
  { name: "Cuajimalpa de Morelos", colonias: ["Cuajimalpa Centro", "Contadero"] },
  { name: "Cuauhtémoc", colonias: ["Centro", "Doctores", "Roma Norte"] },
  { name: "Gustavo A. Madero", colonias: ["Lindavista", "San Felipe de Jesús", "Martín Carrera"] },
  { name: "Iztacalco", colonias: ["Agrícola Oriental", "Pantitlán"] },
  { name: "Iztapalapa", colonias: ["San Lorenzo Tezonco", "Santa Cruz Meyehualco", "El Salado"] },
  { name: "La Magdalena Contreras", colonias: ["San Jerónimo Lídice", "El Rosal"] },
  { name: "Miguel Hidalgo", colonias: ["Tacubaya", "Escandón", "Anáhuac"] },
  { name: "Milpa Alta", colonias: ["Villa Milpa Alta", "San Antonio Tecómitl"] },
  { name: "Tláhuac", colonias: ["San Francisco Tlaltenco", "Del Mar"] },
  { name: "Tlalpan", colonias: ["Tlalpan Centro", "Villa Coapa", "Miguel Hidalgo"] },
  { name: "Venustiano Carranza", colonias: ["Jamaica", "Moctezuma", "Morelos"] },
  { name: "Xochimilco", colonias: ["Barrio San Marcos", "Santa Cruz Acalpixca"] }
];

const TIANGUIS = [
  { id: "t-sfj", name: "Tianguis de San Felipe de Jesús", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", days: "Domingos" },
  { id: "t-sdo", name: "Tianguis de Santo Domingo", alcaldia: "Coyoacán", colonia: "Pedregal de Santo Domingo", days: "Martes y domingos" },
  { id: "t-sal", name: "Tianguis El Salado", alcaldia: "Iztapalapa", colonia: "El Salado", days: "Miércoles y domingos" },
  { id: "t-por", name: "Tianguis de Portales", alcaldia: "Benito Juárez", colonia: "Portales", days: "Sábados y domingos" },
  { id: "t-vco", name: "Tianguis de Villa Coapa", alcaldia: "Tlalpan", colonia: "Villa Coapa", days: "Jueves y domingos" },
  { id: "t-jam", name: "Tianguis de Jamaica", alcaldia: "Venustiano Carranza", colonia: "Jamaica", days: "Sábados" }
];

function buildSeed() {
  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  let pid = 0;
  const P = (name, key, price, unit, desc = "") => ({ id: "p" + (++pid), name, key, price, unit, desc });
  const R = (client, stars, text, daysAgo) => ({ client, stars, text, ts: now - daysAgo * D });
  const base = { status: "approved", simulated: true, logs: {}, photos: [], socials: "", phone: "", workers: 1, reviews: [] };
  const biz = [
    { id: "b1", name: "Recaudería Doña Mary", owner: "María Hernández López", curp: "HELM780514MDFRPR04", rfc: "HELM780514QJ2", workers: 2, format: "tianguis", tianguisId: "t-sfj", category: "recaudería", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 3, puesto 41", lat: 19.4975, lng: -99.0718, schedule: { days: [0, 3], open: "07:00", close: "16:00" }, card: false, socials: "facebook.com/recauderiadonamary", phone: "55 3412 8890", description: "Verdura fresca de la Central de Abasto todos los días: jitomate, chiles, aguacate y hierbas de olor.", ownerAccount: "u-ven", createdAt: now - 410 * D,
      products: [P("Jitomate saladet", "jitomate", 28, "kg", "Firme, para salsa o guisado."), P("Cebolla blanca", "cebolla", 24, "kg"), P("Chile serrano", "chile serrano", 40, "kg", "Pica parejo."), P("Limón sin semilla", "limon", 32, "kg"), P("Aguacate Hass", "aguacate", 65, "kg", "Maduro para hoy o para el martes."), P("Cilantro", "cilantro", 10, "manojo")],
      reviews: [R("Ana Torres", 5, "Siempre me aparta el aguacate en su punto.", 3), R("Luis Ortega", 4, "Buen precio en jitomate, a veces se acaba temprano.", 10), R("Carmen Ruiz", 5, "Muy amable y todo fresco.", 17)] },
    { id: "b2", name: "Frutas El Güero", owner: "Raúl Méndez Pineda", curp: "MEPR850921HDFNNL07", rfc: "MEPR850921T88", workers: 3, format: "tianguis", tianguisId: "t-sfj", category: "frutas", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 3, puesto 44", lat: 19.4978, lng: -99.0712, schedule: { days: [0, 3], open: "07:30", close: "15:30" }, card: true, createdAt: now - 300 * D,
      products: [P("Plátano Tabasco", "platano", 22, "kg"), P("Papaya maradol", "papaya", 30, "kg"), P("Sandía", "sandia", 18, "kg", "Dulce, se vende entera o por mitad."), P("Mango Ataúlfo", "mango", 45, "kg"), P("Fresa", "fresa", 50, "caja")],
      reviews: [R("Diana Flores", 5, "La papaya siempre dulce.", 6), R("Iván Cruz", 4, "Aceptan tarjeta, muy práctico.", 12)] },
    { id: "b3", name: "Pollería La Güera", owner: "Guadalupe Soto Rivas", curp: "SORG900130MDFTVD02", rfc: "SORG900130LP5", workers: 2, format: "tianguis", tianguisId: "t-sfj", category: "pollería", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 5, puesto 12", lat: 19.4969, lng: -99.0725, schedule: { days: [0], open: "08:00", close: "15:00" }, card: true, createdAt: now - 220 * D,
      products: [P("Pechuga sin hueso", "pechuga", 135, "kg"), P("Pierna y muslo", "pierna y muslo", 85, "kg"), P("Huevo blanco", "huevo", 44, "kg")],
      reviews: [R("Marco Gil", 4, "Pechuga bien limpia.", 4)] },
    { id: "b4", name: "Carnicería Hermanos Rangel", owner: "Esteban Rangel Ochoa", curp: "RAOE770808HDFNCS09", rfc: "RAOE770808GH1", workers: 4, format: "local", alcaldia: "Gustavo A. Madero", colonia: "Lindavista", address: "Av. Montevideo 318, Lindavista", lat: 19.4883, lng: -99.1287, schedule: { days: [1, 2, 3, 4, 5, 6, 0], open: "08:00", close: "19:00" }, card: true, createdAt: now - 520 * D,
      products: [P("Bistec de res", "bistec", 210, "kg"), P("Carne molida de res", "molida", 160, "kg"), P("Chuleta de cerdo", "chuleta", 120, "kg")],
      reviews: [R("Ana Torres", 5, "El bistec delgadito como lo pido.", 8), R("Paola Vega", 4, "Un poco caro pero de calidad.", 20)] },
    { id: "b5", name: "Panadería La Espiga de Oro", owner: "Fernando Ibarra Luna", curp: "IALF820317HDFBNR05", rfc: "IALF820317AB3", workers: 5, format: "local", alcaldia: "Coyoacán", colonia: "Del Carmen", address: "Calle Carrillo Puerto 22, Del Carmen", lat: 19.3497, lng: -99.1624, schedule: { days: [0, 1, 2, 3, 4, 5, 6], open: "07:00", close: "21:00" }, card: true, createdAt: now - 700 * D,
      products: [P("Bolillo", "bolillo", 3, "pza"), P("Concha", "concha", 12, "pza"), P("Pan de muerto", "pan de muerto", 45, "pza", "De temporada, con azúcar o ajonjolí."), P("Cuernito", "cuernito", 12, "pza")],
      reviews: [R("Sofía Ramos", 5, "El pan de muerto es el mejor de Coyoacán.", 2)] },
    { id: "b6", name: "Florería Cempasúchil", owner: "Rosa Aguilar Neri", curp: "AUNR880605MDFGRS01", rfc: "AUNR880605KK9", workers: 2, format: "tianguis", tianguisId: "t-sdo", category: "florería", alcaldia: "Coyoacán", colonia: "Pedregal de Santo Domingo", address: "Calle Papalotl, entrada sur del tianguis", lat: 19.3271, lng: -99.1679, schedule: { days: [0, 2], open: "07:00", close: "17:00" }, card: false, createdAt: now - 160 * D,
      products: [P("Cempasúchil", "cempasuchil", 60, "manojo", "Para la ofrenda."), P("Terciopelo", "terciopelo", 40, "manojo"), P("Rosas", "rosas", 120, "docena")],
      reviews: [R("Gabriela Peña", 5, "Flor muy fresca para la ofrenda.", 1)] },
    { id: "b7", name: "Abarrotes Lupita", owner: "Guadalupe Martínez Cano", curp: "MACG751112MDFRND08", rfc: "MACG751112PL4", workers: 1, format: "local", alcaldia: "Iztapalapa", colonia: "San Lorenzo Tezonco", address: "Calle Ignacio Zaragoza 145, San Lorenzo Tezonco", lat: 19.3094, lng: -99.0663, schedule: { days: [0, 1, 2, 3, 4, 5, 6], open: "08:00", close: "22:00" }, card: true, createdAt: now - 830 * D,
      products: [P("Frijol negro", "frijol", 38, "kg"), P("Arroz", "arroz", 30, "kg"), P("Aceite vegetal", "aceite", 48, "litro"), P("Azúcar estándar", "azucar", 32, "kg")],
      reviews: [R("Héctor Díaz", 4, "Abren temprano y cierran tarde.", 9)] },
    { id: "b8", name: "Mariscos El Puerto", owner: "Joel Castañeda Ruiz", curp: "CARJ800227HVZSZL03", rfc: "CARJ800227NB2", workers: 3, format: "tianguis", tianguisId: "t-sal", category: "pescadería", alcaldia: "Iztapalapa", colonia: "El Salado", address: "Av. Guelatao, pasillo central", lat: 19.3605, lng: -99.0112, schedule: { days: [0, 3], open: "07:00", close: "15:00" }, card: false, createdAt: now - 260 * D,
      products: [P("Mojarra", "mojarra", 95, "kg"), P("Filete de tilapia", "tilapia", 130, "kg"), P("Camarón mediano", "camaron", 260, "kg")],
      reviews: [R("Lorena Ávila", 4, "Te limpian el pescado al momento.", 5)] },
    { id: "b9", name: "Verduras Doña Chela", owner: "Graciela Pérez Mora", curp: "PEMG690403MDFRRR06", rfc: "PEMG690403CC1", workers: 2, format: "tianguis", tianguisId: "t-sal", category: "verduras", alcaldia: "Iztapalapa", colonia: "El Salado", address: "Av. Guelatao, pasillo 2", lat: 19.3609, lng: -99.0118, schedule: { days: [0, 3], open: "06:30", close: "15:00" }, card: false, createdAt: now - 390 * D,
      products: [P("Papa blanca", "papa", 26, "kg"), P("Zanahoria", "zanahoria", 18, "kg"), P("Calabacita", "calabacita", 24, "kg"), P("Jitomate saladet", "jitomate", 25, "kg"), P("Chile poblano", "chile poblano", 38, "kg")],
      reviews: [R("Tomás León", 5, "La verdura más barata del tianguis.", 7)] },
    { id: "b10", name: "Ferretería El Tornillo Feliz", owner: "Arturo Vázquez Gil", curp: "VAGA710919HDFZLR02", rfc: "VAGA710919MM7", workers: 2, format: "local", alcaldia: "Benito Juárez", colonia: "Portales", address: "Calz. de Tlalpan 1420, Portales", lat: 19.3672, lng: -99.1418, schedule: { days: [1, 2, 3, 4, 5, 6], open: "09:00", close: "19:00" }, card: true, createdAt: now - 640 * D,
      products: [P("Martillo de uña", "martillo", 120, "pza"), P("Cinta de aislar", "cinta de aislar", 18, "pza"), P("Foco LED 9 W", "foco led", 35, "pza")],
      reviews: [R("Ramiro Solís", 5, "Te asesoran bien.", 15)] },
    { id: "b11", name: "Papelería Los Lápices", owner: "Claudia Ortiz Fuentes", curp: "OIFC860722MDFRNL05", rfc: "OIFC860722RT6", workers: 1, format: "local", alcaldia: "Benito Juárez", colonia: "Narvarte", address: "Calle Pitágoras 811, Narvarte", lat: 19.3911, lng: -99.1561, schedule: { days: [1, 2, 3, 4, 5], open: "09:00", close: "20:00" }, card: true, createdAt: now - 450 * D,
      products: [P("Cuaderno profesional", "cuaderno", 35, "pza"), P("Papel de china", "papel de china", 5, "pliego", "Para papel picado."), P("Pluma azul", "pluma", 8, "pza")],
      reviews: [] },
    { id: "b12", name: "Antojitos Doña Rosy", owner: "Rosalía Juárez Toledo", curp: "JUTR810101MDFRLS09", rfc: "JUTR810101HG3", workers: 3, format: "tianguis", tianguisId: "t-por", category: "comida", alcaldia: "Benito Juárez", colonia: "Portales", address: "Calle Santa Cruz, esquina Odesa", lat: 19.3688, lng: -99.1473, schedule: { days: [0, 6], open: "08:00", close: "16:00" }, card: false, createdAt: now - 340 * D,
      products: [P("Quesadilla", "quesadilla", 25, "pza", "De masa azul, con queso o guisado."), P("Tlacoyo", "tlacoyo", 20, "pza"), P("Agua de jamaica", "agua de jamaica", 20, "vaso")],
      reviews: [R("Elena Mora", 5, "Las quesadillas de flor de calabaza, increíbles.", 1), R("Óscar Paz", 4, "Hay que hacer fila pero vale la pena.", 8)] },
    { id: "b13", name: "Ropa y Accesorios Mayra", owner: "Mayra Robles Quintero", curp: "ROQM930514MDFBYN07", rfc: "ROQM930514FF2", workers: 1, format: "tianguis", tianguisId: "t-sfj", category: "ropa", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 8", lat: 19.4965, lng: -99.0731, schedule: { days: [0], open: "09:00", close: "17:00" }, card: true, createdAt: now - 90 * D, photos: [], products: [], description: "Ropa de paca seleccionada, chamarras y accesorios.", reviews: [] },
    { id: "b14", name: "Decoraciones Fiesta Brava", owner: "Iris Domínguez Sáenz", curp: "DOSI950210MDFMNR04", rfc: "DOSI950210UV8", workers: 2, format: "tianguis", tianguisId: "t-sfj", category: "decoraciones", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 9", lat: 19.4962, lng: -99.0738, schedule: { days: [0], open: "09:00", close: "18:00" }, card: false, status: "pending", createdAt: now - 2 * D,
      products: [P("Papel picado", "papel picado", 45, "pza", "Tira de 10 m."), P("Calaverita de azúcar", "calaverita", 15, "pza")], description: "Papel picado, piñatas y adornos de temporada." },
    { id: "b15", name: "Frutas y Verduras La Joya", owner: "Ricardo Núñez Paredes", curp: "NUPR880911HDFXRC06", rfc: "NUPR880911ZX1", workers: 2, format: "tianguis", tianguisId: "t-sfj", category: "recaudería", alcaldia: "Gustavo A. Madero", colonia: "San Felipe de Jesús", address: "Av. San Felipe de Jesús, pasillo 4", lat: 19.4972, lng: -99.0721, schedule: { days: [0], open: "07:00", close: "15:00" }, card: true, status: "pending", createdAt: now - 1 * D,
      products: [P("Jitomate saladet", "jitomate", 27, "kg"), P("Aguacate Hass", "aguacate", 68, "kg"), P("Limón con semilla", "limon", 28, "kg")], description: "Recaudería familiar, precio de mayoreo desde 3 kg." },
    { id: "b16", name: "Recaudería Tezonco", owner: "Andrés Lozano Rey", curp: "LORA830606HDFZYN01", rfc: "LORA830606QA4", workers: 1, format: "local", alcaldia: "Iztapalapa", colonia: "San Lorenzo Tezonco", address: "Calle Morelos 77, San Lorenzo Tezonco", lat: 19.3102, lng: -99.0681, schedule: { days: [1, 2, 3, 4, 5, 6, 0], open: "07:00", close: "20:00" }, card: false, createdAt: now - 510 * D,
      products: [P("Jitomate saladet", "jitomate", 30, "kg"), P("Cebolla blanca", "cebolla", 26, "kg"), P("Limón sin semilla", "limon", 34, "kg"), P("Aguacate Hass", "aguacate", 70, "kg"), P("Papa blanca", "papa", 28, "kg")],
      reviews: [R("Nadia Ríos", 4, "Queda a dos cuadras de mi casa.", 11)] },
    { id: "b17", name: "Frutería Coyoacán", owner: "Silvia Campos Duarte", curp: "CADS870815MDFMRL03", rfc: "CADS870815WE5", workers: 2, format: "tianguis", tianguisId: "t-sdo", category: "frutas", alcaldia: "Coyoacán", colonia: "Pedregal de Santo Domingo", address: "Calle Papalotl, pasillo 6", lat: 19.3276, lng: -99.1684, schedule: { days: [0, 2], open: "07:30", close: "16:00" }, card: true, createdAt: now - 180 * D,
      products: [P("Plátano Tabasco", "platano", 20, "kg"), P("Mango Ataúlfo", "mango", 42, "kg"), P("Guayaba", "guayaba", 35, "kg", "Para el ponche.")],
      reviews: [R("Rocío Lara", 5, "Guayaba perfecta para el ponche.", 4)] },
    { id: "b18", name: "Recaudería Villa Coapa", owner: "Hugo Medina Ferrer", curp: "MEFH790228HDFDRG08", rfc: "MEFH790228DS2", workers: 2, format: "tianguis", tianguisId: "t-vco", category: "recaudería", alcaldia: "Tlalpan", colonia: "Villa Coapa", address: "Calle Cafetales, carril oriente", lat: 19.2986, lng: -99.1293, schedule: { days: [0, 4], open: "07:00", close: "15:00" }, card: true, createdAt: now - 270 * D,
      products: [P("Jitomate saladet", "jitomate", 32, "kg"), P("Cebolla blanca", "cebolla", 25, "kg"), P("Aguacate Hass", "aguacate", 72, "kg"), P("Chile serrano", "chile serrano", 44, "kg")],
      reviews: [R("Mario Cid", 4, "Buena calidad.", 6)] },
    { id: "b19", name: "Pollería Jamaica", owner: "Lucía Benítez Ochoa", curp: "BEOL840719MDFNCC02", rfc: "BEOL840719KP1", workers: 2, format: "tianguis", tianguisId: "t-jam", category: "pollería", alcaldia: "Venustiano Carranza", colonia: "Jamaica", address: "Calle Guillermo Prieto, tramo norte", lat: 19.4109, lng: -99.1224, schedule: { days: [6], open: "08:00", close: "15:00" }, card: false, createdAt: now - 150 * D,
      products: [P("Pechuga sin hueso", "pechuga", 128, "kg"), P("Pierna y muslo", "pierna y muslo", 80, "kg"), P("Huevo blanco", "huevo", 42, "kg")], reviews: [] }
  ].map(b => Object.assign({}, base, b, { category: b.category || (b.format === "local" ? guessCat(b) : b.category) }));

  function guessCat(b) {
    const n = b.name.toLowerCase();
    if (n.includes("carnicer")) return "carnicería";
    if (n.includes("panader")) return "panadería";
    if (n.includes("abarrot")) return "abarrotes";
    if (n.includes("ferreter")) return "ferretería";
    if (n.includes("papeler")) return "papelería";
    return "recaudería";
  }

  const users = [
    { id: "u-cli", role: "cliente", name: "Ana Torres", login: "cliente@huacal.mx", phone: "5511112222", password: "huacal123", alcaldia: "Gustavo A. Madero", colonia: "Lindavista", favorites: ["t-sfj", "b4", "b1"], createdAt: now - 200 * D },
    { id: "u-ven", role: "vendedor", name: "María Hernández", login: "vendedor@huacal.mx", phone: "5534128890", password: "huacal123", bizId: "b1", createdAt: now - 410 * D },
    { id: "u-adc", role: "comercios", name: "Jorge Salinas", login: "comercios@huacal.mx", phone: "5598761234", password: "huacal123", folio: "ADC-0427", rfc: "SAGJ800312QK4", tianguisId: "t-sfj", createdAt: now - 500 * D },
    { id: "u-gob", role: "gobierno", name: "Patricia Ríos", login: "gobierno@huacal.mx", phone: "5550001000", password: "huacal123", folio: "GOB-1001", createdAt: now - 600 * D }
  ];

  const threads = [
    { id: "th1", bizId: "b1", clientId: "x-laura", clientName: "Laura Méndez", unreadVendor: 0, unreadClient: 0, msgs: [
      { from: "client", text: "Buenos días, ¿tiene aguacate maduro para hoy? Quiero 2 kg.", ts: now - 2 * D - 3 * H },
      { from: "vendor", text: "Sí, buenos días. Se lo aparto, ¿a qué hora pasa?", ts: now - 2 * D - 2.8 * H },
      { from: "client", text: "Como a las 11. Gracias.", ts: now - 2 * D - 2.7 * H }] },
    { id: "th2", bizId: "b1", clientId: "u-cli", clientName: "Ana Torres", unreadVendor: 1, unreadClient: 0, msgs: [
      { from: "client", text: "¿Me aparta 3 kg de jitomate? Paso a las 12.", ts: now - 1.6 * H }] },
    { id: "th3", bizId: "b1", clientId: "x-roberto", clientName: "Roberto Díaz", unreadVendor: 1, unreadClient: 0, msgs: [
      { from: "client", text: "¿Aceptan transferencia?", ts: now - 22 * 60e3 }] }
  ];

  return { version: 3, seededAt: now, businesses: biz, users, threads, cart: [], guestFavorites: [], decisions: [] };
}
