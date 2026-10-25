# Mi Changarrito: backend y despliegue

FastAPI sirve la API y el frontend de `fronted/` desde el mismo origen. En producción conserva usuarios, ofertas y sesiones en PostgreSQL, y fotos en un bucket S3 privado. El modo local puede funcionar sin esos servicios.

## Desarrollo local

Desde `backend/`:

```powershell
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Abrir `http://localhost:8000/`; documentación de API en `/docs`. El frontend ya utiliza la API del mismo servidor.

El ejemplo configura `ENVIRONMENT=development`, sin PostgreSQL ni S3 y con `SEED_ON_START=false`. En este modo los datos se pierden al reiniciar y las fotos se guardan en `uploads/`. Para probar con datos sintéticos puede habilitarse `SEED_ON_START=true` únicamente con `DATABASE_URL` vacía: crea los usuarios de demostración descritos abajo. El código impide combinar seed y base persistente.

## Producción en Railway

Usar el `Dockerfile` de la raíz del repositorio y contexto completo: raíz del servicio `/`, ruta del Dockerfile `Dockerfile`, rama `main`. Ese archivo copia `backend/`, `ia/` y `fronted/`, y arranca Uvicorn como usuario sin privilegios en `0.0.0.0:$PORT`.

Variables obligatorias:

