# Catálogo de demostración

Carga opcional de **tianguis reales y ofertas sintéticas** para que la aplicación se vea poblada en una demostración. Sólo escribe datos públicos; **no crea usuarios, contraseñas ni sesiones**.

## Activar y desactivar

- Activar: `DEMO_CATALOG=true` en el servicio `back` de Railway (o en `backend/.env` en local) y reiniciar. Cada arranque crea lo que falte y renueva vigencia y estado de las ofertas de demostración.
- Desactivar: quitar la variable. Los datos ya cargados permanecen hasta borrarlos.
- Borrar sólo lo de demostración (identificadores `demo-…`):

```sql
DELETE FROM changarrito_documents
WHERE (collection = 'offer' AND id LIKE 'demo-oferta-%')
   OR (collection = 'tianguis' AND id LIKE 'demo-tianguis-%');
```

## Contenido

- 10 tianguis con ubicación, día y horario de [Tianguis de la Ciudad de México](https://datos.cdmx.gob.mx/dataset/tianguis-de-la-ciudad-de-mexico) (SEDECO, CC-BY-4.0-ESP). El conjunto no trae nombre comercial; se usa el del propio registro o «Tianguis <colonia>». Quedan marcados `is_demo` porque la operación que se muestra en ellos es simulada.
- 20 puestos ficticios y 64 ofertas con precios inventados, vigentes 14 días desde cada arranque. Todo lleva `is_demo: true` y la interfaz lo etiqueta «Demostración». No son evidencia de precios ni de comercios reales.
- Imágenes: sin fotos; cada oferta muestra una ilustración según el nombre del producto (`offerArt()` en `fronted/js/icons.js`) y, si no hay coincidencia, un huacal.

## Límites

- Las ofertas de demostración no pertenecen a ninguna cuenta: aparecen en búsqueda y recomendaciones aunque no exista el puesto (`is_demo_catalog_offer` en `offer_service.py`, sólo para `is_demo` con `id_merchant` «demo-…»). Nadie puede agotarlas desde un panel de puesto; el gerente o el administrador pueden suspenderlas por moderación.
- Para recorrer el flujo completo (administrador → gerente → puesto → oferta → agotar) hay que crear esas cuentas desde la aplicación; el catálogo no las sustituye.
- Pruebas: `backend/tests/test_demo_catalog.py`.
