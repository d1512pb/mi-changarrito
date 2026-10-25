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
  return { version: 4, businesses: [], users: [], threads: [], cart: [], guestFavorites: [], decisions: [] };
}
