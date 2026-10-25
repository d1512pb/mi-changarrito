# Entrega de IA y ciencia de datos

Rama: `IA`. Entrega: cliente Claude, recomendador con presupuesto, chat administrativo, analítica para dashboard y puente local para backend. El commit se identifica en el historial de esta rama.

## Implementado y verificado

- Cliente HTTP con endpoint oficial fijo, sin redirecciones, reintentos ni fallback de modelo.
- Configuración local ignorada por Git; las claves no aparecen en salidas ni errores.
- Consulta de acceso al modelo y una generación real con `claude-haiku-5-5`, máximo 32 tokens, pensamiento desactivado y esfuerzo bajo.
- Resultado real: marcador esperado recibido; 16 tokens de entrada, 4 de salida y 981 ms de latencia de generación. Costo de tokens estimado: US$0.0000036. Ver `evaluation/smoke_result.json`.
- Datos sintéticos para el escenario «tengo $100 y quiero comer».
- Plan de cuatro roles y propuesta de interfaz con backend.
- Recomendador en Haiku high con pensamiento adaptativo y JSON estructurado; máximo 2048 tokens por generación.
- Validación determinista de precio, presupuesto, visibilidad, estado, confirmación, vigencia, participación y jornada del tianguis.
- Mismo negocio en varios tianguis: días y precios independientes, calendario ISO en horario de CDMX y jornadas nocturnas de hasta 24 horas.
- Prueba real del recomendador: alternativas de $65 y $85; 1117 tokens de entrada, 153 de salida, 3200 ms y US$0.0001882 estimados. Ver `evaluation/recommendation_live.json`.
- Servicio HTTP local comprobado en modo mock, sin consumir API.
- Pruebas automatizadas sin consumir API: permisos públicos y administrativos, pertenencia, días/jornadas, límites de fecha, presupuesto, IDs inventados, salida malformada, actualización, precios comparables y adaptación de ofertas. El recuento final se guarda en `evaluation/verification.json`.
- Secuencia con Claude real: comida de $65 y tacos de $85 → agotamiento de $65 → tacos de $85 → agotamiento de opciones factibles → `no_match` sin otra llamada. Dos generaciones, US$0.0002742 estimados. Ver `evaluation/dynamic_live.json`.
- Chat administrativo con plan JSON acotado, filtros de conversación revalidados y cálculos deterministas; directorio, composición, asistencia, reportes y cobertura.
- Dashboard devuelve datos y especificaciones de gráficas por permiso; mapa omitido por defecto y reservado para comprador/administrador en una etapa futura. No incluye una pantalla implementada en frontend.
- Una consulta administrativa real con Haiku high: 1462 tokens de entrada, 63 de salida, 2913 ms y US$0.0001777 estimados. Comparó mediana de jitomate saladette por kg, sin mezclar cherry. Ver `evaluation/admin_prices_live.json`.
- Adaptador de las ofertas de la rama `backend`; requiere contexto explícito de participación y jornada. Revisión fijada al commit del compañero y diferencias documentadas en `REVISION_BACKEND.md`. No se modificó su rama.

## Cómo ejecutar

- Python 3.10+ y datos de zona horaria de CDMX (`tzdata` si el entorno no los incluye).
- Configurar `ia/.env` con la clave y, si la clave lo requiere, el ID de workspace. No compartir este archivo.
- Sin API: `python -m unittest discover -s ia/tests -v` y `python ia/smoke_test.py --dry-run`.
- Prueba real y con consumo: `python ia/smoke_test.py`.
- Recomendación sin API: `python ia/recommend_demo.py`; con consumo: añadir `--live`.
- Backend local: `python ia/api.py --mode mock` o `--mode live`; `POST http://127.0.0.1:8001/recommend`.
- Backend Python también puede importar `from ia import recommend`.
- Demostración de actualización: `python ia/dynamic_demo.py` sin API, o añadir `--live` para hasta dos generaciones. Siempre usa copia de datos sintéticos.
- Chat admin: `python ia/admin_demo.py --summary`; añadir `--live` consume una generación. Dashboard: `python ia/admin_demo.py --dashboard --summary`, sin API.
- HTTP administrativo: configurar `IA_INTERNAL_TOKEN` en IA y backend; enviar `X-IA-Internal-Token` sólo desde backend. Contrato en `ADMIN_INTEGRACION.md`.

## Siguiente etapa

Conectar el catálogo y snapshot reales; backend debe aportar gerente, tianguis, participaciones y jornadas, y aplicar el alta del changarrito por gerente. Falta recibir el PDF mensual de 16 páginas para revisar columnas/unidades y extraer datos con su procedencia. Todos los ejemplos actuales son sintéticos. Extracción de fotos, voz y agentes autónomos aún no están implementados. El servicio actual es local; no se ha desplegado ni conectado con frontend o con otra computadora. Las escrituras de la demostración ocurren sólo sobre una copia sintética en memoria. Mapa y CoDi quedan para la evolución.

## Límite de la comprobación

Las pruebas y la llamada con datos sintéticos verifican los casos descritos; no demuestran utilidad general, ventas o un 5×. Los costos son estimaciones con tarifas documentales y tokens observados, no una lectura del saldo.
