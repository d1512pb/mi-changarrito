# Trabajo por áreas y ramas

El líder, también responsable del pitch, es el centro de mando y coordina la integración. El corte es el **25/10/2026 a las 11:15, hora de Ciudad de México**.

## Ramas

- `main`: base estable y entregas revisadas.
- `integracion`: rama coordinada por el líder para unir módulos y verificar el recorrido completo.
- Próximas ramas de área: `feat/front`, `feat/back` y `feat/ia`.
- `feat/<tarea>`: una función adicional concreta, si se necesita.
- `fix/<tarea>`: una corrección concreta.
- `docs/<tarea>`: documentación.

La preparación de las tres áreas se publica directamente en `main` por instrucción expresa de Daniel. Las ramas de área se crearán después desde esa base actualizada de `main`; no parten de la versión anterior de `integracion`.

## Un espacio de trabajo por agente

Cada agente o persona que trabaje simultáneamente usa su propio clon o worktree. Cambiar de rama dentro de una carpeta compartida altera el espacio de los demás.

Ejemplo local, ejecutado desde la carpeta del repositorio:

```powershell
git fetch origin
git worktree add ../mi-changarrito-front -b feat/front origin/main
```

Crear sólo los espacios correspondientes a tareas ya iniciadas. Los agentes que usen espacios administrados por su herramienta deben seguir el mecanismo de worktrees de esa herramienta.

## Libertad y propiedad de archivos

- Frontend es dueño de `front/`; backend de `back/`; Daniel de `ia/`.
- Cada área elige herramientas, estructura interna y funciones adicionales dentro de su carpeta.
- El líder coordina raíz, `docs/`, contratos y configuración compartida.
- Conservar el contrato JSON v1 de `docs/contrato-v1.md` y `docs/contratos/`.
- Acordar cambios incompatibles con el líder y las áreas afectadas antes de depender de ellos.
- Frontend puede avanzar con los ejemplos sintéticos; backend conserva la fuente de verdad del catálogo; IA devuelve borradores revisables.
- Mantener el núcleo en commits separables de las funciones experimentales.

El integrador coordina cambios en contratos, dependencias, configuración y otros archivos compartidos.

## Entrega de una tarea

- Hacer commits pequeños en la rama asignada.
- Entregar el nombre de la rama, qué cambió, cómo se verificó y qué falta.
- No incluir claves, credenciales ni datos personales reales sin autorización.
- Evitar cambios ajenos a la tarea.

## Corte de las 11:15

1. Cada área sube el commit candidato y completa su propio `ENTREGA.md`.
2. Reporta rama, commit, qué funciona, cómo ejecutarlo, qué se verificó y qué falta.
3. El líder actualiza `integracion` con la base de `main` antes de integrar las áreas.
4. Puede unir ramas completas coherentes o seleccionar commits autocontenidos. Las ampliaciones que no entren quedan conservadas en sus ramas.
5. Comprueba el recorrido completo y promueve una entrega demostrable a `main`.

Las ampliaciones pueden continuar después del corte si permanecen separadas y no retrasan el núcleo. El líder decide qué se presenta en el pitch según lo comprobado.

## Verificación de integración

- La captura produce un borrador revisable.
- Confirmar una ficha la hace visible en búsqueda con vigencia.
- Agotar, retirar o vencer una oferta cambia su elegibilidad en las consultas.
- Un dato ausente no se transforma en precio, horario o disponibilidad inventados.
- Los casos de prueba y cualquier reproducción están identificados.

No sobrescribir cambios de otros, reescribir ramas compartidas ni forzar envíos sin coordinación expresa.
