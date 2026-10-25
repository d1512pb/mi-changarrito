# IA y ciencia de datos

Responsable: Daniel. Próxima rama: `feat/ia`, creada después desde `main` actualizado. Corte: **25/10/2026, 11:15 CDMX**.

## Propiedad

Todo el código, prompts, evaluación y análisis de esta área vive en `ia/`. Puedes elegir herramientas y modelos. Respeta el [contrato v1](../docs/contrato-v1.md); los cambios compartidos se coordinan con el líder.

## Núcleo de IA

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
