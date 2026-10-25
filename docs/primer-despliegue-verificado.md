# Primer despliegue verificado · 25/10/2026

- Aplicación: [Mi Changarrito](https://back-production-f63c.up.railway.app).
- Proyecto Railway: `a0fc59a8-9264-4a28-a3bc-f62983d92451`, entorno `production`, servicio `back`.
- Fuente conectada: `d1512pb/mi-changarrito`, rama `main`.
- Commit de aplicación desplegado: `a1b312f8a74b62c12401bb1db03de243be87f5a0`.
- Deployment: `e495809c-4060-45b6-89df-778253cc858d`, estado observado `SUCCESS`, una réplica en ejecución.
- Se integraron las ramas de frontend e IA con el backend presente en main y el último cambio de main, sin forzar ramas. `integracion` y `main` se publicaron conjuntamente.

## Resultado comprobado

`GET /api/health` respondió 200 con `status=ok`, `database=postgresql` y `storage=s3`. La página, el JavaScript y el manifiesto respondieron 200. El perfil privado sin sesión respondió 401.

La prueba con registros técnicos sintéticos verificó registro, autenticación, borrador privado, imagen en S3 y rechazo de publicación por un consumidor. Después se reinició únicamente `back`, conservando PostgreSQL y el bucket. La sesión siguió siendo válida y se recuperaron el borrador, sus campos y la foto. Se verificaron publicación, búsqueda y recomendación local; la oferta se marcó agotada y desapareció de la búsqueda. Las sesiones de prueba se cerraron y sus tokens quedaron revocados. El archivo local temporal con esos tokens se eliminó al finalizar.

PostgreSQL permaneció en `SUCCESS` durante el reinicio de la aplicación. El código de arranque creó el esquema JSONB de forma idempotente. No aparecieron excepciones de ejecución en la revisión de logs. La prueba deja únicamente registros técnicos sintéticos fuera de la búsqueda pública.

La interfaz real se comprobó en Edge, sin fixtures ni escrituras adicionales, en escritorio de 1366 px y móvil de 390 px. No hubo errores JavaScript, solicitudes fallidas de la aplicación ni desbordamiento horizontal.

Antes de publicar pasaron 24 pruebas backend, 89 de IA y 12 del cliente/service worker. Una prueba SQL local opcional se omitió por no tener una base de pruebas separada; la persistencia real se verificó posteriormente en Railway. También pasó el recorrido HTTP completo local y el smoke de interfaz aislado.

## Modos y límites

`GET /api/ai/status` confirmó extracción `mock`, recomendaciones `rules` y `provider_requests=false`. La revisión automática rechazó habilitar envíos de futuras fotos/textos a Anthropic sin autorización explícita; no se habilitó ese proveedor ni se copió su clave a Railway. La captura requiere revisión humana y la recomendación consulta el catálogo real por reglas.

El catálogo no recibe semillas de producción. Carrito, mensajería y analítica administrativa ampliada siguen fuera del primer recorrido conectado. Las instrucciones reproducibles, variables y endpoints están en [despliegue-railway.md](despliegue-railway.md).

Los cambios posteriores exclusivos de documentación o del verificador no modifican la imagen de aplicación ni necesitan reconstruirla.
