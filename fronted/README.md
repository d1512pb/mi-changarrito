# Huacal · PWA de comercio local

Frontend de una Progressive Web App para encontrar tianguis, mercados y locales de la CDMX: quién está abierto, qué vende y a cuánto. HTML, CSS y JavaScript sin dependencias ni paso de compilación.

## Ejecutar

Los service workers necesitan `http://localhost` o HTTPS:

```bash
cd huacal
python3 -m http.server 8080     # o: npx serve .
```

Abre `http://localhost:8080`. En Chrome/Edge (Android o escritorio) aparece la opción **Instalar**.

## Cuentas de prueba (contraseña `huacal123`)

| Perfil | Correo | Folio |
|---|---|---|
| Cliente | cliente@huacal.mx | — |
| Vendedor | vendedor@huacal.mx | — |
| Administrador de Comercios | comercios@huacal.mx | ADC-0427 |
| Administrador de Gobierno | gobierno@huacal.mx | GOB-1001 |

Cada formulario de ingreso tiene un botón **Usar cuenta de prueba**. Para reiniciar los datos, borra el almacenamiento del sitio (o ejecuta `Store.reset()` en la consola).

## Estructura

```
index.html              Shell de la app
manifest.webmanifest    Instalación (nombre, colores, íconos, atajo)
sw.js                   Service worker: app shell offline + caché de fuentes
css/styles.css          Estilos y tokens de color (modo claro y oscuro)
js/config.js            Llave de Google Maps, OCR y demás ajustes
js/icons.js             Íconos SVG y dibujos de frutas/verduras
js/data.js              Catálogos (alcaldías, colonias, tianguis, categorías) y datos de demostración
js/store.js             Capa de datos: búsqueda, estados de apertura, horarios, analítica, sesión
js/fx.js                Animación de frutas cayendo tras iniciar sesión
js/ocr.js               Cámara y lectura de cartulinas de precio (Tesseract.js)
js/app.js               Enrutador, componentes, búsquedas, catálogo, chat, ingreso y registro
js/panels.js            Paneles de vendedor, administrador de comercios y de gobierno
js/main.js              Arranque y registro del service worker
```

## Conectar un backend

Todas las vistas pasan por `Store` (`js/store.js`). Reemplaza sus funciones (`login`, `register`, `searchProducts`, `budget`, `filterBiz`, `setTodayLog`, `decide`, `send`, `productStats`, etc.) por llamadas `fetch()` a tu API conservando las mismas firmas. Los negocios con `simulated: true` generan una bitácora de horarios de ejemplo; los registrados por usuarios guardan sus llegadas, salidas y pausas reales en `logs`.

## Integraciones

- **Google Maps**: pon tu llave en `js/config.js` (`GOOGLE_MAPS_API_KEY`) con Maps JavaScript, Places y Geocoding habilitados. Activa el autocompletado de dirección, la conversión de GPS a dirección y los mapas interactivos. Sin llave, se usa la geolocalización del navegador, un mapa ilustrado y enlaces a Google Maps.
- **Reconocimiento óptico**: `ocr.js` carga Tesseract.js (español) desde jsDelivr la primera vez que se usa. Extrae nombre, precio y unidad de textos como “JITOMATE $28 EL KILO”; el vendedor siempre confirma o corrige antes de publicar. Para producción conviene hacer el OCR en el servidor.
- **Avisos**: los mensajes nuevos generan un aviso en pantalla y, si el vendedor lo autoriza, una notificación del sistema. Para notificaciones push con la app cerrada, agrega Web Push en `sw.js` con tu servidor.
- **Cámara**: usa `getUserMedia` con la cámara trasera; si no está disponible, abre la cámara del teléfono mediante `<input capture>`.

## Reglas implementadas

- “Abierto ahora” combina el horario declarado, el registro del día (llegada/salida) y las pausas activas.
- Puntualidad: llegada con máximo 15 min de retardo y salida no más de 15 min antes del cierre.
- Los puestos en tianguis quedan “En revisión” y no aparecen en búsquedas hasta que el Administrador de Comercios de ese tianguis los acepta.
- La búsqueda por producto compara nombre, categoría, descripción y productos; incluye sinónimos (tomate/jitomate, pollo/pechuga…) y palabras con hasta 1–2 letras de diferencia.
- La animación de frutas se ejecuta únicamente después de un inicio de sesión exitoso y respeta `prefers-reduced-motion`.
