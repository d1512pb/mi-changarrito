# Roles y registro del MVP

Corrección solicitada el 25/10/2026: la aplicación se organiza por tianguis, no por negocios que se dan de alta libremente.

- Cliente (`consumidor`): registro público, búsqueda y consulta de ofertas.
- Administrador (`pro`): crea tianguis y gerentes, asigna a cada gerente sus `tianguis_ids`.
- Gerente (`gerente`): registra puestos y crea sus usuarios `locatario`, únicamente en sus tianguis asignados. Puede activar/desactivar sus cuentas, restablecerles contraseña y revisar las ofertas de su alcance.
- Puesto (`locatario`): recibe su cuenta del gerente, captura, revisa, confirma y agota sus propias ofertas. Cada puesto tiene `tianguis_id`.

`POST /api/user/register` sólo admite `email`, `password`, `nombre` y, opcionalmente, `rol=consumidor`. Rechaza roles de puesto, gerente o administrador y campos de negocio.

## Rutas operativas

- Administrador: `GET/POST /api/admin/tianguis`, `POST /api/admin/users` con `rol=gerente` y `tianguis_ids`, y listado de gerentes con `GET /api/admin/users?rol=gerente`.
- Gerente: `GET /api/management/tianguis`, `GET/POST /api/management/stalls`, `PATCH /api/management/stalls/{id}` con `activo`, y `POST /api/management/stalls/{id}/reset_password` con `new_password`.
- Consulta pública: `GET /api/tianguis`; `GET /api/offer/search?q=...&tianguis_id=...` permite buscar por producto, puesto o nombre del tianguis y filtrar por su ID.
- Moderación: el rol gerente ve y modifica sólo ofertas de sus tianguis; el administrador conserva su alcance global.

La identidad, los roles y el alcance se obtienen de la sesión del servidor. No se acepta un rol arbitrario en el registro de un puesto por un gerente, ni IDs de tianguis ajenos. Desactivar un puesto cierra sus sesiones y retira sus ofertas de la búsqueda.

Los tianguis son documentos de la colección `tianguis` en la tabla JSONB existente. Las ofertas nuevas conservan `tianguis_id`, `tianguis_nombre` e `is_demo` obtenidos del puesto y del tianguis, no de la captura del cliente. Los datos de demostración se identifican como tales.

No se importan tianguis reales en esta corrección: el siguiente paso es cargar los datos del equipo. El administrador ya dispone del formulario para crear tianguis y gerentes; éstos disponen del formulario para registrar puestos. Las cuentas demo tienen claves aleatorias entregadas al propietario, fuera del código y de los assets públicos.

Validación del MVP: dos pruebas de backend cubren registro exclusivo de clientes y el recorrido administrador–gerente–puesto, incluyendo rechazo de acceso entre tianguis; se comprueba también el guard del cliente web. No se ejecutan las suites extensas de IA para este cambio.
