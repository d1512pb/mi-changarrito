# Mi Changarrito · frontend conectado

PWA de HTML, CSS y JavaScript sin dependencias de compilación. Se sirve desde la raíz del mismo FastAPI que la API. Todos los accesos reales usan rutas relativas `/api`; no hay claves de proveedores en el navegador.

## Ejecutar y configurar

Usa el arranque del backend desde la raíz del repositorio. Servir esta carpeta sola permite ver el shell, pero las funciones reales necesitan la API del mismo origen.

`js/api-client.js` centraliza solicitudes, errores, sesión y Bearer. El token se conserva en `sessionStorage` de la pestaña; no se coloca en URLs, HTML, logs ni cachés. `js/live.js` conecta las vistas al servidor y sustituye las pantallas de demostración locales.

No existen cuentas de prueba públicas ni registro de administradores. El registro público crea sólo consumidor o locatario. Seguridad y PRO se asignan de forma privada en el servidor. La antigua semilla local de negocios, credenciales y mensajes se eliminó; no se lee su `localStorage` anterior.

## Flujos conectados

- Consulta pública: `GET /api/offer/search` y `GET /api/offer/{id}`. Sólo búsqueda vigente; precio, unidad, dirección, confirmación y vigencia proceden del servidor.
- Registro, login, perfil y logout: `/api/user/*`. El rol lo decide el perfil autenticado del backend.
- Vendedor: `/api/offer/mine`, captura multipart `/draft`, revisión `/update/{id}`, confirmación `/publish/{id}` y `/sold_out/{id}`. Una captura crea borrador; publicar requiere revisión explícita con vigencia. La edición de una publicada requiere reconfirmación.
- Cliente autenticado: reporta errores a seguridad con `/api/offer/report/{id}` y consulta opciones por presupuesto con `/api/ai/recommend`. Las recomendaciones se identifican como modo local por reglas y usan el catálogo real.
- Seguridad/PRO: revisan ofertas y reportes, suspenden con motivo o restablecen mediante `/api/moderation/*`.
- El ejemplo sintético es una pantalla separada, sin cuentas ni escritura al catálogo. Los datos inventados nunca se mezclan con las ofertas del servidor.

## Foto, extracción y privacidad

La captura acepta JPEG, PNG o WebP hasta 5 MB. El backend usa extracción local/mock y revisión manual, sin proveedores de pago. La lectura opcional Tesseract descarga su biblioteca/modelo al usarla y procesa la imagen en el dispositivo; si falla, permite escribir el texto. La foto se envía únicamente al backend al crear el borrador.

Las fotos de ofertas privadas usan un marcador “Foto privada guardada”; no se solicitan por una etiqueta de imagen sin autorización. Una foto pública sólo se muestra en ofertas publicadas y vigentes.

`sw.js` conserva únicamente una lista de assets del shell. Nunca intercepta ni guarda API, sesiones, moderación, administración, recomendaciones, uploads o solicitudes con Authorization. Al actualizar elimina cachés heredadas. El modo sin conexión permite abrir el shell, pero no muestra catálogo inventado ni acepta publicaciones sin confirmación del servidor.

## Verificar

Desde la raíz:

```sh
node --test fronted/tests/api.test.cjs fronted/tests/service-worker.test.cjs
```

La prueba de navegador utiliza Playwright disponible en el entorno, sin instalarlo globalmente:

```sh
node fronted/tests/browser-smoke.cjs
```

Puede recibir `PLAYWRIGHT_MODULE` como ruta del paquete y `PLAYWRIGHT_CHANNEL=msedge` cuando se usa Edge instalado. Su API es una fixture aislada: prueba inicio vacío, error de login, sesión vendedor, captura, revisión, publicación, agotamiento, logout, vista móvil y errores del navegador. No toca datos de producción ni proveedores.

## Límites actuales

Las funciones originales de carrito, chat entre vecinos y vendedores, favoritos, asistencia y analítica de horarios no están conectadas ni se ofrecen en la navegación de esta entrega. No se atribuye un tianguis ni un horario a una ubicación cuando el backend no lo declara. La vigencia de una oferta no confirma que el local esté abierto ahora. La revisión de fotos privadas conserva su existencia, pero todavía no descarga una previsualización autenticada.
