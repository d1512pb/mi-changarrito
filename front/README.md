# Frontend

Responsable: integrante de frontend. Próxima rama: `feat/front`, creada después desde `main` actualizado. Corte: **25/10/2026, 11:15 CDMX**.

## Propiedad

Todo el código, dependencias y configuración de interfaz vive en `front/`. Puedes elegir las herramientas y diseño. Respeta el [contrato v1](../docs/contrato-v1.md); los cambios compartidos se coordinan con el líder.

## Núcleo de la entrega

1. Vista del vecino: búsqueda y lista de ofertas con comercio, precio/unidad si existen y vigencia.
2. Vista del comerciante: su ficha y sus ofertas, con acceso controlado por backend.
3. Captura por texto/foto, revisión de campos propuestos y confirmación para publicar.
4. Actualización de oferta: agotado, retirada y cambios que requieren nueva revisión.
5. Estados de carga y errores; fechas y datos desconocidos claramente visibles.

Usa [el ejemplo sintético](../docs/contratos/ejemplo-v1.json) mientras backend construye la API. Identifica el modo de prueba en pantalla. La URL base de API debe ser configurable. Nunca incluir la clave de Claude en el navegador.

## Ampliaciones separadas

Mapa, animaciones, QR/NFC, voz y recorridos. Mantenerlas en commits independientes del flujo mínimo.

## Entrega al líder

Completa [ENTREGA.md](ENTREGA.md): commit candidato, instrucciones de arranque, configuración, verificación y limitaciones. Documenta cualquier diferencia con el contrato antes del corte.
