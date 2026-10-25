# Centro de mando: Mi Changarrito

## Acuerdo del equipo

- Cuatro integrantes: frontend, backend, Daniel en IA/ciencia de datos y líder/pitch.
- El líder concentra decisiones de alcance, contrato, integración y presentación.
- Corte: **domingo 25/10/2026, 11:15, America/Mexico_City**.
- Esta preparación se sube directamente a `main`. Después se crean las ramas de cada área.

## Tres áreas

- `front/` → próxima rama `feat/front`: experiencia completa del comerciante y el vecino.
- `back/` → próxima rama `feat/back`: catálogo y reglas del negocio, API y persistencia.
- `ia/` → próxima rama `feat/ia`: extracción revisable, demostración de IA y mediciones.

Cada área es dueña de su carpeta. El líder coordina raíz y `docs/`. Los nombres personales de frontend/backend y del líder se completan cuando el equipo los comunique; no se deducen de los usuarios de GitHub.

## Núcleo que debe entrar

1. Capturar texto o foto y obtener un borrador; la captura manual sirve como alternativa explícita.
2. Revisar campos y confirmar su publicación con vigencia.
3. Buscar ofertas vigentes y ver el comercio que las ofrece.
4. Marcar una oferta agotada o retirada y cambiar los resultados.
5. Mostrar datos sintéticos y reproducciones como tales.

## Entrega de cada responsable

Cada área completa su `ENTREGA.md` con el commit candidato, pasos de ejecución, verificación y ampliaciones separadas. El líder recibe enlaces de rama o commit y decide qué integrar.

## Decisiones técnicas antes de cerrar la integración

- Front y back confirman la URL base, autenticación y tratamiento de errores.
- Back e IA confirman cómo invocar el adaptador que recibe y devuelve el contrato v1. Puede ser importación si comparten entorno o un adaptador HTTP si los entornos difieren; debe documentarse en ambas entregas.
- Cada área documenta dependencias y configuración dentro de su carpeta.
- Los cambios incompatibles al contrato requieren avisar al líder y al consumidor afectado.

## Criterio para seleccionar funciones

Priorizar el recorrido completo. Una ampliación entra si está comprobada, respeta el contrato y no bloquea la demostración. Lo demás permanece en su rama para retomarlo después.

## Responsabilidad del pitch

Explicar problema, usuario, recorrido funcional y siguiente piloto. Usar únicamente mediciones obtenidas; el objetivo de 5× continúa sin demostrar. Mostrar límites de datos, IA y operación de forma concreta.

## Estado verificable de esta preparación

Estructura, contrato y ejemplos preparados. Aplicación, autenticación, extracción real y mediciones todavía por implementar. Este documento define la coordinación; no programa avisos ni integraciones automáticas.
