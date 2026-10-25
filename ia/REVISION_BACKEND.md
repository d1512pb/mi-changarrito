# Avance de backend y puntos de conexión

Revisión de código de la rama `backend`, commit **84b5999057d06422238a5580a8102fab3ee45d29**, el 25/10/2026. No se modificó ni fusionó esa rama. Esta inspección no ejecutó sus pruebas ni comprueba un servicio desplegado.

## Lo que ya existe

- API FastAPI con autenticación Bearer y sesiones, perfiles y administración de usuarios.
- Creación de borradores por texto/foto, revisión, publicación con vigencia, búsqueda pública y agotamiento.
- Reportes de consumidores y moderación para suspender o reinstalar ofertas.
- Datos de demostración y pruebas de flujos incluidas en la rama.
- Almacén en memoria mediante colecciones `user`, `offer` y `sessions`; los datos se reinician con el servidor.
- Extractor de prueba con expresiones regulares; no interpreta imágenes ni llama a Claude.

Fuente: [README del backend revisado](https://github.com/d1512pb/mi-changarrito/blob/84b5999057d06422238a5580a8102fab3ee45d29/backend/README.md).

## Diferencias con el contexto nuevo

1. Roles existentes: `pro`, `seguridad`, `locatario`, `consumidor`. Falta el gerente de tianguis del modelo acordado. No convertir automáticamente un rol a permisos de otro.
2. `POST /user/register` todavía permite crear locatarios públicamente con nombre y ubicación del negocio; el acuerdo nuevo exige alta por gerente.
3. El perfil tiene una ubicación y horario; aún no hay entidades de tianguis, participaciones por día, jornadas o vínculo de un changarrito con varios tianguis.
4. Las ofertas no incluyen categoría, fuente/página de observación de precio ni relaciones suficientes para construir el snapshot institucional.
5. IA y backend usan nombres de campo/rutas distintos; se necesita una traducción explícita, no renombrar lo ajeno a ciegas.

Fuentes: [roles y registro](https://github.com/d1512pb/mi-changarrito/blob/84b5999057d06422238a5580a8102fab3ee45d29/backend/app/schemas/user_schema.py), [ofertas](https://github.com/d1512pb/mi-changarrito/blob/84b5999057d06422238a5580a8102fab3ee45d29/backend/app/schemas/offer_schema.py).

## Traducción de ofertas para IA

El adaptador en `ia/backend_adapter.py` ya prepara el payload del recomendador sin llamadas de red. Su entrada son las filas de búsqueda pública y contextos de participación/jornada entregados por backend. Devuelve `payload`, `warnings` y `rejected` con la razón por oferta. La traducción se comprobó junto con el recomendador usando una fila sintética con el formato del backend; no se conectó su servidor.

- `id` → `id` de oferta.
- `id_merchant` → identidad de negocio del esquema actual; cuando backend separe la entidad changarrito debe proporcionar su identificador estable.
- `producto` → `name`.
- `precio_declarado` en pesos → `price_cents` exactos mediante Decimal; no redondear silenciosamente fracciones de centavo.
- `unidad` / `horario` → `unit` / `schedule_text`.
- `confirmado_en` / `vigente_hasta` → `confirmed_at` / `valid_until`, con zona explícita.
- `estado: publicada` → `status: published`; descartadas agotadas, vencidas, suspendidas y borradores.

**No se pueden deducir tianguis, días, gerente ni aprobación a partir de una coordenada o un nombre.** Sin contexto autorizado de participación/jornada, la oferta queda rechazada de la recomendación por tianguis y se informa qué falta.

## Conectar los chats

- Comprador: backend obtiene ofertas públicas, añade relación de tianguis/jornada y llama a `/recommend` o al adaptador Python.
- Administrador: backend autentica al usuario, construye su alcance institucional y un snapshot agregado; llama a `/admin/chat` o `/admin/dashboard` usando el token interno, sin enviarlo al navegador.
- El endpoint actual `/admin/users` gestiona cuentas; no equivale al snapshot de analítica ni aporta por sí solo una lista de gerentes o una asistencia.
- La extracción real puede añadirse después respetando `OfferExtractor.extract(texto, imagen, mime)` del backend; hoy sigue siendo un punto de integración futuro.

## Alcance de esta entrega

Pulir nuestros adaptadores, datos sintéticos y validaciones dentro de `ia/`. El líder y backend acuerdan las entidades y el control de alta por gerente antes de integrar datos reales. No se ha creado conexión con su servidor ni base persistente.

El mapa se conserva como idea final compartida entre comprador y administrador. No retrasa el chat ni la comparación de datos. CoDi sigue fuera del MVP actual.
