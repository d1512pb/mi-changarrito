# Entrega frontend para primer despliegue

Rama de integración: `deploy/primer-despliegue`. El integrador gestiona commit, publicación y despliegue.

## Funciona

- Catálogo real público con estados y vigencia del backend; detalle, ubicación declarada y reporte de consumidor.
- Registro consumidor/locatario, login, perfil verificado, rol del servidor y logout. Sesión Bearer por pestaña.
- Panel vendedor: captura texto/foto, borrador privado, revisión explícita, confirmación con vigencia y agotamiento.
- Recomendaciones autenticadas de `/api/ai/recommend`, etiquetadas modo local por reglas.
- Seguridad/PRO: revisión de ofertas, suspensión con motivo y restablecimiento.
- Ejemplo sintético separado, sin datos demo mezclados ni cuentas conocidas.
- Shell instalable; caché restringida a assets y exclusión de API/fotos/sesiones.

Sin compilación frontend. FastAPI sirve `fronted/` desde `/`, con API en `/api` del mismo origen.

## Verificado

- `node --check` en cliente, vistas, núcleo y service worker.
- `node --test fronted/tests/api.test.cjs fronted/tests/service-worker.test.cjs`: 12 pruebas pasan. Cubren cabeceras Bearer, errores, 401, permisos de registro, multipart, publicación separada, caché y eliminación de semillas.
- `fronted/tests/browser-smoke.cjs` con Playwright/Edge y API aislada: pasa catálogo vacío, login inválido/válido, captura/revisión/publicación/agotamiento/logout, cero errores del navegador y móvil sin desbordamiento. Se revisaron capturas desktop y móvil.
- Cliente real contra servidor local: catálogo vacío, endpoint privado anónimo devuelve 401 y estado IA informa `mock`, `rules`, `provider_requests=false`.

La prueba de navegador usa fixtures, sin tocar Railway, la base local compartida ni proveedores. La verificación real de API es de sólo lectura; el integrador valida el recorrido completo contra backend.

## Límites

Extracción local/mock con revisión manual; OCR opcional en dispositivo. La foto privada se identifica como guardada, sin previsualización autenticada. No se ofrecen las antiguas simulaciones de carrito, mensajes, favoritos, asistencia ni analítica de horarios. El usuario no puede crear un perfil de administración desde registro. No se ejecutaron llamadas pagadas.
