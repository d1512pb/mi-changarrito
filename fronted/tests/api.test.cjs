const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../js/api-client.js"), "utf8");

function client(responses = [], saved = "") {
  const calls = [], values = new Map(saved ? [["changarrito:api-session", saved]] : []);
  const context = vm.createContext({
    FormData, AbortController, setTimeout, clearTimeout,
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      const next = responses.shift();
      if (!next) throw new Error("No mock response");
      return { ok: next.status < 400, status: next.status, json: async () => next.body };
    }
  });
  vm.runInContext(source + ";this.api = LiveAPI", context);
  return { api: context.api, calls, values };
}
const seller = { id: "u1", rol: "locatario", nombre: "Vendedora", nombre_negocio: "Negocio", email: "seller@example.test" };

test("catálogo público consulta el servidor sin token ni caché local", async () => {
  const { api, calls } = client([{ status: 200, body: [] }], "saved-session");
  assert.equal((await api.search("jitomate & limón")).length, 0);
  assert.equal(calls[0].url, "/api/offer/search?limit=100&q=jitomate%20%26%20lim%C3%B3n");
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[0].cache, "no-store");
});

test("login verifica perfil y usa Bearer sólo en header", async () => {
  const { api, calls, values } = client([{ status: 200, body: { token: "session-token" } }, { status: 200, body: seller }]);
  await api.login("seller@example.test", "password-value");
  assert.equal(calls[0].url, "/api/user/login");
  assert.equal(calls[0].headers.Authorization, undefined);
  assert.equal(calls[1].headers.Authorization, "Bearer session-token");
  assert.equal(api.currentUser().role, "vendedor");
  assert.equal(api.currentUser().name, "Vendedora");
  assert.equal(values.get("changarrito:api-session"), "session-token");
  assert.ok(calls.every(call => !call.url.includes("session-token")));
});

test("un 401 de sesión elimina perfil y token del dispositivo", async () => {
  const { api, values } = client([{ status: 200, body: { token: "secret" } }, { status: 200, body: seller }, { status: 401, body: { detail: "Sesión vencida" } }]);
  await api.login("seller@example.test", "password-value");
  await assert.rejects(api.ownOffers(), /Sesión vencida/);
  assert.equal(api.currentUser(), null);
  assert.equal(values.size, 0);
});

test("registro no permite elevar permisos ni enviar campos arbitrarios", async () => {
  const { api, calls } = client([{ status: 201, body: seller }]);
  await assert.rejects(api.register("gobierno", {}), /sólo admite/);
  assert.equal(calls.length, 0);
  await api.register("vendedor", { email: "seller@example.test", password: "password-value", nombre: "Vendedora", nombre_negocio: "Negocio", ubicacion: { lat: 19, lng: -99 }, rol: "pro", activo: true });
  const body = JSON.parse(calls[0].body);
  assert.equal(body.rol, "locatario");
  assert.equal(body.activo, undefined);
  assert.equal(calls[0].headers.Authorization, undefined);
});

test("borrador multipart y publicación son solicitudes distintas con id codificado", async () => {
  const { api, calls } = client([{ status: 200, body: seller }, { status: 201, body: { id: "offer/1" } }, { status: 200, body: { estado: "borrador" } }, { status: 200, body: { estado: "publicada" } }], "token");
  await api.restore();
  const form = new FormData(); form.append("texto", "Jitomate a $28 el kg");
  await api.draft(form);
  assert.equal(calls[1].headers["Content-Type"], undefined);
  assert.equal(calls[1].body, form);
  await api.updateOffer("offer/1", { producto: "Jitomate", precio_declarado: 28 });
  await api.publish("offer/1", 12);
  assert.equal(calls[2].url, "/api/offer/update/offer%2F1");
  assert.equal(calls[3].url, "/api/offer/publish/offer%2F1");
  assert.equal(JSON.parse(calls[3].body).vigencia_horas, 12);
});

test("errores internos no muestran detalles privados y logout limpia aunque falle", async () => {
  const { api, values } = client([{ status: 500, body: { detail: "private-database-credential" } }], "token");
  await assert.rejects(api.logout(), /servicio no está disponible/);
  assert.equal(values.size, 0);
  assert.equal(api.profile, null);
});

test("registro devuelve errores de validación legibles", async () => {
  const { api } = client([{ status: 422, body: { detail: [{ loc: ["body", "password"], msg: "mínimo 8 caracteres" }] } }]);
  await assert.rejects(api.register("cliente", { email: "a@example.test", password: "x", nombre: "Ana" }), /password: mínimo 8 caracteres/);
});

test("respuesta no JSON no se trata como éxito ni como datos demo", async () => {
  const { api } = client([{ status: 200, body: null }]);
  await assert.rejects(api.search(), /respuesta no válida/);
});
