# Mi Changarrito

**Lo que hay hoy en tu barrio, confirmado por quien lo vende.**

Propuesta de prototipo para el reto de comercio popular y barrial del Chilangatón 2026, CDMX.

Mi Changarrito convierte una foto o texto de un comercio en una ficha que su responsable revisa y publica con vigencia. Los vecinos pueden encontrar productos, precios declarados, horarios y ubicación, y saber cuándo se confirmó esa información.

## El recorrido que construiremos primero

1. El comerciante carga una foto o escribe su oferta.
2. La IA propone los campos y señala los datos que faltan o son ambiguos.
3. El comerciante revisa y confirma antes de publicar.
4. Un vecino busca lo que necesita y consulta ofertas vigentes.
5. Al agotarse o vencer una oferta, deja de recomendarse como disponible.

## Estado

Repositorio dividido en tres áreas independientes, con responsabilidades, contrato y ejemplos compartidos. La aplicación todavía no está implementada. Cada responsable puede elegir sus herramientas respetando el contrato de integración.

Repositorio privado en GitHub: [d1512pb/mi-changarrito](https://github.com/d1512pb/mi-changarrito). Para acceder, cada integrante debe aceptar su invitación de colaboración.

## Documentos de trabajo

- [Centro de mando y corte de las 11:15](docs/centro-de-mando.md).
- [Contrato mínimo de integración v1](docs/contrato-v1.md).
- [Propuesta y alcance inicial](docs/propuesta.md).
- [Decisiones confirmadas y pendientes](docs/decisiones.md).
- [Trabajo por ramas e integración](CONTRIBUTING.md).
- [Guía para agentes](AGENTS.md).

## Áreas del equipo

- [front/](front/README.md): pantallas, captura, revisión y búsqueda. Responsable: integrante de frontend.
- [back/](back/README.md): API, catálogo, permisos, estados y persistencia. Responsable: integrante de backend.
- [ia/](ia/README.md): extracción, IA, evaluación y ciencia de datos. Responsable: Daniel.
- El cuarto integrante, líder y responsable del pitch, dirige el [centro de mando](docs/centro-de-mando.md) y coordina la integración.

## Organización de Git

- `main`: entregas revisadas y demostrables.
- `integracion`: punto de unión de los módulos, coordinado por el líder.
- Próximas ramas: `feat/front`, `feat/back` y `feat/ia`, creadas desde el `main` que contiene esta organización. Aún no se crean en esta preparación.

Cada persona o agente trabaja en un clon o worktree propio. El corte es el **25 de octubre de 2026 a las 11:15, hora de Ciudad de México**. Cada área entrega commits separables; el líder selecciona lo esencial y conserva las ampliaciones en sus ramas si no entran.

## Fuentes de partida

La propuesta se basa en los documentos aportados por Daniel:

- *Descubre los retos del chilangatón.pdf*, 6 páginas.
- *Chilangaton_CDMX_Investigacion_y_Propuesta.pdf*, especialmente páginas 20-31.

Los PDF originales permanecen en la carpeta superior. Este repositorio conserva la propuesta de trabajo; las afirmaciones externas del informe deberán comprobarse antes de usarse como evidencia en la presentación.
