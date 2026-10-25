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

Repositorio de arranque: propuesta y forma de colaboración documentadas. La aplicación todavía no está implementada. El alcance y las tecnologías están sujetos al acuerdo del equipo y a las indicaciones del evento.

## Documentos de trabajo

- [Propuesta y alcance inicial](docs/propuesta.md).
- [Decisiones confirmadas y pendientes](docs/decisiones.md).
- [Trabajo por ramas e integración](CONTRIBUTING.md).
- [Guía para agentes](AGENTS.md).

## Organización de Git

- `main`: entregas revisadas y demostrables.
- `integracion`: punto de unión de los módulos; a cargo del integrador que designe el equipo.
- `feat/<tarea>`, `fix/<tarea>`, `docs/<tarea>`: trabajo acotado de cada responsable.

Cada agente debe usar su propio clon o worktree para trabajar simultáneamente en ramas distintas. La asignación de módulos y responsables está pendiente.

## Fuentes de partida

La propuesta se basa en los documentos aportados por Daniel:

- *Descubre los retos del chilangatón.pdf*, 6 páginas.
- *Chilangaton_CDMX_Investigacion_y_Propuesta.pdf*, especialmente páginas 20-31.

Los PDF originales permanecen en la carpeta superior. Este repositorio conserva la propuesta de trabajo; las afirmaciones externas del informe deberán comprobarse antes de usarse como evidencia en la presentación.
