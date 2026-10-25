# Entrega de IA y ciencia de datos

Rama: `IA`. Primera entrega: cliente mínimo de Claude y plan actualizado para tianguis. El commit se identifica en el historial de esta rama.

## Implementado y verificado

- Cliente HTTP con endpoint oficial fijo, sin redirecciones, reintentos ni fallback de modelo.
- Configuración local ignorada por Git; las claves no aparecen en salidas ni errores.
- Consulta de acceso al modelo y una generación real con `claude-haiku-5-5`, máximo 32 tokens, pensamiento desactivado y esfuerzo bajo.
- Resultado real: marcador esperado recibido; 16 tokens de entrada, 4 de salida y 981 ms de latencia de generación. Costo de tokens estimado: US$0.0000036. Ver `evaluation/smoke_result.json`.
- Datos sintéticos para el escenario «tengo $100 y quiero comer».
- Plan de cuatro roles y propuesta de interfaz con backend.

## Cómo ejecutar

- Python 3.10+; sólo biblioteca estándar.
- Configurar `ia/.env` con la clave y, si la clave lo requiere, el ID de workspace. No compartir este archivo.
- Sin API: `python -m unittest discover -s ia/tests -v` y `python ia/smoke_test.py --dry-run`.
- Prueba real y con consumo: `python ia/smoke_test.py`.

## Siguiente etapa

Recomendador con presupuesto sobre ofertas públicas, verificación de referencias, estado y vigencia, y adaptación al formato de backend. La recomendación, extracción de fotos, voz y multiagentes aún no están implementados. `INTEGRACION_BACKEND.md` es una propuesta para coordinar, no un endpoint ya operativo.

## Límite de la comprobación

Una llamada verifica acceso y formato mínimo; no evalúa la calidad de recomendaciones. El costo es una estimación a partir de tarifas documentales y tokens observados, no una lectura del saldo.
