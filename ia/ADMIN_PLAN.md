# Chat administrativo y datos para dashboards

Estado: chat de consulta, cálculos y datos para dashboard implementados en la rama `IA` y comprobados con datos sintéticos. Conexiones con la aplicación, pantalla del dashboard y PDF mensual real pendientes. Una consulta real con Haiku high interpretó la comparación de jitomate; las cifras las calculó el módulo estadístico.

## Prioridad de producto

Dos experiencias: comprador que resuelve una necesidad y directivo que revisa el sistema con datos. El chat administrativo consulta información y cambia filtros; las gráficas y tablas usan los mismos filtros y cálculos. El mapa compartido por comprador y administrador queda como **idea final de evolución**, por indicación de Daniel; no es prioridad de esta entrega.

## Jerarquía de consulta

Alcaldía → tianguis → gerente/participación → changarrito → giro → artículo.

Un changarrito puede participar en varios tianguis. Mostrar por separado negocios únicos y participaciones; el gerente de cada tianguis confirma su padrón. Los permisos de usuario definen el alcance. Daniel confirmó que las comparaciones comerciales se realizan por **giros, artículos y categorías**, no por roles de acceso.

## Preguntas principales

- ¿Dónde están los tianguis de esta alcaldía y qué información falta?
- ¿Qué giros predominan en cada tianguis?
- ¿Quiénes son sus gerentes y qué jornadas tienen programadas?
- ¿Quién tiene asistencia registrada, ausencia explícita o registro pendiente?
- ¿Qué gerentes entregaron el reporte mensual y cuáles lo tienen pendiente o vencido?
- ¿Cómo cambia el precio del mismo artículo por unidad entre tianguis este mes?
- Dentro de una categoría, ¿qué artículos muestran mayor diferencia de precios observados?

Asistencia y entrega mensual se modelan separadas: Daniel indicó que el significado de pase de lista aún es ambiguo y pidió preparar ambas.

## Etapas

1. Preparar snapshot sintético con padrón, composición, asistencia, reportes y observaciones de precios; conservar coordenadas para un mapa futuro.
2. Calcular indicadores reproducibles y especificaciones de gráficas sin IA generativa.
3. Usar Haiku high para interpretar la pregunta y sus filtros mediante un plan JSON restringido. El modelo no escribe SQL ni calcula cifras.
4. Devolver respuesta, fuentes, periodo, tablas y datos de gráficas al backend. El chat puede conservar los filtros de la pregunta anterior, revalidados por alcance.
5. Conectar el PDF mensual: extracción → revisión de tablas/unidades → fuente por página → snapshot versionado. La ingestión real depende de recibir el archivo y conocer sus columnas.
6. Integrar dashboard en frontend usando las series y puntos del adaptador. El área IA prepara datos y contrato; no modifica `front/` ni `back/`.

## Dashboard propuesto

- Resumen: tianguis del alcance, negocios únicos, participaciones y cobertura de datos.
- Composición: cantidad de participaciones por giro, con denominador explícito.
- Precios: mediana, mínimo, máximo y muestra por artículo/presentación/unidad/tianguis. Separar series heterogéneas.
- Seguimiento: asistencia por jornada y entrega mensual de reportes en vistas distintas.
- Calidad: precios, ubicaciones, calendarios o registros pendientes.

Los filtros compartidos son periodo, alcaldía, tianguis, categoría, artículo y fecha de jornada. No se mostrarán tarjetas o gráficos con ceros inventados para campos que faltan.

## Criterios de confianza

- Filtro de permisos antes de calcular o enviar metadatos a Claude.
- Precio desconocido no equivale a cero. Convertir sólo unidades compatibles.
- Una observación elegible por negocio–tianguis–artículo–presentación–unidad para evitar sobreponderar publicaciones repetidas.
- Mostrar muestra y fuentes. Una diferencia de precios no demuestra causa, ventas, inflación de la ciudad o conducta ilegal.
- Asistencia con padrón y registros explícitos; falta de actividad digital no prueba ausencia.
- El PDF mensual es un corte histórico, no disponibilidad en vivo.
- Lectura solamente: el chatbot no sanciona, modifica padrones, marca asistencias ni ejecuta pagos.

## Fuera de este MVP

CoDi y monetización permanecen en la evolución del producto. No se implementa cobro ni se solicitan datos bancarios. También quedan posteriores las predicciones y recomendaciones de política que requieran historia, cobertura y validación.

El mapa de tianguis queda como idea final para **comprador y administrador**. Posteriormente puede enriquecerse con composición, cobertura y otros indicadores del dashboard institucional. Las coordenadas desconocidas permanecen como faltantes.

## Para conectar con información real

PDF mensual de ejemplo; definición de columnas y unidades; padrón y calendarios; fuente de asistencia; fechas límite de reportes; roles y alcance institucional; API de backend. Mientras no estén disponibles, toda demostración mostrará su origen sintético.