- `ENVIRONMENT=production`.
- `SEED_ON_START=false`.
- `SESSION_SECRET`: valor propio y aleatorio de al menos 32 caracteres. El valor de ejemplo no sirve en producción.
- `DATABASE_URL`: conexión PostgreSQL privada, por ejemplo la referencia Railway `${{Postgres.DATABASE_URL}}`.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`: referencias al bucket `imagenes` ya configuradas en el servicio.
- `S3_FORCE_PATH_STYLE=false` para el bucket Railway actual; usar el estilo indicado por el proveedor si se cambia de almacenamiento.
- `PORT=8000` y `CORS_ORIGINS` con el dominio definitivo si hay clientes en otro origen. Frontend y API del despliegue comparten origen.

`PRO_EMAIL` y `PRO_PASSWORD` son opcionales, pero deben configurarse juntos para crear el primer administrador. La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes. El usuario se crea sólo si el correo no existe; cambiar la variable no cambia la contraseña de una cuenta existente.

Las credenciales se configuran en Railway y no se incorporan a Git ni al navegador. Las referencias `${{...}}` sólo se resuelven dentro de Railway; no son URLs utilizables desde un `.env` local.

También puede construirse la imagen desde la raíz con `docker build -t mi-changarrito .`.

## Persistencia PostgreSQL

`app/core/database.py` mantiene la interfaz de seis métodos (`insert`, `get`, `find`, `find_one`, `update`, `delete`) para `db.user`, `db.offer` y `db.sessions`.

Con `DATABASE_URL` crea un pool asíncrono y la tabla `changarrito_documents` con documentos JSONB, identidad por colección e ID, y restricciones únicas para correo y hash de sesión. La inicialización de tabla e índices es idempotente; no borra los datos al arrancar. Los tipos fecha se conservan al escribir y leer los documentos.

`GET /api/health` ejecuta `SELECT 1` cuando utiliza PostgreSQL. Un despliegue configurado responde con `status=ok`, `database=postgresql` y `storage=s3`; no devuelve credenciales. El estado S3 de ese endpoint indica configuración, no una prueba de subida al bucket.

## Fotos privadas

`POST /api/offer/draft` acepta texto y/o foto JPEG, PNG o WebP, con límite de tamaño configurable mediante `MAX_PHOTO_MB` (5 MB por defecto). En producción guarda la foto con una clave única `offers/<uuid>.<ext>` y conserva en PostgreSQL una ruta estable `/uploads/<archivo>`, nunca una URL firmada que vaya a caducar.

La lectura de esa ruta comprueba la oferta asociada. Una foto sólo es pública cuando la oferta está publicada y vigente. En otros estados requiere la sesión de su responsable, seguridad o PRO; una petición sin permiso devuelve 404. S3 entrega la lectura mediante una URL firmada que vence en 300 segundos por defecto (`S3_URL_TTL_SECONDS`).

Para mostrar una foto privada en un cliente autenticado, usar `fetch` con el header Bearer y convertirla en un blob; una etiqueta `<img>` por sí sola no envía ese header. La subida a S3 pasa por backend, por lo que no requiere configurar CORS del bucket para el navegador.

## API y autenticación

Las rutas de negocio tienen prefijo recomendado `/api`. Se mantienen los aliases históricos sin él: `/api/user/login` y `/user/login`, por ejemplo. `/api/health` sólo existe con ese prefijo.

1. `POST /api/user/login` recibe email y password y devuelve `token`, `token_type` y `rol`.
2. El cliente manda `Authorization: Bearer <token>`; no se usan cookies de sesión.
3. La base guarda el HMAC del token. La sesión dura 7 días por defecto, con un máximo de 3 sesiones activas por usuario.
4. Cambiar contraseña, desactivar una cuenta o cambiar su rol cierra sus sesiones.

Roles:

- `consumidor`: registro público, búsqueda y reportes de ofertas.
- `locatario`: registro público con negocio y ubicación; administra sus propias ofertas.
- `seguridad`: creado por PRO; revisa reportes, suspende y reinstala ofertas.
- `pro`: administra usuarios y moderación. El registro público no permite este rol ni seguridad.

Rutas principales:

- Usuarios y sesiones: `/api/user/register`, `/api/user/login`, `/api/user/profile`, `/api/user/update`, `/api/user/logout`, `/api/user/logout_all`, `/api/session/active`.
- Catálogo público: `GET /api/offer/search?q=&lat=&lng=&radio=` y `GET /api/offer/{id}`.
- Locatario: `GET /api/offer/mine`, `POST /api/offer/draft`, `PUT /api/offer/update/{id}`, `POST /api/offer/publish/{id}` y `POST /api/offer/sold_out/{id}`.
- Reportes y moderación: `POST /api/offer/report/{id}`, `GET /api/moderation/` y acciones `suspend`, `reinstate`, `dismiss_reports`.
- Administración: `/api/admin/users`, `/api/admin/users/{id}` y `/api/admin/users/{id}/reset_password`.
- Recomendaciones: `GET /api/ai/status` y `POST /api/ai/recommend` (`/api/ai/chat` es alias). La recomendación requiere sesión.

El servidor es la fuente de verdad de permisos, publicación y vigencia. Las ofertas agotadas, vencidas o suspendidas no aparecen como disponibles. Editar una publicación la devuelve a borrador. Los errores de negocio usan `{"detail": "..."}`. El esquema completo de solicitudes y respuestas está en `/docs`; las rutas y campos heredados de este backend aún difieren del documento inicial `docs/contrato-v1.md`.

## Extracción y recomendaciones de la primera versión

La extracción funciona localmente con regex y se identifica como `mock`: propone campos de texto, no interpreta imágenes. Una foto sin texto sigue permitiendo captura manual. La revisión y publicación siempre corresponden al comerciante.

Las recomendaciones usan reglas de coincidencia de palabras y presupuesto sobre ofertas públicas, confirmadas y vigentes, y se identifican como `rules`. Presentan hasta tres alternativas independientes; no consultan proveedores de IA. No se necesita una clave de Claude para este despliegue. La analítica administrativa especializada de tianguis aún no está conectada a esos endpoints.

## Datos sintéticos y pruebas

En modo local, `SEED_ON_START=true` crea los usuarios `loc1@changarrito.mx` a `loc4@changarrito.mx`, `consumidor@changarrito.mx`, `seguridad@changarrito.mx` y `pro@changarrito.mx`, todos con contraseña de demostración `Demo1234`. Incluye 12 ofertas vigentes, una agotada y una vencida. Estos usuarios nunca se crean en producción.

Desde `backend/`, ejecutar `python -m pytest tests -q`. Las pruebas normales usan memoria, archivos temporales y cliente S3 simulado. La prueba de persistencia entre conexiones sólo se ejecuta si se proporciona `TEST_DATABASE_URL` para una base de prueba separada; limpia su propio registro en la colección `_verification`. No ejecutar esa prueba contra datos de negocio.
