from fastapi.testclient import TestClient
from main import app

PW = "Demo1234"


def login(c, email, pw=PW):
    r = c.post("/user/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def users(c):
    return {k: login(c, f"{e}@changarrito.mx") for k, e in
            dict(loc="loc1", loc2="loc2", loc3="loc3", con="consumidor", seg="seguridad", pro="pro").items()}


def test_full_flow():
    with TestClient(app) as c:
        h = users(c)
        r = c.post("/offer/draft", headers=h["loc"], data={"texto": "Hoy vendo mango ataulfo a $35 el kilo de 9 a 5pm"})
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["estado"] == "borrador" and d["producto"] and d["precio_declarado"] == 35
        assert c.get("/offer/search", params={"q": "mango"}).json() == []
        assert c.post(f"/offer/publish/{d['id']}", headers=h["loc2"]).status_code == 404  # otro locatario
        p = c.post(f"/offer/publish/{d['id']}", headers=h["loc"], json={"vigencia_horas": 4})
        assert p.status_code == 200 and p.json()["estado"] == "publicada" and p.json()["confirmado_en"]
        s = c.get("/offer/search", params={"q": "limon", "lat": 19.43, "lng": -99.13}).json()
        assert s and s[0]["producto"] == "Limón" and "distancia_km" in s[0]
        assert c.post(f"/offer/sold_out/{d['id']}", headers=h["loc"]).status_code == 200
        assert c.get("/offer/search", params={"q": "mango"}).json() == []
        assert c.get(f"/offer/{d['id']}").json()["estado"] == "agotada"
        assert any(o["id"] == d["id"] for o in c.get("/offer/mine", headers=h["loc"]).json())


def test_expired_and_soldout_not_in_search():
    with TestClient(app) as c:
        names = [o["producto"] for o in c.get("/offer/search", params={"limit": 100}).json()]
        assert "Pan de caja" not in names and "Masa para tamales" not in names
        assert len(names) == 12


def test_missing_fields_block_publish():
    with TestClient(app) as c:
        h = users(c)
        d = c.post("/offer/draft", headers=h["loc"], data={"texto": "hay cositas ricas"}).json()
        assert "precio_declarado" in d["campos_faltantes"]
        r = c.post(f"/offer/publish/{d['id']}", headers=h["loc"])
        assert r.status_code == 422 and "precio_declarado" in r.json()["campos_faltantes"]
        u = c.put(f"/offer/update/{d['id']}", headers=h["loc"], json={"precio_declarado": 10})
        assert u.json()["campos_faltantes"] == []


def test_auth_and_roles():
    with TestClient(app) as c:
        h = users(c)
        assert c.post("/offer/draft", data={"texto": "x"}).status_code == 401
        assert c.get("/user/profile", headers={"Authorization": "Bearer mal"}).status_code == 401
        assert c.post("/user/login", json={"email": "loc1@changarrito.mx", "password": "incorrecta1"}).status_code == 401
        assert c.post("/user/login", json={"email": "nadie@changarrito.mx", "password": PW}).status_code == 401
        assert c.post("/offer/draft", headers=h["con"], data={"texto": "x $5"}).status_code == 403
        assert c.post("/offer/draft", headers=h["seg"], data={"texto": "x $5"}).status_code == 403
        assert c.get("/moderation/", headers=h["loc"]).status_code == 403
        assert c.get("/moderation/", headers=h["con"]).status_code == 403
        assert c.get("/admin/users", headers=h["seg"]).status_code == 403
        assert c.get("/moderation/", headers=h["seg"]).status_code == 200
        assert c.get("/moderation/", headers=h["pro"]).status_code == 200
        assert c.get("/admin/users", headers=h["pro"]).status_code == 200
        prof = c.get("/user/profile", headers=h["con"]).json()
        assert prof["rol"] == "consumidor" and "password" not in prof


def test_public_register_cannot_escalate():
    with TestClient(app) as c:
        base = {"email": "ana@correo.mx", "password": "Secreta123", "nombre": "Ana"}
        assert c.post("/user/register", json={**base, "rol": "pro"}).status_code == 422
        assert c.post("/user/register", json={**base, "rol": "seguridad"}).status_code == 422
        assert c.post("/user/register", json={**base, "rol": "locatario"}).status_code == 422  # sin negocio
        r = c.post("/user/register", json=base)
        assert r.status_code == 201 and r.json()["rol"] == "consumidor" and "password" not in r.json()
        assert c.post("/user/register", json=base).status_code == 409  # correo repetido
        h = login(c, "ana@correo.mx", "Secreta123")
        assert c.get("/user/profile", headers=h).status_code == 200
        loc = {**base, "email": "tienda@correo.mx", "rol": "locatario", "nombre_negocio": "Mi Tiendita",
               "ubicacion": {"lat": 19.4, "lng": -99.1}}
        assert c.post("/user/register", json=loc).status_code == 422  # lo registra el gerente, no la página pública


def test_sessions_logout_and_limit():
    with TestClient(app) as c:
        h = login(c, "loc1@changarrito.mx")
        assert c.get("/session/active", headers=h).json()["total"] == 1
        assert c.post("/user/logout", headers=h).status_code == 200
        assert c.get("/user/profile", headers=h).status_code == 401  # token muerto
        a, b = login(c, "loc1@changarrito.mx"), login(c, "loc1@changarrito.mx")
        assert c.post("/user/logout_all", headers=b).status_code == 200
        assert c.get("/user/profile", headers=a).status_code == 401
        # límite por usuario (5 en tests): la 6ª sesión cierra la más vieja
        tokens = [login(c, "loc2@changarrito.mx") for _ in range(6)]
        assert c.get("/user/profile", headers=tokens[0]).status_code == 401
        assert c.get("/user/profile", headers=tokens[-1]).status_code == 200


def test_report_and_moderation_flow():
    with TestClient(app) as c:
        h = users(c)
        oid = c.get("/offer/search", params={"q": "huevo"}).json()[0]["id"]
        assert c.post(f"/offer/report/{oid}", headers=h["con"], json={"motivo": "precio falso"}).status_code == 201
        assert c.post(f"/offer/report/{oid}", headers=h["con"], json={"motivo": "otra vez"}).status_code == 409
        assert c.post(f"/offer/report/{oid}", headers=h["loc"], json={"motivo": "no puedo"}).status_code == 403
        q = c.get("/moderation/", headers=h["seg"], params={"solo_reportadas": True}).json()
        assert [o["id"] for o in q] == [oid] and q[0]["reportes"][0]["motivo"] == "precio falso"
        s = c.post(f"/moderation/suspend/{oid}", headers=h["seg"], json={"motivo": "fraude"})
        assert s.status_code == 200 and s.json()["estado"] == "suspendida"
        assert c.get(f"/offer/{oid}").status_code == 404
        assert "Huevo" not in [o["producto"] for o in c.get("/offer/search", params={"limit": 100}).json()]
        h3 = login(c, "loc3@changarrito.mx")
        own = c.post(f"/offer/sold_out/{oid}", headers=h3)
        assert own.status_code == 409 and own.json()["motivo_suspension"] == "fraude"
        mine = c.get("/offer/mine", headers=h3).json()
        assert any(o["estado"] == "suspendida" and o["motivo_suspension"] == "fraude" for o in mine)
        assert c.post(f"/moderation/reinstate/{oid}", headers=h["seg"]).json()["estado"] == "publicada"
        assert c.get(f"/offer/{oid}").status_code == 200


def test_admin_user_management():
    with TestClient(app) as c:
        h = users(c)
        r = c.post("/admin/users", headers=h["pro"],
                   json={"email": "guardia2@changarrito.mx", "password": "Guardia123", "nombre": "Guardia 2", "rol": "seguridad"})
        assert r.status_code == 201
        uid = r.json()["id"]
        hs = login(c, "guardia2@changarrito.mx", "Guardia123")
        assert c.get("/moderation/", headers=hs).status_code == 200
        c.patch(f"/admin/users/{uid}", headers=h["pro"], json={"activo": False})
        assert c.get("/moderation/", headers=hs).status_code == 401  # sesiones cerradas
        assert c.post("/user/login", json={"email": "guardia2@changarrito.mx", "password": "Guardia123"}).status_code == 403
        c.patch(f"/admin/users/{uid}", headers=h["pro"], json={"activo": True})
        assert c.post(f"/admin/users/{uid}/reset_password", headers=h["pro"], json={"new_password": "NuevaClave1"}).status_code == 200
        assert c.post("/user/login", json={"email": "guardia2@changarrito.mx", "password": "Guardia123"}).status_code == 401
        assert login(c, "guardia2@changarrito.mx", "NuevaClave1")
        me = c.get("/user/profile", headers=h["pro"]).json()["id"]
        assert c.patch(f"/admin/users/{me}", headers=h["pro"], json={"activo": False}).status_code == 409


def test_change_own_password():
    with TestClient(app) as c:
        h = login(c, "consumidor@changarrito.mx")
        assert c.put("/user/update", headers=h, json={"password": "OtraClave12"}).status_code == 422  # falta la actual
        assert c.put("/user/update", headers=h, json={"password": "OtraClave12", "current_password": "mala"}).status_code == 422
        assert c.put("/user/update", headers=h, json={"password": "OtraClave12", "current_password": PW}).status_code == 200
        assert c.get("/user/profile", headers=h).status_code == 401
        assert login(c, "consumidor@changarrito.mx", "OtraClave12")
