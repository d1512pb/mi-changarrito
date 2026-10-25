/* Configuración de Huacal.
 * GOOGLE_MAPS_API_KEY: pega aquí tu llave de Google Maps JavaScript API (con Places y Geocoding
 *   habilitados). Sin llave, la app usa geolocalización del navegador y enlaces a Google Maps.
 * OCR_ENABLED: lee el nombre, precio y unidad de las fotos con Tesseract.js (se descarga al usarse).
 */
window.HUACAL_CONFIG = Object.assign({
  GOOGLE_MAPS_API_KEY: "",
  OCR_ENABLED: true,
  TESSERACT_CDN: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  OCR_TIMEOUT_MS: 30000,
  SIMULATE_NEW_MESSAGE_MS: 25000
}, window.HUACAL_CONFIG || {});
