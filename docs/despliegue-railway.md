# Primer despliegue en Railway

Primera versión publicada y verificada el 25/10/2026. Deployment `e495809c-4060-45b6-89df-778253cc858d` en `SUCCESS`, desde `main` en `a1b312f8a74b62c12401bb1db03de243be87f5a0`. La aplicación usa PostgreSQL y S3 y conservó sesión, borrador y foto tras un reinicio. Ver [evidencia de verificación](primer-despliegue-verificado.md).

## Recursos y construcción

- [Proyecto en Railway](https://railway.com/project/a0fc59a8-9264-4a28-a3bc-f62983d92451): `a0fc59a8-9264-4a28-a3bc-f62983d92451`.
- Entorno `production`: `19ba0bea-8e9d-4c50-a3ba-93da87081ba5`.
- Servicio de aplicación `back`: `30a1bc07-6b48-46f1-a990-4a827accea51`.
- PostgreSQL: `4635cb06-ea3d-4a61-8906-be59400e57f8`.
- Bucket de imágenes: `f8a97ae3-1396-491c-a8ec-db60e129da5b`.
- Aplicación publicada: [back-production-f63c.up.railway.app](https://back-production-f63c.up.railway.app), con página, assets y API comprobados.

Configuración comprobada en Railway: raíz `/`, constructor `DOCKERFILE`, archivo `Dockerfile`, una réplica y healthcheck `/api/health` con espera de 120 segundos. No se usa `railway.json`; estos ajustes se conservan en Railway.

El Dockerfile de la raíz copia `backend/`, `ia/` y `fronted/`; inicia Uvicorn en `0.0.0.0:$PORT` con un usuario sin privilegios. FastAPI sirve el frontend desde `/` y la API en el mismo origen. No requiere un servidor frontend adicional ni compilación JavaScript.

## Persistencia y variables

Las referencias de PostgreSQL y del bucket S3 ya están configuradas en las variables del servicio. Sus valores secretos permanecen en Railway.

- `ENVIRONMENT=production` y `SEED_ON_START=false`.
- `SESSION_SECRET`: secreto propio de al menos 32 caracteres.
- `DATABASE_URL`: referencia a la conexión PostgreSQL.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`: referencias al almacenamiento de imágenes.
- `S3_REGION` y `S3_FORCE_PATH_STYLE`: ajustes compatibles con el proveedor configurado.

`S3_URL_TTL_SECONDS` controla la duración de descargas firmadas; `MAX_PHOTO_MB`, el límite de fotos. `SESSION_TTL_DAYS` y `MAX_SESSIONS_PER_USER` controlan sesiones. `CORS_ORIGINS` sólo necesita otro origen si se autoriza una interfaz separada; la actual comparte origen.

`PRO_EMAIL` y `PRO_PASSWORD` son opcionales y deben configurarse juntos para provisionar privadamente un primer PRO. No hay registro público de administradores ni credenciales demo publicadas. Crear `seguridad` o `pro` requiere un PRO autenticado en backend.

Producción rechaza el arranque sin base persistente, S3 completo o secreto adecuado, y también rechaza semillas. PostgreSQL conserva usuarios, sesiones y ofertas como documentos JSONB en `changarrito_documents`, con índices y restricciones de unicidad. S3 conserva fotos; la base guarda rutas estables `/uploads/{nombre}`. No dependen del disco efímero del contenedor.

La ruta de foto comprueba la vigencia y los permisos antes de emitir una descarga firmada. Una URL firmada ya emitida puede seguir funcionando hasta su vencimiento aunque cambie el estado de la oferta. La interfaz no pone tokens en URLs y muestra un marcador para fotos privadas sin previsualización autenticada.

## Rutas y modos reales

El frontend usa `/api`. Los routers de usuario, sesiones, ofertas, moderación, administración e IA conservan aliases equivalentes sin ese prefijo.

- Usuario: `POST /api/user/register`, `POST /api/user/login`, `GET /api/user/profile`, `PUT /api/user/update`, `POST /api/user/logout` y `POST /api/user/logout_all`.
- Sesiones: `GET /api/session/active` y administración autorizada de sesiones.
- Consulta: `GET /api/offer/search`, `GET /api/offer/{id}` y `GET /api/offer/mine` para el locatario.
- Captura: `POST /api/offer/draft` con multipart `texto` y/o `foto`.
- Revisión y estados: `PUT /api/offer/update/{id}`, `POST /api/offer/publish/{id}`, `POST /api/offer/sold_out/{id}` y `POST /api/offer/report/{id}`.
- Moderación y usuarios: `/api/moderation/*` y `/api/admin/users*`, con permisos del servidor.
- IA: `GET /api/ai/status`, `POST /api/ai/recommend` y alias `POST /api/ai/chat`. Las dos últimas requieren Bearer.
- Operación: `/api/health`, `/api`, `/docs` y `/uploads/{nombre}`.

Los estados actuales son `borrador`, `publicada`, `agotada`, `vencida` y `suspendida`; la API usa campos como `producto`, `precio_declarado` y `vigente_hasta`. El [contrato v1](contrato-v1.md) sigue siendo un objetivo y no está implementado íntegramente: difieren rutas, nombres, importes y estados. `/docs` describe la API ejecutable; no asumir `/api/businesses` o `/api/offers` a partir del objetivo.

Esta entrega mantiene extracción local `mock` con revisión manual y recomendaciones `rules` sobre catálogo real vigente. `/api/ai/status` informa ambos modos y `provider_requests=false`. La revisión automática de aprobación rechazó habilitar envíos de fotos, texto o catálogo a Anthropic sin autorización humana explícita; por eso este despliegue no habilita ese proveedor. Los scripts históricos de `ia/` con opción `--live` no forman parte del arranque del contenedor.

## Verificaciones completadas

Pasaron 24 pruebas backend, 89 de IA y 12 del cliente/service worker sin llamadas pagadas. Una prueba adicional de integración PostgreSQL se omitió al no proporcionarse su conexión de pruebas. El smoke Edge con API aislada comprobó captura, revisión, publicación, agotamiento, logout y móvil sin desbordamiento ni errores del navegador. Sus fixtures no prueban persistencia cloud.

También pasó un smoke HTTP contra backend real local. El script [deployment_smoke.py](../scripts/deployment_smoke.py) reproduce registro, permisos, sesiones, borrador, foto, publicación, búsqueda, recomendaciones, agotamiento y revocación de sesión. Crea registros marcados como sintéticos y al terminar agota su oferta para retirarla de la búsqueda; no representan comercios reales.

## Volver a verificar un despliegue cloud

1. Publicar la revisión integrada y observar `SUCCESS` para su deployment concreto. Un upload o build iniciado no basta.
2. Comprobar `/api/health`: `status=ok`, `database=postgresql`, `storage=s3`. Abrir `/` y comprobar los assets del frontend.
3. Comprobar `/api/ai/status`: `mock`, `rules` y `provider_requests=false`.
4. Ejecutar `prepare`, reiniciar únicamente el servicio de aplicación y ejecutar `verify` conservando el mismo archivo de estado. Así se verifica persistencia de sesión, borrador y foto antes de completar publicación y agotamiento.

Desde la raíz, con las dependencias de backend instaladas:

```sh
python scripts/deployment_smoke.py prepare --base-url https://back-production-f63c.up.railway.app --state .local/railway-smoke.json
# Reiniciar sólo el servicio de aplicación; conservar el estado.
python scripts/deployment_smoke.py verify --base-url https://back-production-f63c.up.railway.app --state .local/railway-smoke.json
```

El estado contiene tokens de QA en `.local/`, excluido de Git. No compartirlo ni pegarlo en logs. `verify` lo elimina al terminar correctamente. Si la prueba se interrumpe después de publicar, revisar esa oferta sintética y retirarla de búsqueda antes de cerrar la verificación.

## Límites de esta entrega

El catálogo de producción comienza sin semillas; el ejemplo sintético es una pantalla separada. La lectura opcional Tesseract procesa la foto en el dispositivo. Una foto puede exigir completar campos manualmente; publicar siempre requiere revisión, confirmación y vigencia.

Carrito, mensajes entre usuarios, favoritos, asistencia, analítica administrativa y chat administrativo de IA no están conectados en esta aplicación. La moderación de ofertas sí aplica permisos del backend. No se infieren tianguis, ubicaciones ni horarios desconocidos. La vigencia de una oferta no confirma que el comercio esté abierto ahora.
