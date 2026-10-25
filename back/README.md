# Backend

Responsable: integrante de backend. Próxima rama: `feat/back`, creada después desde `main` actualizado. Corte: **25/10/2026, 11:15 CDMX**.

## Propiedad

Todo el código, dependencias y configuración del servidor y catálogo vive en `back/`. Puedes elegir las herramientas y persistencia. Respeta el [contrato v1](../docs/contrato-v1.md); los cambios compartidos se coordinan con el líder.

## Núcleo de la entrega

1. API para comercios y ofertas, persistencia y datos sintéticos identificados.
2. Acceso por responsable: una persona no puede modificar el comercio de otra.
3. Borrador, publicación confirmada, agotamiento, retiro y vencimiento.
4. Búsqueda pública que excluya ofertas no elegibles y no exponga evidencias privadas.
5. Endpoint de extracción que invoque al adaptador de IA con el contrato común; la extracción no publica.
6. Validación de importes, fechas y archivos; errores comunes y configuración de conexión con front.

Confirma con IA el modo de invocación del adaptador. Si todavía no está disponible, usa una respuesta de prueba identificada como `mode: mock`, basada en [el ejemplo común](../docs/contratos/ejemplo-v1.json). Mantén esa alternativa separada del modo real.

## Ampliaciones separadas

Búsqueda geográfica avanzada, varias ubicaciones por comerciante, exportación y optimización de recorridos.

## Entrega al líder

Completa [ENTREGA.md](ENTREGA.md): arranque, configuración, autenticación, base de datos, invocación de IA, verificación y commit candidato. No subir claves ni bases con datos privados.
