/* Service worker de Huacal: app shell offline + caché de fuentes. */
const VERSION = "huacal-v1";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css",
  "js/config.js", "js/icons.js", "js/data.js", "js/store.js", "js/fx.js", "js/ocr.js", "js/app.js", "js/panels.js", "js/main.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("huacal-") && k !== VERSION && k !== VERSION + "-ext").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Navegación: red primero, la app shell si no hay conexión.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { caches.open(VERSION).then(c => c.put("index.html", r.clone())); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  // Archivos propios: caché primero, actualizando en segundo plano.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // Google Fonts y Tesseract (CDN): stale-while-revalidate.
  if (/fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$|tessdata/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + "-ext").then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* Avisos de mensajes nuevos: al tocar la notificación se abre la app. */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => list[0] ? list[0].focus() : self.clients.openWindow("./")));
});
