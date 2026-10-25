# Propuesta de interfaz IA → backend → frontend

Adaptador implementado y probado localmente. Contrato `recommendation-1.0` para acordar con backend; no modifica el contrato compartido v1 de extracción ni implementa sus rutas.

## Ejecución

- `python ia/api.py --mode mock`: sin llamadas a Claude.
- `python ia/api.py --mode live`: usa Haiku en esfuerzo alto; requiere credenciales locales del servidor.
- Escucha únicamente en `127.0.0.1:8001`. No está desplegado para acceso desde otras computadoras.
- `GET /health` devuelve estado y modo.
- `POST /recommend`, `Content-Type: application/json`, recibe el JSON de [ejemplo](data/tianguis_demo.json).
- Alternativa Python: `from ia import recommend`; llamar `recommend(payload, mode="live")`.

Prueba desde PowerShell, con el servicio ya iniciado:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8001/recommend' -ContentType 'application/json' -Body (Get-Content 'ia/data/tianguis_demo.json' -Raw)
```

## Consulta del comprador

Backend envía `query`, `tianguis_id`, `budget_cents` cuando esté confirmado, `as_of` con zona explícita y `offers`. El reloj lo decide backend, no el comprador. Máximo 100 ofertas por consulta y 1000 caracteres de consulta. El servicio local limita además el cuerpo a 256 KB.

Cada fila conserva identificadores, precio en centavos, moneda MXN, unidad, estado, confirmación, vigencia e `is_demo`, y añade campos requeridos para este adaptador:

- `visibility: public` y `business_active: true`.
- `tianguis_id` de esa oferta.
- `participation`: `id`, `business_id`, `tianguis_id`, `status: approved`, `weekdays` y `location_label` opcional.
- `session`: `id`, `tianguis_id`, `starts_at` y `ends_at` con zona horaria.

Estos campos adicionales corresponden al DTO de recomendación, no al esquema estricto Offer del contrato v1. Backend puede construirlos al consultar sus tablas o colecciones.

## Un changarrito, varios tianguis

Mantener un `business_id` estable. Cada participación describe la relación con un tianguis y necesita aprobación de su gerente. Cada jornada concreta identifica fecha y horario de operación; las ofertas se vinculan a esa participación y jornada. Así un negocio puede vender los domingos en A y los lunes en B, con diferente ubicación y precio.

`weekdays` usa ISO: lunes=1, ..., domingo=7. Se evalúa el día de inicio local de la jornada en `America/Mexico_City`. Una jornada puede cruzar medianoche, con duración positiva de hasta 24 horas; eventos más largos deben dividirse en jornadas. Se requiere `starts_at <= as_of < ends_at` y `confirmed_at <= as_of < valid_until`.

El adaptador reconoce presupuestos explícitos como «100 pesos» o «$100» si backend no los entrega. Si son ambiguos o faltan, pide aclaración sin gastar una llamada. No usa datos privados para completar la respuesta.

## Resultado propuesto

- `status`: `ok`, `no_match`, `needs_clarification` o `insufficient_data`.
- `recommendations`: alternativas independientes con `offer_id`, `business_id`, `participation_id`, `session_id`, `tianguis_id`, nombre, ubicación y cantidad fija de una unidad.
- Total y dinero restante calculados a partir de precios conocidos y verificados.
- Explicación breve que referencie esas ofertas y cualquier dato pendiente.
- `mode` indica selector `mock` o `live`; `is_demo` por opción identifica los datos sintéticos. Una llamada real puede usar datos sintéticos y lo indica.
- `metrics` contiene llamadas y, si hubo generación, esfuerzo, tokens, latencia y costo estimado.

El adaptador filtra las ofertas antes de Claude, limita los candidatos a 20 y comprueba IDs y forma de salida. Calcula totales y sobrantes desde el catálogo. No suma las alternativas entre sí ni inventa precios. La respuesta indica si se evaluó una selección limitada.

Errores de entrada o salida inválida: 422 con `error.code: VALIDATION_ERROR`. Fallo del proveedor: 503 con `AI_UNAVAILABLE`. Sin reintentos automáticos ni cambios de modelo. El adaptador no requiere ni devuelve contraseñas de usuarios.

Backend revalida permisos, pertenencia, precio, estado y vigencia antes de responder a frontend. La IA no publica, modifica inventario, asigna roles ni crea credenciales.

## Pruebas de la siguiente etapa

1. Presupuesto de $100 y alternativas de $65/$85: recomendar opciones factibles.
2. Oferta de $120: no presentarla como dentro del presupuesto.
3. Oferta agotada o vencida: excluirla aunque sea más barata.
4. Precio desconocido: no inventar total.
5. Ninguna opción factible: informar el límite y pedir un ajuste.
6. Datos de otro tianguis o privados: no usarlos.

Los usuarios no se dan de alta mediante IA. El gerente crea el changarrito; backend implementa ese flujo. Abril consume la respuesta a través de backend.
