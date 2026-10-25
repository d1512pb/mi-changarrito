/* Transición posterior al inicio de sesión: lluvia de frutas y verduras de caricatura
 * que cubre la carga del panel. Solo se invoca tras un inicio de sesión exitoso.
 */
function fruitTransition(name, onCovered, minMs = 2600) {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ov = document.createElement("div");
  ov.className = "fx";
  ov.setAttribute("role", "status");
  ov.setAttribute("aria-live", "polite");
  const count = reduce ? 0 : Math.min(46, Math.round(window.innerWidth / 18));
  let html = "";
  for (let i = 0; i < count; i++) {
    const kind = FRUIT_KEYS[i % FRUIT_KEYS.length];
    const size = 44 + Math.random() * 46;
    const left = Math.random() * 100;
    const dur = 1.5 + Math.random() * 1.3;
    const delay = Math.random() * 1.1;
    const rot = (Math.random() < .5 ? -1 : 1) * (180 + Math.random() * 360);
    const sway = (Math.random() * 60 - 30).toFixed(0);
    html += `<span class="fx__f" style="left:${left}%;width:${size}px;height:${size}px;--d:${dur}s;--delay:${delay}s;--rot:${rot}deg;--sway:${sway}px">${fruit(kind)}</span>`;
  }
  ov.innerHTML = `${html}<div class="fx__card"><div class="fx__crate">${fruit("tomato")}${fruit("carrot")}${fruit("lemon")}</div><p class="fx__hi">¡Hola, ${esc(name.split(" ")[0])}!</p><p class="fx__sub">Preparando tu panel…</p></div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("is-on"));
  const t0 = performance.now();
  // El panel se renderiza detrás del telón mientras caen las frutas.
  setTimeout(() => {
    Promise.resolve().then(onCovered).finally(() => {
      const wait = Math.max(0, (reduce ? 900 : minMs) - (performance.now() - t0));
      setTimeout(() => { ov.classList.add("is-off"); setTimeout(() => ov.remove(), 450); }, wait);
    });
  }, 250);
}
