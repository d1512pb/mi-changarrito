# Mi Changarrito — back

FastAPI **sin base de datos por ahora**: todo vive en memoria (`app/core/database.py`)
y se reinicia con el servidor. Sesión por header `Authorization: Bearer`, **sin cookies**.

## Estructura
```
backend/
├── main.py                      # app, CORS, handler de errores, routers
├── Dockerfile · requirements.txt · requirements-dev.txt · .env.example
├── app/
│   ├── api/
│   │   ├── dependencies/deps.py # get_current_user, require_roles(...), factories de servicios
│   │   └── routes/              # user, session, offer, moderation, admin
│   ├── core/                    # config, database (memoria), security (bcrypt), errors
│   ├── middleware/              # IP y user-agent para las sesiones
│   ├── schemas/                 # *_schema.py (Pydantic)
│   ├── services/                # *_service.py (lógica) + ai_extractor, storage, geo
│   └── seed.py                  # datos de demo
└── tests/
```

## Levantar
```bash
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn main:app --reload --port 8000     # docs en http://localhost:8000/docs
pytest
```

## Autenticación
1. `POST /user/login` `{email, password}` → `{token, token_type, rol}`.
2. El front guarda el token y manda `Authorization: Bearer <token>` en cada llamada.
3. En el servidor solo se guarda el HMAC del token. Expira a los 7 días (`SESSION_TTL_DAYS`) y hay un máximo de sesiones por usuario (`MAX_SESSIONS_PER_USER`; al pasarse se cierra la más vieja).
4. Cambiar contraseña, desactivar o cambiar de rol a alguien **cierra sus sesiones**.

## Roles
| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| `consumidor` | Registro público | Buscar (sin cuenta también) y **reportar** ofertas |
| `locatario` | Registro público (pide `nombre_negocio` y `ubicacion`) | Crear borrador, editar, publicar, agotar **sus** ofertas |
| `seguridad` | Solo lo crea un PRO | Ver todas las ofertas y reportes, **suspender / reinstalar** |
| `pro` | `PRO_EMAIL`+`PRO_PASSWORD` o seed | Todo lo de seguridad + gestionar usuarios |

El registro público **nunca** crea `seguridad` ni `pro`.

## Endpoints
| Método | Ruta | Rol | Para qué |
|---|---|---|---|
| POST | `/user/register` | público | Crea consumidor o locatario |
| POST | `/user/login` | público | Devuelve token |
| GET | `/user/profile` | cualquiera | Perfil y rol (el front decide qué pantallas mostrar) |
| PUT | `/user/update` | cualquiera | Datos propios; cambiar contraseña pide `current_password` |
| POST | `/user/logout` · `/user/logout_all` | cualquiera | Cierra la sesión actual / todas |
| GET | `/session/active` | cualquiera | Mis sesiones activas |
| POST | `/session/logout_all/{user_id}` | pro | Cierra sesiones de otro usuario |
| GET | `/offer/search?q=&lat=&lng=&radio=` | público | Solo publicadas y vigentes |
| GET | `/offer/{id}` | público | Detalle (agotada/vencida se ven como tales; borrador y suspendida → 404) |
| GET | `/offer/mine` | locatario | Mis ofertas, todos los estados |
| POST | `/offer/draft` | locatario | `multipart`: `texto` y/o `foto` → borrador + `campos_faltantes` / `campos_ambiguos` |
| PUT | `/offer/update/{id}` | locatario | Corregir (si estaba publicada, vuelve a borrador) |
| POST | `/offer/publish/{id}` | locatario | `{"vigencia_horas": 4}` o `{"vigente_hasta": "..."}`; guarda `confirmado_en` |
| POST | `/offer/sold_out/{id}` | locatario | Marca agotada |
| POST | `/offer/report/{id}` | consumidor | `{"motivo": "..."}`; una vez por oferta |
| GET | `/moderation/?estado=&solo_reportadas=` | seguridad, pro | Todas las ofertas, las más reportadas primero |
| POST | `/moderation/suspend/{id}` | seguridad, pro | `{"motivo": "..."}` |
| POST | `/moderation/reinstate/{id}` | seguridad, pro | Vuelve a su estado previo y limpia reportes |
| POST | `/moderation/dismiss_reports/{id}` | seguridad, pro | Revisó y no procede |
| GET/POST | `/admin/users` | pro | Listar (`?rol=`) / crear cualquier rol |
| PATCH | `/admin/users/{id}` | pro | `{"rol":..., "activo":...}` |
| POST | `/admin/users/{id}/reset_password` | pro | `{"new_password": "..."}` |

Estados de oferta: `borrador → publicada → agotada | vencida`, y `suspendida` (la pone seguridad/PRO).
`vencida` se calcula al leer (`vigente_hasta` pasada); no hay jobs.
Errores: `{"detail": "..."}`. 401 sin sesión, 403 sin permiso o cuenta desactivada, 404 no existe o no es tuya,
409 estado inválido o correo repetido, 422 datos inválidos (al publicar con faltantes incluye `campos_faltantes`).

## Demo (solo desarrollo)
Con `SEED_ON_START=true`: contraseña `Demo1234` para `loc1@changarrito.mx` … `loc4@`, `consumidor@`,
`seguridad@` y `pro@changarrito.mx`; 12 ofertas vigentes, 1 agotada y 1 vencida.
En `ENVIRONMENT=production` el servidor **se niega a arrancar** con seed o con el `SESSION_SECRET` por defecto.
Primer PRO en producción: `SEED_ON_START=false`, `PRO_EMAIL` y `PRO_PASSWORD` en el entorno.

## Conectar la IA (Daniel)
`app/services/ai_extractor.py`: implementar `extract(texto, imagen, mime) -> ExtractionResult`
(`campos` + lista `ambiguos`) y devolverla en `get_extractor()`. Hoy hay un mock con regex.

## Cuando se elija base de datos
Los servicios solo usan `db.user`, `db.offer` y `db.sessions` con seis métodos
(`insert, get, find, find_one, update, delete`). Reimplementar `Collection` en `app/core/database.py`
con la base elegida y nada más cambia.

## Pendiente
- Alinear nombres de campos y rutas con `docs/contrato-v1.md`.
- Las fotos se guardan en `uploads/`; en hostings con disco efímero se pierden al redesplegar.
