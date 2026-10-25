# Mi Changarrito

**Lo que hay hoy en tu barrio, confirmado por quien lo vende.**

Aplicación integrada para el reto de comercio popular y barrial del Chilangatón 2026, CDMX. Un comerciante captura texto o una foto, revisa un borrador y confirma su publicación con vigencia. Los vecinos consultan ofertas disponibles; una oferta agotada o vencida sale de la búsqueda.

El frontend, backend e integración de IA comparten una aplicación [publicada en Railway](https://back-production-f63c.up.railway.app). El primer despliegue está en `SUCCESS` y fue verificado el 25/10/2026, incluida la persistencia de sesión, borrador y foto tras reiniciar la aplicación. Consulta el [registro de verificación](docs/primer-despliegue-verificado.md).

## Aplicación actual

- `fronted/`: PWA de HTML, CSS y JavaScript, sin compilación, servida en `/`.
- `backend/`: FastAPI, autenticación Bearer, permisos, estados, catálogo y fotos. El frontend usa `/api` en el mismo origen; las rutas heredadas sin `/api` siguen disponibles.
- `ia/`: módulos de recomendación y análisis. La aplicación integrada ejecuta extracción local `mock` y recomendaciones `rules` del catálogo vigente, sin llamadas a Anthropic.
- `Dockerfile` de la raíz: empaqueta las tres áreas en un solo servicio de aplicación. Railway mantiene la configuración de construcción y healthcheck; esta entrega no usa `railway.json`.

En producción, PostgreSQL conserva usuarios, sesiones y ofertas mediante documentos JSONB; el bucket S3 guarda las fotos. El servidor exige configuración persistente y rechaza el arranque con semillas o un secreto de sesión por defecto. El catálogo comienza vacío, sin cuentas demo conocidas. El registro público sólo crea consumidores o locatarios; seguridad y PRO se administran de forma privada.

El [contrato v1](docs/contrato-v1.md) es el objetivo de integración y aún tiene diferencias respecto a las rutas y campos actuales. La API ejecutable se documenta en `/docs`; la guía de despliegue enumera las rutas reales y los límites.

## Desarrollo local

Con Python 3.12, desde la raíz del repositorio:

```sh
python -m venv .venv
# Activar .venv según el sistema operativo.
python -m pip install -r backend/requirements-dev.txt
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

Abrir `http://127.0.0.1:8000/`; documentación en `/docs`, salud en `/api/health` y modos de extracción/recomendación en `/api/ai/status`. Sin `DATABASE_URL` y en desarrollo se usa memoria, que se pierde al reiniciar. La configuración de producción y las referencias de PostgreSQL/S3 están descritas en [Despliegue en Railway](docs/despliegue-railway.md).

La sesión del navegador se guarda por pestaña, sin tokens en URLs. Capturar crea un borrador privado; publicar exige revisión explícita. La foto puede procesarse opcionalmente con OCR local del dispositivo o completarse manualmente. El ejemplo sintético es una pantalla separada y no se mezcla con el catálogo real.

## Verificación realizada

Pasaron 24 pruebas de backend, 89 de IA y 12 del cliente/service worker, sin consumo de proveedores. También se comprobó la interfaz real publicada con Edge en escritorio y móvil, sin errores ni desbordamiento. El smoke HTTP pasó contra backend local y contra producción; en Railway verificó PostgreSQL/S3 y persistencia tras reiniciar la aplicación.

```sh
cd backend
python -m pytest tests
cd ..
python -m unittest discover -s ia/tests -v
node --test fronted/tests/api.test.cjs fronted/tests/service-worker.test.cjs
```

El smoke reproducible está en `scripts/deployment_smoke.py`, con fases `prepare` y `verify`. Crea registros técnicos sintéticos y al terminar retira su oferta de la búsqueda. Ver [procedimiento y manejo del estado privado](docs/despliegue-railway.md).

## Documentación

- [Primer despliegue en Railway, variables y verificación](docs/despliegue-railway.md).
- [Frontend conectado](fronted/README.md) y [entrega verificada](fronted/ENTREGA.md).
- [API original de backend](backend/README.md): conserva antecedentes; la persistencia y el despliegue actuales se describen en la guía de Railway.
- [Módulo de IA](ia/README.md): sus ejemplos históricos y opciones `--live` no forman parte del arranque integrado.
- [Contrato v1](docs/contrato-v1.md), [decisiones](docs/decisiones.md), [coordinación](docs/centro-de-mando.md), [colaboración](CONTRIBUTING.md) y [guía de agentes](AGENTS.md).

Repositorio privado: [d1512pb/mi-changarrito](https://github.com/d1512pb/mi-changarrito). Los documentos iniciales `front/` y `back/` conservan la preparación del equipo; la aplicación ejecutable utiliza `fronted/` y `backend/`.

## Límites actuales

El catálogo real no incluye semillas sintéticas. Las recomendaciones locales no ofrecen interpretación generativa de consultas; la extracción puede requerir corrección manual. Carrito, mensajes entre usuarios, favoritos, asistencia, analítica administrativa y chat administrativo de IA no están conectados en esta entrega. La moderación de ofertas sí aplica permisos reales. No se inventan tianguis, horarios o ubicaciones; una oferta vigente no confirma que el local esté abierto ahora.
