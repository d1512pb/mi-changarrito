/* Sólo shell estático. Ninguna respuesta de API, sesión, foto o dato privado se cachea. */
const VERSION = "changarrito-shell-v3-tianguis";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css",
  "js/config.js", "js/icons.js", "js/data.js", "js/store.js", "js/fx.js", "js/ocr.js",
  "js/app.js", "js/panels.js", "js/api-client.js", "js/live.js", "js/management.js", "js/main.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/icon-maskable-512.png"
];
const STATIC_URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith("huacal-") || key.startsWith("changarrito-shell-")) && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("Authorization")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || /^\/(api|user|offer|session|moderation|admin|management|tianguis|ai|uploads)(\/|$)/.test(url.pathname)) return;
  if (request.mode === "navigate" && url.pathname === new URL(self.registration.scope).pathname) {
    event.respondWith(fetch(request).catch(() => caches.match(new URL("index.html", self.registration.scope).href)));
    return;
  }
  if (!STATIC_URLS.has(url.href)) return;
  event.respondWith(caches.match(request).then(hit => {
    const fresh = fetch(request).then(async response => {
      if (response.ok) {
        const copy = response.clone();
        const cache = await caches.open(VERSION);
        await cache.put(request, copy);
      }
      return response;
    }).catch(() => hit || Response.error());
    event.waitUntil(fresh.then(() => {}));
    return hit || fresh;
  }));
});
