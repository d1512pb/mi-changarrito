# Plan IA: tianguis

Rama: `IA`. Responsable: Daniel. Plan aprobado por Daniel el 25/10/2026. La conexión y el recomendador inicial ya están implementados; las ampliaciones conservan su prioridad posterior.

## Contexto confirmado en la reunión

El producto se centra exclusivamente en tianguis y tiene cuatro roles:

- Admin: revisión del sistema, reportes y apoyo a auditoría. Las alertas necesitan revisión; no se presupone que IA determina la legalidad de un negocio.
- Gerente del tianguis: conoce y crea los perfiles de sus changarritos y entrega sus credenciales iniciales.
- Changarrito: accede al perfil creado por el gerente y mantiene su oferta; no existe alta pública independiente.
- Comprador: consulta datos públicos para encontrar productos y resolver necesidades.

Backend aplica autorización, pertenencia al tianguis y visibilidad. IA no recibe credenciales de usuarios ni fichas privadas del gerente/admin para responder al comprador.

Un changarrito puede operar en varios tianguis según el día. Su identidad se mantiene; cada participación tiene aprobación del gerente, ubicación y días propios, y cada jornada tiene fecha y horario efectivos. Las ofertas quedan vinculadas a la participación y jornada correspondientes. Backend gestiona estas relaciones; el adaptador IA las comprueba antes de recomendar.

## Orden de trabajo

1. **Completado:** conexión real a Claude, sin reintentos ni fallback de modelo; tokens y latencia observados.
2. **Completado con datos sintéticos:** «Tengo $100 y quiero comer». Referencias a ofertas existentes, presupuesto comprobado con reglas y Haiku en esfuerzo alto.
3. **Puente local listo; conexión con aplicación pendiente:** backend envía consulta, tianguis, jornadas y ofertas públicas; IA devuelve una propuesta estructurada; backend revalida estado, vigencia y total antes de entregar a frontend.
4. **Efecto visible:** al agotarse una oferta, la siguiente consulta propone otra opción o informa que no hay alternativa. Explicar precio y dinero restante con referencias a los datos.
5. **Evolución por evaluar:** voz, extracción de menús y un flujo con lector de intención, consulta de catálogo y verificador. Las tareas de escritura mantienen los permisos y confirmaciones que aplique backend.

## Control del consumo

Prueba inicial de conexión: 32 tokens máximos, pensamiento desactivado y esfuerzo bajo. Recomendador: `claude-haiku-5-5`, esfuerzo **high**, pensamiento adaptativo, JSON estructurado y máximo 2048 tokens de salida total. Una generación por consulta con candidatos; sin candidatos o presupuesto claro no se consulta a Claude. No cambiar de modelo si la cuenta no tiene acceso. Tarifas documentales verificadas el 25/10/2026 para prompts de hasta 100k tokens: US$0.10/M entrada y US$0.50/M salida. El costo informado es una estimación con tokens observados, no el saldo de la cuenta.

Fuentes oficiales: [Haiku 5.5](https://platform.claude.com/docs/en/models/haiku-5-5/overview), [precios](https://platform.claude.com/docs/en/about-claude/pricing), [API](https://platform.claude.com/docs/en/api/overview).

## Lo necesario

- Clave local en `ia/.env`; workspace si la clave lo requiere.
- Formato final de integración acordado con backend; la aprobación de Daniel ya está registrada.
- Formato o ruta de ofertas públicas cuando backend lo tenga. Mientras tanto se usan datos sintéticos.
- Identificador del tianguis piloto y reglas sobre horarios, ofertas y visibilidad.

## Ciencia de datos

Medir primero respuestas factibles dentro del presupuesto, referencias a ofertas válidas, casos sin solución, latencia y consumo. Mantener ejemplos de error. Las búsquedas no equivalen a ventas y los pronósticos necesitan historia adecuada.
