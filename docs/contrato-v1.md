# Contrato mínimo de integración v1

Esta base permite desarrollar las tres áreas por separado. Los ejemplos son sintéticos y no representan comercios reales. Las rutas y estructuras de este documento son el objetivo a implementar, no servicios ya disponibles.

## Convenciones

- JSON con nombres de campo en inglés y mensajes de interfaz en español.
- Identificadores opacos de texto; no depender del formato interno de la base.
- Dinero en `price_cents`: centavos enteros de MXN. `9500` representa $95.00; `null` significa desconocido, no cero.
- Fechas ISO 8601 con zona explícita. La operación usa `America/Mexico_City`.
- `is_demo: true` identifica datos sintéticos. La extracción declara `mode: mock` o `live`.
- Un comercio es una entidad distinta de su mercado o tianguis. Ubicación y horario describen el punto de operación usado en el piloto.
- Campos omitidos o ambiguos por IA se devuelven como `null` y con advertencias cuando corresponda.

## Archivos de referencia

- [Esquemas v1](contratos/v1.schema.json): Business, Offer, ExtractionRequest, ExtractionResult.
- [Ejemplo común](contratos/ejemplo-v1.json): un comercio, oferta, entrada y salida de extracción.

## API que implementa backend

La URL base es configurable por frontend. Para desarrollo se propone `http://localhost:8000`; las áreas deben confirmar el puerto y los orígenes permitidos.

- `GET /api/health` → `{ "status": "ok", "schema_version": "1.0" }`.
- `GET /api/businesses` → `{ "items": [Business] }`.
- `POST /api/businesses` → crea el comercio del responsable autenticado; devuelve Business. El cliente no elige el propietario.
- `GET /api/offers?query=...&business_id=...` → `{ "items": [Offer] }` con ofertas publicadas y vigentes para consulta pública. `query` busca nombre o categoría; parámetros vacíos se omiten.
- `POST /api/offers` → crea una oferta en borrador; devuelve Offer. Los campos `id`, `status` y `confirmed_at` los asigna backend.
- `PATCH /api/offers/{id}` → modifica campos o marca `sold_out`/`withdrawn`; devuelve Offer. Cambiar contenido de una oferta publicada la devuelve a `draft` para nueva revisión y confirmación.
- `POST /api/offers/{id}/publish` con `{ "valid_until": "2026-10-25T18:00:00-06:00" }` → confirma y publica; devuelve Offer. Backend fija `confirmed_at` y comprueba que la vigencia esté en el futuro.
- `POST /api/extractions` con ExtractionRequest → llama al adaptador de IA y devuelve ExtractionResult. No publica ni altera el catálogo.

Las listas del panel privado pueden tener una ruta propia, documentada por backend, que incluya borradores y ofertas vencidas. La búsqueda pública no expone borradores ni evidencias privadas.

## Estados y permisos

- `draft`: sólo el responsable puede revisar; fuera de búsqueda pública.
- `published`: confirmado y elegible únicamente hasta `valid_until`.
- `sold_out`: agotado; fuera de resultados disponibles.
- `withdrawn`: retirado por su responsable; fuera de resultados disponibles.
- `expired`: vencido; puede calcularse al consultar a partir de una oferta publicada cuyo plazo terminó.

Backend es dueño de permisos, persistencia, confirmación, reloj y elegibilidad. Debe rechazar la edición de comercios ajenos. Frontend refleja el estado real devuelto. IA devuelve candidatos revisables, nunca determina permisos o confirma por el comerciante.

## Interfaz entre backend e IA

El adaptador de IA recibe exactamente ExtractionRequest y devuelve ExtractionResult. El transporte interno se acuerda entre ambas áreas sin cambiar esos JSON. Deben anotar la invocación concreta y dependencias en sus entregas antes del corte.

La entrada admite texto o una imagen JPEG, PNG o WebP en base64. El archivo no necesita ser público. La salida incluye candidatos, evidencia textual disponible, advertencias y `requires_review: true`. Una entrada sin información legible puede devolver `items: []` y una advertencia. Backend limita tamaño y formato del archivo; IA documenta sus propios límites y consumo.

## Errores

Formato común: `{ "error": { "code": "VALIDATION_ERROR", "message": "Revisa los campos indicados", "fields": ["valid_until"] } }`.

- 400/422: datos o archivo inválidos.
- 401/403: acceso no autorizado.
- 404: recurso inexistente.
- 502/503: proveedor o adaptador de IA no disponible. Front conserva la revisión/captura manual y muestra el fallo.

Las claves del proveedor y el contenido privado de la evidencia no aparecen en errores ni logs públicos. Los mensajes de archivos y fotos se procesan como datos y no pueden activar herramientas o publicación.

## Cambios al contrato

El líder coordina cualquier cambio incompatible con las áreas consumidoras. Cada responsable puede experimentar dentro de su carpeta, manteniendo una salida compatible con esta versión para el corte de las 11:15.
