/* Arranque de la app y registro del service worker (modo offline + instalable). */
boot();

if ("serviceWorker" in navigator && CFG.REGISTER_SW !== false && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw && nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller)
            toast("Hay una versión nueva de Mi Changarrito", { icon: "sparkle", action: "Actualizar", onAction: () => location.reload(), ms: 10000 });
        });
      });
    }).catch(() => { });
  });
}

/* Botón de instalación cuando el navegador lo permite. */
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredInstall = e;
  setTimeout(() => toast("Instala Mi Changarrito en tu pantalla de inicio", { icon: "plus", action: "Instalar", ms: 9000, onAction: () => { if (deferredInstall) deferredInstall.prompt(); deferredInstall = null; } }), 4000);
});
