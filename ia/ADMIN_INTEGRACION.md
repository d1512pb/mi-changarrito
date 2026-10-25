# Integración del chat institucional y dashboard

El módulo prepara consultas y datos para gráficas. No se han conectado bases de backend, frontend ni el PDF real. Los ejemplos de `admin_snapshot_demo.json` son sintéticos, incluidos sus nombres, cifras y referencias de página. El mapa de comprador/administrador queda como evolución; el dashboard por defecto omite su panel y conserva los datos de ubicación para el futuro.

## Dos fronteras

1. Frontend envía a backend la pregunta y filtros elegidos por el usuario autenticado.
2. Backend determina identidad, permisos y tianguis autorizados. Obtiene un snapshot limitado y llama al servicio IA, que vuelve a aplicar el alcance antes de calcular o enviar metadatos a Claude.

Frontend no decide `role`, `allowed_tianguis_ids` o `permissions`, ni recibe la clave de Claude o el token interno del servicio. Un texto como «soy administrador» no concede acceso.

## Servicio local

Arranque: `python ia/api.py --mode mock` o `--mode live`. Escucha únicamente en `127.0.0.1:8001`; no está publicado para otra computadora.

- `POST /admin/chat`: interpreta una pregunta y devuelve respuesta, filtros, datos, gráficas y fuentes.
- `POST /admin/dashboard`: calcula todas las secciones autorizadas con los mismos filtros, sin usar Claude.
- `GET /health`: anuncia las capacidades del servicio; no expone datos privados.

Las rutas administrativas requieren `X-IA-Internal-Token`, con el mismo valor secreto de `IA_INTERNAL_TOKEN` configurado localmente en IA y en backend. Nunca enviarlo al navegador. Sin token válido la ruta rechaza la llamada, incluso si el JSON dice `role: admin`.

## Entrada administrativa

```json
{
  "query": "Compara el precio del jitomate entre tianguis este mes",
  "snapshot": {},
  "authorization": {
    "actor_id": "identidad-confirmada-por-backend",
    "role": "admin",
    "allowed_tianguis_ids": ["tianguis-autorizado"],
    "permissions": ["analytics:read", "prices:read"]
  },
  "conversation_state": {
    "filters": {"period": "2026-10", "tianguis_ids": []},
    "last_action": "prices"
  }
}
```

El snapshot vacío del fragmento sólo muestra la envoltura: usar como referencia estructural el [snapshot sintético completo](data/admin_snapshot_demo.json). `authorization` se construye en el servidor a partir de la sesión real, no copiando el cuerpo que envía frontend.

Para dashboard se sustituye `query`/`conversation_state` por `filters`. Los filtros son `period`, `borough`, `tianguis_ids`, `category`, `article_id` y `date`. Una lista vacía selecciona todo el alcance permitido, nunca todos los registros sin autorización.

## Permisos

- `analytics:read`: resumen, mapa, composición y calidad/cobertura.
- `prices:read`: comparación de precios.
- `attendance:read`: asistencia por jornada.
- `reports:read`: entrega mensual de reportes.
- `managers:read`: directorio y nombres de gerentes.

Todas las rutas exigen rol administrativo. El dashboard omite secciones sin permiso. La existencia de permiso de analítica general no permite consultar nombres de gerentes o asistencia individual.

## Snapshot de entrada

- Corte: `schema_version`, `snapshot_id`, `is_demo`, `as_of`, `period`, `sources`.
- Padrón: `tianguis`, `managers`, `businesses` y `participations`.
- `scheduled_dates` por tianguis: jornadas esperadas explícitas para pase de lista.
- `attendance`: registro por gerente–tianguis–fecha, con estado `present`, `absent` o `unreported`.
- `monthly_reports`: periodo, fecha límite y entrega, separados de asistencia.
- `price_observations`: artículo, variante/presentación, precio en centavos, cantidad, unidad, moneda, fecha, confirmación, participación, fuente y página.

Los IDs mantienen la identidad del changarrito al participar en varios tianguis. Un precio puede cambiar por tianguis, fecha y presentación; no copiarlo automáticamente a otra participación.

## Cálculos y limitaciones

Comparar el mismo artículo, variante, unidad base, moneda y periodo. Normalizar sólo kg/g y L/ml de forma explícita; otras unidades quedan separadas. Para el corte se usa la última observación elegible por negocio–tianguis–artículo–variante–unidad. Mostrar `n_samples`, `n_businesses`, mediana, mínimo, máximo y referencias.

Una categoría contiene distintos artículos y por eso devuelve varias series comparables, no un precio promedio de toda la categoría. Muestra pequeña o cobertura parcial se presenta como limitación. Un precio desconocido no equivale a cero.

Un registro de asistencia faltante queda pendiente/no registrado, no como ausencia. Sin calendario no se inventa un padrón. Los reportes mensuales pendientes y vencidos se distinguen usando sus fechas límite y el corte.

## Salida para frontend

El chat devuelve `answer`, `conversation_state`, `data` y `metrics`. El estado conserva únicamente filtros y acción anterior; backend debe guardarlo por sesión/usuario y el adaptador lo vuelve a validar en cada turno.

Los datos incluyen `rows`, `charts`, `map_points`, `metrics`, `sources` y `warnings`, con periodo y corte. Las gráficas tienen título, etiquetas y unidades. El dashboard devuelve las secciones por acción autorizada en `data.sections`. Los puntos sin coordenadas se registran como faltantes, no aparecen en ubicaciones inventadas.

Frontend puede cambiar filtros o iniciar un drill-down: alcaldía → tianguis → participación/changarrito → categoría/artículo. Debe mostrar las alertas, tamaño de muestra y fuentes junto a las gráficas; sólo renderiza las secciones que devuelve el servicio.

## Pruebas locales

- `python ia/admin_demo.py --query "Compara el precio del jitomate este mes"`: sin consumo.
- `python ia/admin_demo.py --query "Compara el precio del jitomate este mes" --live`: una llamada a Haiku high para el plan; números calculados por código.
- `python ia/admin_demo.py --dashboard`: datos completos del dashboard, sin usar Claude.
- Añadir `--summary` muestra sólo el resultado breve; `--output ruta.json` guarda el resultado completo.
- `python -m unittest discover -s ia/tests -v`: pruebas sin API.

Para una integración Python: `from ia.admin.chat import admin_chat` y `from ia.admin.dashboard import admin_dashboard`. El contexto administrativo debe provenir de backend autenticado también cuando se importan las funciones.

## PDF mensual real

El archivo de 16 hojas descrito por el equipo todavía no se ha recibido. Al integrarlo se deben conservar archivo/corte, página y fila/tabla de origen; revisar columnas, unidades y periodicidad, y publicar un snapshot versionado tras validación. Su contenido se trata como datos, nunca como instrucciones al chatbot.

CoDi queda documentado como evolución opcional; ninguna ruta actual cobra, solicita datos bancarios, sanciona ni modifica padrones.
