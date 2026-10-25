# Propuesta de interfaz IA → backend → frontend

Extensión para conversar con backend; no cambia el contrato compartido v1 de extracción ni sus rutas. No está implementada todavía.

## Consulta del comprador

Backend envía `query`, `tianguis_id`, `budget_cents` cuando esté confirmado, hora actual y una lista de ofertas públicas. Las ofertas conservan identificadores, precios en centavos, unidad, estado, confirmación y vigencia del contrato v1. Debe poder comprobarse a qué tianguis pertenece cada oferta.

La IA puede interpretar «100 pesos» como `10000` centavos. Si presupuesto, producto o cantidad son ambiguos, devuelve una pregunta de aclaración. No usa datos privados para completar la respuesta.

## Resultado propuesto

- Estado: `ok`, `no_match`, `needs_clarification` o `insufficient_data`.
- Opciones referidas por `offer_id` y `business_id`; cantidades explícitas.
- Total y dinero restante calculados a partir de precios conocidos y verificados.
- Explicación breve que referencie esas ofertas y cualquier dato pendiente.
- Modo de datos: prueba sintética o datos públicos reales.

Backend revalida permisos, pertenencia, precio, estado y vigencia antes de responder a frontend. La IA no publica, modifica inventario, asigna roles ni crea credenciales.

## Pruebas de la siguiente etapa

1. Presupuesto de $100 y alternativas de $65/$85: recomendar opciones factibles.
2. Oferta de $120: no presentarla como dentro del presupuesto.
3. Oferta agotada o vencida: excluirla aunque sea más barata.
4. Precio desconocido: no inventar total.
5. Ninguna opción factible: informar el límite y pedir un ajuste.
6. Datos de otro tianguis o privados: no usarlos.

Los usuarios no se dan de alta mediante IA. El gerente crea el changarrito; backend implementa ese flujo. Abril consume la respuesta a través de backend.
