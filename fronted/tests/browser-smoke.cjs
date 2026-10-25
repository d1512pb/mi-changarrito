/* Browser smoke test with an isolated API fixture: no network or production data. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const base = path.resolve(__dirname, "..");

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1366, height: 900 } });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let authenticated = false, offers = [];
  const user = { id: "test-merchant", nombre: "Persona de prueba", email: "qa@example.test", rol: "locatario", nombre_negocio: "Negocio de prueba", ubicacion: { lat: 19.4, lng: -99.1, direccion: "Dirección de prueba" } };
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== "http://changarrito.test") return route.abort();
    if (url.pathname.startsWith("/api/")) {
      const endpoint = url.pathname.slice(4), body = request.postDataJSON && request.headers()["content-type"]?.includes("application/json") ? request.postDataJSON() : null;
      let data, status = 200;
      if (endpoint === "/offer/search") data = offers.filter(offer => offer.estado === "publicada");
      else if (endpoint === "/user/login") { authenticated = body.password === "test-password"; data = authenticated ? { token: "test-session" } : { detail: "Credenciales incorrectas" }; status = authenticated ? 200 : 401; }
      else if (endpoint === "/user/profile") { data = user; status = authenticated ? 200 : 401; }
      else if (endpoint === "/user/logout") { authenticated = false; data = { message: "ok" }; }
      else if (!authenticated) { data = { detail: "No autorizado" }; status = 401; }
      else if (endpoint === "/offer/mine") data = offers;
      else if (endpoint === "/offer/draft") {
        data = { id: "test-offer", id_merchant: user.id, negocio: user.nombre_negocio, producto: "Jitomate de prueba", precio_declarado: 28, unidad: "kg", estado: "borrador", ubicacion: user.ubicacion, campos_faltantes: [], campos_ambiguos: [], creado_en: new Date().toISOString() };
        offers = [data]; status = 201;
      } else if (endpoint.startsWith("/offer/update/")) { offers[0] = { ...offers[0], ...body, estado: "borrador" }; data = offers[0]; }
      else if (endpoint.startsWith("/offer/publish/")) { offers[0] = { ...offers[0], estado: "publicada", confirmado_en: new Date().toISOString(), vigente_hasta: new Date(Date.now() + body.vigencia_horas * 3600000).toISOString() }; data = offers[0]; }
      else if (endpoint.startsWith("/offer/sold_out/")) { offers[0].estado = "agotada"; data = offers[0]; }
      else if (endpoint === "/offer/test-offer") data = offers[0];
      else { data = { detail: "Unknown fixture endpoint " + endpoint }; status = 404; }
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    }
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).slice(1);
    const file = path.resolve(base, rel);
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: "not found" });
    const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
    return route.fulfill({ contentType: types[path.extname(file)] || "text/plain", body: fs.readFileSync(file) });
  });
  try {
    await page.goto("http://changarrito.test");
    await page.getByRole("heading", { name: "Aún no hay ofertas disponibles" }).waitFor();
    assert.equal(await page.getByText("Cuenta de prueba", { exact: false }).count(), 0);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await page.getByLabel("Correo electrónico").fill(user.email);
    await page.getByLabel(/^Contraseña/).fill("wrong-password");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Credenciales incorrectas" }).waitFor();
    await page.getByLabel(/^Contraseña/).fill("test-password");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.getByRole("heading", { name: user.nombre_negocio, exact: true }).waitFor();
    await page.getByRole("button", { name: "Crear oferta con texto o foto" }).click();
    await page.getByLabel("Texto de tu oferta").fill("Jitomate de prueba a $28 por kg");
    await page.getByRole("button", { name: "Crear borrador y revisar" }).click();
    await page.getByRole("dialog", { name: "Revisa y confirma tu oferta" }).waitFor();
    assert.equal(offers[0].estado, "borrador");
    await page.getByLabel(/^Producto/).fill("Jitomate revisado");
    await page.getByLabel("Revisé los campos y confirmo que esta oferta es correcta.").check();
    await page.getByRole("button", { name: "Confirmar y publicar", exact: true }).click();
    await page.getByText("Oferta confirmada y publicada.", { exact: true }).waitFor();
    assert.equal(offers[0].estado, "publicada");
    assert.equal(offers[0].producto, "Jitomate revisado");
    await page.getByRole("button", { name: "Mi Changarrito, inicio" }).click();
    await page.getByRole("heading", { name: "Jitomate revisado" }).waitFor();
    await page.getByText("Oferta confirmada y publicada.", { exact: true }).waitFor({ state: "hidden" });
    const desktop = path.join(os.tmpdir(), "changarrito-frontend-desktop.png");
    await page.screenshot({ path: desktop, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = path.join(os.tmpdir(), "changarrito-frontend-mobile.png");
    await page.screenshot({ path: mobile, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "mobile horizontal overflow");
    await page.getByRole("button", { name: "Mi panel", exact: true }).click();
    await page.getByRole("button", { name: "Marcar agotada", exact: true }).click();
    await page.locator(".live-offer").getByText(/^Agotada/).waitFor();
    assert.equal(offers[0].estado, "agotada");
    await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await page.getByRole("heading", { name: "Aún no hay ofertas disponibles" }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem("changarrito:api-session")), null);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ result: "passed", checks: ["empty real catalogue", "invalid login", "authenticated seller", "draft requires review", "publish", "sold out disappears", "logout", "mobile layout", "no browser errors"], desktop, mobile }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
