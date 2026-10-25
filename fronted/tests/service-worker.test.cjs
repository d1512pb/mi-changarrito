const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

function worker() {
  const handlers = {}, removed = [];
  const context = vm.createContext({ URL, Response, Set,
    self: { registration: { scope: "https://example.test/" }, location: { origin: "https://example.test" }, addEventListener: (event, handler) => { handlers[event] = handler; }, clients: { claim: async () => {} } },
    caches: { keys: async () => ["huacal-v1", "huacal-v1-ext", "changarrito-shell-old", /const VERSION = "([^"]+)"/.exec(source)[1], "unrelated"], delete: async name => { removed.push(name); } },
    fetch: () => Promise.resolve(new Response("ok"))
  });
  vm.runInContext(source + ";this.shell = SHELL", context);
  return { handlers, removed, shell: context.shell };
}

test("API, uploads, rutas privadas y requests autorizados nunca se interceptan", () => {
  const { handlers } = worker();
  for (const path of ["/api/offer/search", "/api/user/profile", "/user/profile", "/offer/mine", "/session/active", "/moderation/", "/admin/users", "/ai/chat", "/uploads/private-photo.jpg", "/not-a-shell-file"]) {
    let intercepted = false;
    handlers.fetch({ request: { method: "GET", url: `https://example.test${path}`, headers: new Headers(), mode: "cors" }, respondWith() { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
  let intercepted = false;
  handlers.fetch({ request: { method: "GET", url: "https://example.test/index.html", headers: new Headers({ Authorization: "Bearer x" }), mode: "cors" }, respondWith() { intercepted = true; } });
  assert.equal(intercepted, false);
});

test("cada asset del shell existe y no incluye catálogo o endpoints", () => {
  const { shell } = worker();
  for (const asset of shell) assert.ok(fs.existsSync(path.join(__dirname, "..", asset)), asset);
  assert.ok(shell.includes("js/api-client.js"));
  assert.ok(shell.includes("js/live.js"));
});

test("actualización elimina las cachés heredadas que podían guardar datos", async () => {
  const { handlers, removed } = worker();
  let promise;
  handlers.activate({ waitUntil(value) { promise = value; } });
  await promise;
  assert.deepEqual(removed.sort(), ["changarrito-shell-old", "huacal-v1", "huacal-v1-ext"]);
});

test("semilla heredada no contiene cuentas ni catálogo sintético", () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/data.js"), "utf8") + ";this.seed = buildSeed()", context);
  assert.equal(context.seed.users.length, 0);
  assert.equal(context.seed.businesses.length, 0);
});
