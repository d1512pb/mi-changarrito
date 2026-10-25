# Trabajo por ramas

## Ramas

- `main`: base estable y entregas revisadas.
- `integracion`: rama del responsable de unir módulos y verificar el recorrido completo.
- `feat/<tarea>`: una función concreta.
- `fix/<tarea>`: una corrección concreta.
- `docs/<tarea>`: documentación.

Las ramas de tarea parten de `integracion`. Los nombres de módulos y sus responsables se acuerdan antes de iniciar trabajo paralelo.

## Un espacio de trabajo por agente

Cada agente o persona que trabaje simultáneamente usa su propio clon o worktree. Cambiar de rama dentro de una carpeta compartida altera el espacio de los demás.

Ejemplo local, ejecutado desde la carpeta del repositorio:

```powershell
git worktree add ../mi-changarrito-interfaz -b feat/interfaz integracion
```

El nombre `interfaz` es ilustrativo; crear sólo los espacios correspondientes a tareas ya asignadas. Los agentes que usen espacios administrados por su herramienta deben seguir el mecanismo de worktrees de esa herramienta.

## Antes de repartir

1. El líder acuerda el alcance con el equipo.
2. Se designa integrador.
3. Se acuerda el contrato de datos compartido y se guarda en `docs/`.
4. Cada tarea define archivos propios, dependencias y criterio de aceptación.

El integrador coordina cambios en contratos, dependencias, configuración y otros archivos compartidos.

## Entrega de una tarea

- Hacer commits pequeños en la rama asignada.
- Entregar el nombre de la rama, qué cambió, cómo se verificó y qué falta.
- No incluir claves, credenciales ni datos personales reales sin autorización.
- Evitar cambios ajenos a la tarea.

Cuando exista GitHub, abrir una solicitud de cambios con destino a `integracion`. El integrador revisa y une cada entrega, resuelve conflictos y comprueba el recorrido completo. Después promueve una versión demostrable a `main`.

Sin remoto, el integrador puede revisar las ramas locales y unirlas con Git. No hay sincronización entre computadoras hasta configurar un remoto o intercambiar los cambios explícitamente.

## Verificación de integración

- La captura produce un borrador revisable.
- Confirmar una ficha la hace visible en búsqueda con vigencia.
- Agotar, retirar o vencer una oferta cambia su elegibilidad en las consultas.
- Un dato ausente no se transforma en precio, horario o disponibilidad inventados.
- Los casos de prueba y cualquier reproducción están identificados.

No sobrescribir cambios de otros, reescribir ramas compartidas ni forzar envíos sin coordinación expresa.
