# Plan IA: tianguis

Rama: `IA`. Responsable: Daniel. Documento para revisión rápida del equipo; las ampliaciones aún no están implementadas.

## Contexto confirmado en la reunión

El producto se centra exclusivamente en tianguis y tiene cuatro roles:

- Admin: revisión del sistema, reportes y apoyo a auditoría. Las alertas necesitan revisión; no se presupone que IA determina la legalidad de un negocio.
- Gerente del tianguis: conoce y crea los perfiles de sus changarritos y entrega sus credenciales iniciales.
- Changarrito: accede al perfil creado por el gerente y mantiene su oferta; no existe alta pública independiente.
- Comprador: consulta datos públicos para encontrar productos y resolver necesidades.

Backend aplica autorización, pertenencia al tianguis y visibilidad. IA no recibe credenciales de usuarios ni fichas privadas del gerente/admin para responder al comprador.

## Orden de trabajo

1. **Ahora:** conectar Claude con una única respuesta corta, sin reintentos ni fallback a modelos más caros. Confirmar acceso al modelo económico y reportar tokens y latencia observados.
2. **Primera prueba de producto:** «Tengo $100 y quiero comer». Usar ofertas públicas sintéticas de un tianguis; devolver referencias a opciones existentes y comprobar el presupuesto con reglas.
3. **Conexión:** backend envía consulta, tianguis y ofertas públicas elegibles; IA devuelve una propuesta estructurada; backend revalida estado, vigencia y total antes de entregar a frontend.
4. **Efecto visible:** al agotarse una oferta, la siguiente consulta propone otra opción o informa que no hay alternativa. Explicar precio y dinero restante con referencias a los datos.
5. **Evolución por evaluar:** voz, extracción de menús y un flujo con lector de intención, consulta de catálogo y verificador. Las tareas de escritura mantienen los permisos y confirmaciones que aplique backend.

## Control del consumo

Prueba inicial: `claude-haiku-5-5`, 32 tokens máximos de salida, pensamiento desactivado, esfuerzo bajo, una generación. No cambiar de modelo si la cuenta no tiene acceso. Tarifas documentales verificadas el 25/10/2026 para prompts de hasta 100k tokens: US$0.10/M entrada y US$0.50/M salida. El costo informado por el script es una estimación con los tokens de respuesta, no el saldo de la cuenta.

Fuentes oficiales: [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview), [precios](https://platform.claude.com/docs/en/about-claude/pricing), [API](https://platform.claude.com/docs/en/api/overview).

## Lo necesario

- Clave local en `ia/.env`; workspace si la clave lo requiere.
- Revisión de este plan por Daniel y el equipo.
- Formato o ruta de ofertas públicas cuando backend lo tenga. Mientras tanto se usan datos sintéticos.
- Identificador del tianguis piloto y reglas sobre horarios, ofertas y visibilidad.

## Ciencia de datos

Medir primero respuestas factibles dentro del presupuesto, referencias a ofertas válidas, casos sin solución, latencia y consumo. Mantener ejemplos de error. Las búsquedas no equivalen a ventas y los pronósticos necesitan historia adecuada.
