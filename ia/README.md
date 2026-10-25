# IA y ciencia de datos

Responsable: Daniel. Rama actual: **`IA`**, por instrucción de Daniel. Corte: **25/10/2026, 11:15 CDMX**.

## Inicio de esta rama

El enfoque actualizado es exclusivamente tianguis, con cuatro roles: admin, gerente, changarrito y comprador. El gerente crea los perfiles de los changarritos. Consulta [el plan breve](PLAN.md) y [la propuesta de conexión con backend](INTEGRACION_BACKEND.md).

El plan fue aprobado por Daniel. Están implementados la conexión a Claude, el recomendador con presupuesto, la validación de jornadas y un servicio local para backend. Un changarrito conserva su identidad y puede participar en distintos tianguis según el día. La extracción de menús, voz y los agentes autónomos siguen como ampliaciones.

Conexión real verificada el 25/10/2026: una generación respondió al marcador esperado, con 16 tokens de entrada y 4 de salida. [Resultado observado](evaluation/smoke_result.json). Las pruebas automatizadas usan respuestas simuladas y no consumen API.

## Prueba de Claude

Python 3.10 o posterior. Los scripts usan la biblioteca estándar; el recomendador necesita datos de zona horaria `America/Mexico_City`. Si el entorno no los incluye, instalar `tzdata`.

1. Copiar `.env.example` a `.env` dentro de `ia/` y completar `ANTHROPIC_API_KEY` localmente. El archivo está excluido de Git. No compartirlo ni pegar su contenido en el chat.
2. Desde la raíz del repositorio, verificar sin red: `python ia/smoke_test.py --dry-run`.
3. Ejecutar la prueba real: `python ia/smoke_test.py`.
4. Ejecutar pruebas sin API: `python -m unittest discover -s ia/tests -v`.

La prueba verifica acceso a `claude-haiku-5-5` y hace una generación con máximo 32 tokens, sin pensamiento, reintentos ni cambio automático de modelo. Muestra tokens observados, latencia y costo estimado. No muestra la clave ni guarda las respuestas en archivos. El workspace sólo es necesario si la clave lo requiere.

[Datos sintéticos del primer escenario](data/tianguis_demo.json): presupuesto de $100, opciones dentro y fuera del presupuesto, una agotada y una vencida. El contexto `as_of` fija el reloj de este ejemplo; no es información en vivo.

## Recomendador y conexión a backend

- Sin consumo: `python ia/recommend_demo.py`.
- Una llamada real: `python ia/recommend_demo.py --live`.
- Servicio local sin consumo: `python ia/api.py --mode mock`.
- Servicio local con Claude: `python ia/api.py --mode live`.
- Importación desde Python: `from ia import recommend`; llamar `recommend(payload, mode="mock")` o `mode="live"`.

El servicio escucha en `127.0.0.1:8001`: `GET /health` y `POST /recommend`. Es un puente local para backend; no está publicado para otras computadoras ni en Internet. [Contrato y ejemplo de uso](INTEGRACION_BACKEND.md).

Haiku usa **esfuerzo alto**, pensamiento adaptativo y salida JSON estructurada, con máximo 2048 tokens por generación. El catálogo se filtra antes de llamar al modelo y los IDs, importes y resultados se verifican después. Hay límites de entrada y cero reintentos o cambios automáticos de modelo. El esfuerzo alto no sustituye las validaciones.

[Prueba real del recomendador](evaluation/recommendation_live.json): seleccionó alternativas de $65 y $85 para un presupuesto de $100. El mismo negocio tiene además otra participación de lunes en un tianguis diferente; las ofertas no se mezclan.

## Demostración de actualización

`python ia/dynamic_demo.py` ejecuta tres etapas sin consumir API: ofertas iniciales, primera oferta agotada y ninguna alternativa dentro del presupuesto. Trabaja sobre una copia de datos sintéticos; no modifica la aplicación ni la base de backend.

Añadir `--live` para consultar a Haiku high en las etapas con candidatos. La etapa sin opciones no llama al modelo. `--output` permite guardar el reporte; no incluir datos privados.

[Secuencia real verificada con Claude](evaluation/dynamic_live.json): al agotar la comida de $65 quedó la alternativa de $85; al agotar las alternativas dentro del presupuesto respondió `no_match` sin una tercera llamada. Dos generaciones con costo total estimado de US$0.0002742. Las 31 pruebas automatizadas de esta entrega no consumen API.

## Propiedad

Todo el código, prompts, evaluación y análisis de esta área vive en `ia/`. Puedes elegir herramientas y modelos. Respeta el [contrato v1](../docs/contrato-v1.md); los cambios compartidos se coordinan con el líder.

## Siguiente ampliación: extracción

1. Recibir ExtractionRequest por texto o imagen y devolver ExtractionResult validado.
2. Extraer candidatos de producto, categoría, precio en centavos, unidad y horario, con evidencia cuando exista.
3. Mantener campos desconocidos en `null`, señalar ambigüedades y exigir revisión humana.
4. Distinguir ejecución real (`live`) de reproducción o respuesta de prueba (`mock`).
5. Entregar un adaptador invocable por backend y acordar juntos su transporte y configuración.

El adaptador no publica, no modifica la base del catálogo y no decide permisos. La clave de Claude queda en el entorno local o servidor, excluida de Git y del navegador. Modelo, acceso y consumo se verifican con una llamada pequeña cuando esté configurada la cuenta.

## Ciencia de datos desde el inicio

- Preparar ejemplos sintéticos o autorizados, con resultados esperados revisados.
- Medir tiempo total de extracción y revisión, errores por campo, correcciones y fallos.
- Registrar tokens y costo sólo cuando sean observados o calculables con tarifas verificadas; no inventar métricas para la demo.
- Conservar resultados reproducibles y distinguir objetivo de resultado. La mejora de 5× todavía no está demostrada.

## Ampliaciones separadas

Voz, normalización avanzada, búsqueda en lenguaje cotidiano, medición de consultas no resueltas y simulación de mandados. Mantener la salida del núcleo compatible aunque se exploren funciones adicionales. Los pronósticos requieren historia adecuada.

## Entrega al líder

Completa [ENTREGA.md](ENTREGA.md): adaptador, modo de ejecución, esquema, dependencias, verificación, métricas reales y commit candidato. [El ejemplo común](../docs/contratos/ejemplo-v1.json) permite empezar sin consumir API.
