# Propuesta inicial: Mi Changarrito

Estado: borrador para acordar con el equipo. Fecha: 25 de octubre de 2026.

## Propuesta en una frase

Mi Changarrito ayuda a los comercios populares a publicar lo que ofrecen con menos esfuerzo y conecta a los vecinos con información vigente, confirmada por quien vende.

## Problema concreto

La información del comercio barrial está dispersa entre letreros, menús, conversaciones y publicaciones. Encontrar un negocio no basta para saber qué ofrece hoy, a qué precio, en qué horario y si la información sigue vigente. Mantener un catálogo digital también demanda tiempo al comerciante.

Abordamos la inclusión digital del comercio popular. Cualquier objetivo adicional sobre formalización administrativa debe acordarse con el equipo a partir del planteamiento oficial.

## Usuarios

- Comerciante: quiere que lo encuentren por lo que vende y actualizar la información sin capturar todo de nuevo.
- Vecino: quiere saber dónde conseguir algo cerca y distinguir lo confirmado de lo que necesita preguntar.

## Solución propuesta

Una entrada sencilla, una revisión humana y una ficha con vencimiento:

**Foto o texto → extracción → revisión → publicación vigente → búsqueda → actualización.**

La IA interpreta el material y propone datos. Las reglas de la aplicación validan estructura, estado y vigencia. El comerciante decide qué publicar. Un dato ausente permanece ausente; la disponibilidad declarada no se presenta como inventario garantizado.

## MVP propuesto para el evento

1. Registrar un comercio con nombre y ubicación elegida o confirmada por su responsable.
2. Capturar una foto o texto de su oferta.
3. Extraer nombre de producto, precio y unidad cuando aparezcan, y horario si está explícito. Conservar la evidencia disponible.
4. Permitir corregir los campos y fijar hasta cuándo vale la oferta.
5. Publicar y buscar por producto o categoría dentro de una zona piloto.
6. Marcar una oferta como agotada o retirada y excluirla de resultados disponibles. Aplicar también el vencimiento.

La lista de resultados debe funcionar aunque no haya mapa. El piloto puede usar pocos comercios; los datos sintéticos se identifican como tales.

## Demostración objetivo

1. Fotografiar un cartel o menú autorizado.
2. Mostrar los datos extraídos y corregir un campo ambiguo.
3. Confirmar y publicar la ficha con vencimiento.
4. Encontrar su oferta desde la vista del vecino.
5. Marcarla como agotada y comprobar que los resultados cambian.

Una extracción guardada puede servir de respaldo si falla la conexión, identificada como reproducción de una ejecución previa.

## Diferenciación que vamos a probar

- Actualizar a partir del material que ya usa el comerciante.
- Mostrar fuente, confirmación y vigencia de la información.
- Reflejar los cambios del comercio en las respuestas al vecino.

La combinación es una hipótesis de valor. Todavía no hemos medido adopción, incremento de ventas ni superioridad frente a otras herramientas.

## Validación breve

- Medir el tiempo total para publicar una ficha correcta, incluida su revisión, frente a una captura manual comparable.
- Registrar errores en precio, unidad, horario y ubicación; comprobar el tratamiento de datos desconocidos.
- Observar si una persona encuentra una oferta y entiende su vigencia.
- Probar corrección, agotamiento y vencimiento.

El informe propone explorar una mejora de 5×; sigue siendo una meta sin demostrar. Se comunicará el resultado medido, aunque sea menor.

## Ampliaciones después del recorrido central

- Voz como alternativa de captura.
- Lista de mandado con presupuesto y restricciones de horario.
- Recorrido entre varias ofertas, si contamos con tiempos y rutas comprobables.
- Vista de fichas que necesitan actualización.

Pagos, reparto, reservas de inventario y trámites de formalización quedan fuera del MVP propuesto.

## Base técnica por confirmar

El informe sugiere React con TypeScript, una API Python con FastAPI y SQLite para la demostración. La extracción tendría un adaptador a Claude con salida validada. Antes de fijar el stack se confirmarán las habilidades y herramientas disponibles del equipo.

La clave de Claude se guarda en el servidor o entorno local excluido de Git. El modelo, acceso y consumo se comprobarán mediante una llamada pequeña; este documento no fija precios ni disponibilidad de modelos.

## Primer acuerdo del equipo

Cerrar una zona piloto, los campos obligatorios, el contrato de datos, las tecnologías y la persona que integra. Después asignar tareas con archivos delimitados y una condición observable de entrega.
