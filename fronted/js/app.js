/* Huacal — núcleo de la interfaz: enrutador, componentes, búsqueda, catálogo, chat y autenticación. */
const CFG = window.HUACAL_CONFIG;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const money = n => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const unitText = u => (UNITS.find(x => x[0] === u) || [u, u])[1];
const fmtDate = ts => new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fmtDay = ts => new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
const fmtTime = ts => new Date(ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtLong = d => cap(d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const goAttr = (view, p = {}) => `data-go="${view}" data-p="${esc(JSON.stringify(p))}"`;

const ROLE = {
  cliente: { label: "Cliente", icon: "userBag", tone: "turquesa", desc: "Busca, guarda favoritos y escribe a los negocios" },
  vendedor: { label: "Vendedor", icon: "stall", tone: "tierra", desc: "Registra tu puesto, horarios y productos" },
  comercios: { label: "Administrador de Comercios", icon: "board", tone: "mostaza", desc: "Valida puestos y supervisa tu tianguis" },
  gobierno: { label: "Administrador de Gobierno", icon: "building", tone: "petroleo", desc: "Consulta y analiza datos de toda la ciudad" }
};
const PANEL = { cliente: "panelCliente", vendedor: "panelVendedor", comercios: "panelComercios", gobierno: "panelGobierno" };

/* ================= Enrutador ================= */
const app = document.getElementById("app");
const VIEWS = {};
let stack = [{ name: "home", params: {} }];
/* El botón "atrás" del teléfono se sincroniza con la pila interna mediante el History API.
 * Si el entorno no permite pushState (p. ej. una vista incrustada), la navegación es solo interna. */
const HIST = CFG.USE_HISTORY !== false;
let backing = false, backTimer = null;
function push() { if (!HIST) return; try { history.pushState({ d: stack.length }, ""); } catch (e) { } }

function go(name, params = {}, opts = {}) {
  const top = stack[stack.length - 1];
  if (top) top.scroll = window.scrollY;
  if (opts.replace) stack[stack.length - 1] = { name, params };
  else { stack.push({ name, params }); push(); }
  render(opts.keepScroll);
}
function goHome() { stack = [{ name: "home", params: {} }]; render(); }
function popView() { if (stack.length > 1) { stack.pop(); render(true); } }
function back() {
  if (stack.length <= 1) return;
  if (!HIST) return popView();
  backing = true;
  history.back();
  clearTimeout(backTimer);
  backTimer = setTimeout(() => { if (backing) { backing = false; popView(); } }, 400);
}
window.addEventListener("popstate", () => {
  if (!backing && closeSheet()) { push(); return; }
  backing = false; clearTimeout(backTimer);
  popView();
});

function render(restoreScroll) {
  const v = stack[stack.length - 1];
  const def = VIEWS[v.name] || VIEWS.home;
  const out = def(v.params || {});
  app.innerHTML = topbar() + `<main id="main" class="main ${out.cls || ""}" tabindex="-1">${out.html}</main>`;
  document.title = out.title ? `${out.title} · Mi Changarrito` : "Mi Changarrito";
  window.scrollTo(0, restoreScroll && v.scroll ? v.scroll : 0);
  if (out.mount) out.mount($("#main"));
}
function refresh() { const v = stack[stack.length - 1]; v.scroll = window.scrollY; render(true); }

/* ================= Barra superior ================= */
function topbar() {
  const u = Store.currentUser();
  const n = Store.cart().reduce((s, i) => s + i.qty, 0);
  return `<header class="topbar"><div class="topbar__bar"><div class="topbar__in">
    ${stack.length > 1 ? `<button class="iconbtn" data-act="back" aria-label="Regresar">${icon("back")}</button>` : ""}
    <button class="logo" data-act="home" aria-label="Huacal, ir al inicio">${LOGO_MARK}<span>Huacal</span></button>
    <span class="topbar__sp"></span>
    <button class="iconbtn" data-act="cart" aria-label="Carrito de verduras, ${n} productos">${icon("cart")}${n ? `<span class="count">${n}</span>` : ""}</button>
    <div class="menuwrap">
      ${u ? `<button class="userbtn tone-${ROLE[u.role].tone}" data-act="usermenu" aria-haspopup="true" aria-expanded="false"><span>${esc(initials(u.name))}</span></button>`
        : `<button class="loginbtn" data-act="roles" aria-haspopup="true" aria-expanded="false">${icon("user")}<span>Iniciar sesión</span></button>`}
    </div>
  </div></div><div class="toldo" aria-hidden="true"></div></header>`;
}

function rolesMenu() {
  return `<div class="menu" role="menu" aria-label="Elige tu perfil">
    <p class="menu__title">¿Cómo quieres entrar?</p>
    ${Object.entries(ROLE).map(([k, r]) => `<button class="menu__item" role="menuitem" ${goAttr("login", { role: k })}>
      <span class="roleic tone-${r.tone}">${icon(r.icon)}</span><span><b>${r.label}</b><small>${r.desc}</small></span>${icon("chev", "menu__chev")}</button>`).join("")}
  </div>`;
}
function userMenu(u) {
  return `<div class="menu" role="menu">
    <div class="menu__who"><b>${esc(u.name)}</b><small>${ROLE[u.role].label}</small></div>
    <button class="menu__item" role="menuitem" ${goAttr(PANEL[u.role])}><span class="roleic tone-${ROLE[u.role].tone}">${icon(ROLE[u.role].icon)}</span><span><b>Mi panel</b></span></button>
    <button class="menu__item" role="menuitem" data-act="logout"><span class="roleic">${icon("logout")}</span><span><b>Cerrar sesión</b></span></button>
  </div>`;
}
function closeMenus() { $$(".menu").forEach(m => m.remove()); $$("[aria-expanded=true]").forEach(b => b.setAttribute("aria-expanded", "false")); }

const ACTS = {
  back: () => back(),
  home: () => goHome(),
  cart: () => openCart(),
  roles: btn => toggleMenu(btn, rolesMenu()),
  usermenu: btn => toggleMenu(btn, userMenu(Store.currentUser())),
  logout: () => { Store.logout(); closeMenus(); goHome(); toast("Cerraste sesión"); }
};
function toggleMenu(btn, html) {
  const open = btn.getAttribute("aria-expanded") === "true";
  closeMenus();
  if (open) return;
  btn.insertAdjacentHTML("afterend", html);
  btn.setAttribute("aria-expanded", "true");
  const first = btn.parentElement.querySelector(".menu__item"); first && first.focus();
}

document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g && !g.disabled) {
    e.preventDefault(); closeMenus(); if (g.closest(".sheet")) closeSheet(true);
    go(g.dataset.go, g.dataset.p ? JSON.parse(g.dataset.p) : {});
    return;
  }
  const a = e.target.closest("[data-act]");
  if (a && ACTS[a.dataset.act]) { ACTS[a.dataset.act](a, e); return; }
  if (!e.target.closest(".menu")) closeMenus();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeMenus(); closeSheet(); } });

/* ================= Hojas inferiores y avisos ================= */
let sheetCleanup = null;
function openSheet({ title, html, mount, onClose, wide }) {
  closeSheet(true);
  const root = document.createElement("div");
  root.className = "sheet";
  root.innerHTML = `<div class="sheet__bg" data-close></div>
    <section class="sheet__panel ${wide ? "sheet__panel--wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet__head"><h2>${title}</h2><button class="iconbtn iconbtn--plain" data-close aria-label="Cerrar">${icon("x")}</button></header>
      <div class="sheet__body">${html}</div>
    </section>`;
  document.body.appendChild(root);
  document.body.classList.add("noscroll");
  root.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeSheet(); });
  sheetCleanup = onClose || null;
  requestAnimationFrame(() => root.classList.add("is-open"));
  if (mount) mount($(".sheet__body", root));
  const f = $("input, select, textarea, button:not([data-close])", $(".sheet__body", root)); f && f.focus({ preventScroll: true });
  return root;
}
function closeSheet(instant) {
  const s = $(".sheet");
  if (!s) return false;
  if (sheetCleanup) { const fn = sheetCleanup; sheetCleanup = null; fn(); }
  document.body.classList.remove("noscroll");
  if (instant) s.remove(); else { s.classList.remove("is-open"); setTimeout(() => s.remove(), 220); }
  return true;
}
function toast(msg, opts = {}) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.innerHTML = `<div class="toast tone-${opts.tone || "petroleo"}">${opts.icon ? icon(opts.icon) : ""}<span>${msg}</span>${opts.action ? `<button class="toast__btn">${opts.action}</button>` : ""}</div>`;
  if (opts.action) $(".toast__btn", t).onclick = () => { t.innerHTML = ""; opts.onAction(); };
  clearTimeout(t._h); t._h = setTimeout(() => { t.innerHTML = ""; }, opts.ms || 3200);
}

/* ================= Componentes ================= */
function statusPill(st) { return `<span class="pill pill--${st.code}"><i aria-hidden="true"></i>${st.label}</span>`; }
function catTag(c) { return `<span class="tag tone-${CAT_TONE[c] || "petroleo"} ${SPECIAL_CATS.includes(c) ? "tag--special" : ""}">${cap(c)}</span>`; }
function cardBadge(b, long) { return b.card ? `<span class="cardok" title="Acepta pago con tarjeta">${icon("card")}${long ? "<span>Acepta tarjeta</span>" : "<span>Tarjeta</span>"}</span>` : ""; }
function stars(n, label = true) {
  const r = Math.round(n * 2) / 2;
  return `<span class="stars" ${label ? `aria-label="${n.toFixed(1)} de 5 estrellas"` : 'aria-hidden="true"'}>${[1, 2, 3, 4, 5].map(i => `<span class="${i <= r ? "on" : i - .5 === r ? "half" : ""}">${icon("star")}</span>`).join("")}</span>`;
}
const FRUIT_BY_KEY = { jitomate: "tomato", tomate: "tomato", zanahoria: "carrot", limon: "lemon", "chile serrano": "chile", "chile poblano": "chile", chile: "chile", aguacate: "avocado", platano: "banana", sandia: "watermelon", cempasuchil: "marigold", cebolla: "onion", bolillo: "bread", concha: "bread", "pan de muerto": "bread", cuernito: "bread", terciopelo: "marigold" };
function bizArt(b, cls = "") {
  if (b.photos && b.photos[0]) return `<div class="art ${cls}"><img src="${b.photos[0]}" alt=""></div>`;
  const f = CAT_ART[b.category];
  return `<div class="art tone-${CAT_TONE[b.category]} ${cls}">${f ? fruit(f) : icon(CAT_ICON[b.category] || "stall")}</div>`;
}
function productArt(p, b, cls = "") {
  if (p.photo) return `<div class="art ${cls}"><img src="${p.photo}" alt=""></div>`;
  const f = FRUIT_BY_KEY[p.key] || FRUIT_BY_KEY[Store.norm(p.name).split(" ")[0]];
  return `<div class="art tone-${CAT_TONE[b.category]} ${cls}">${f ? fruit(f) : icon(CAT_ICON[b.category] || "huacal")}</div>`;
}
function priceTag(p, small) { return `<span class="price ${small ? "price--sm" : ""}">${money(p.price)}<small>/${esc(unitText(p.unit))}</small></span>`; }
function where(b) { const t = b.tianguisId && Store.tianguis(b.tianguisId); return t ? `${t.name} · ${b.alcaldia}` : `${b.colonia}, ${b.alcaldia}`; }

function bizCard(b, extra = "") {
  const st = Store.status(b);
  return `<article class="bcard">
    <button class="bcard__hit" ${goAttr("business", { id: b.id })} aria-label="Ver ${esc(b.name)}"></button>
    ${bizArt(b, "bcard__art")}
    <div class="bcard__body">
      <div class="bcard__top">${catTag(b.category)}${cardBadge(b)}</div>
      <h3 class="bcard__name">${esc(b.name)}</h3>
      <p class="bcard__where">${icon("pin")}${esc(where(b))}</p>
      <p class="bcard__hours">${icon("clock")}${esc(Store.scheduleText(b))}</p>
      <div class="bcard__status">${statusPill(st)}<span class="muted">${esc(st.detail)}</span></div>
      ${extra}
    </div>
  </article>`;
}
function emptyState(title, text, action = "") {
  return `<div class="empty">${fruit("onion", "empty__art")}<h3>${title}</h3><p>${text}</p>${action}</div>`;
}
function field(id, label, input, hint = "", req = false) {
  return `<div class="field"><label for="${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ""}</label>${input}${hint ? `<small class="hint" id="${id}-hint">${hint}</small>` : ""}<small class="ferr" id="${id}-err" hidden></small></div>`;
}
function options(list, value, placeholder) {
  return (placeholder ? `<option value="">${placeholder}</option>` : "") + list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === value ? "selected" : ""}>${esc(l)}</option>`; }).join("");
}
function setErr(form, id, msg) {
  const e = $(`#${id}-err`, form), inp = $(`#${id}`, form);
  if (e) { e.textContent = msg || ""; e.hidden = !msg; }
  if (inp) { inp.setAttribute("aria-invalid", msg ? "true" : "false"); if (msg) inp.setAttribute("aria-describedby", `${id}-err`); }
  return !msg;
}

/* ================= Google Maps (opcional con llave) ================= */
const Maps = {
  p: null,
  load() {
    if (!CFG.GOOGLE_MAPS_API_KEY) return Promise.resolve(false);
    if (window.google && google.maps) return Promise.resolve(true);
    this.p = this.p || new Promise(res => {
      window.__huacalMaps = () => res(true);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CFG.GOOGLE_MAPS_API_KEY)}&libraries=places&language=es&region=MX&callback=__huacalMaps`;
      s.async = true; s.onerror = () => res(false);
      document.head.appendChild(s);
    });
    return this.p;
  },
  link(lat, lng, q) { return lat != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`; },
  async render(el, lat, lng) {
    if (lat == null || !(await this.load())) return false;
    const map = new google.maps.Map(el, { center: { lat, lng }, zoom: 16, disableDefaultUI: true, zoomControl: true });
    new google.maps.Marker({ position: { lat, lng }, map });
    el.classList.add("is-live");
    return true;
  },
  async autocomplete(input, cb) {
    if (!(await this.load()) || !google.maps.places) return;
    const ac = new google.maps.places.Autocomplete(input, { componentRestrictions: { country: "mx" }, fields: ["formatted_address", "geometry"] });
    ac.addListener("place_changed", () => { const p = ac.getPlace(); if (p.geometry) cb({ address: p.formatted_address, lat: p.geometry.location.lat(), lng: p.geometry.location.lng() }); });
  },
  async reverse(lat, lng) {
    if (!(await this.load())) return null;
    try { const r = await new google.maps.Geocoder().geocode({ location: { lat, lng } }); return (r.results[0] && r.results[0].formatted_address) || null; } catch (e) { return null; }
  }
};
function mapCard(lat, lng, address) {
  return `<div class="mapcard">
    <div class="mapcard__map" data-lat="${lat ?? ""}" data-lng="${lng ?? ""}">
      <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="320" height="140" class="m-bg"/>
        <path class="m-block" d="M0 0h90v44H0zM112 0h96v44h-96zM230 0h90v44h-90zM0 66h90v74H0zM112 66h96v74h-96zM230 66h90v74h-90z"/>
        <path class="m-road" d="M0 55h320M101 0v140M219 0v140"/>
        <path class="m-route" d="M30 120 C 70 100, 80 70, 101 55 S 150 55, 160 48"/>
      </svg>
      <span class="mapcard__pin">${icon("pin")}</span>
    </div>
    <div class="mapcard__info"><p>${esc(address || "Sin dirección registrada")}</p>
      <a class="btn btn--teal btn--sm" href="${Maps.link(lat, lng, address)}" target="_blank" rel="noopener">${icon("map")}Abrir en Google Maps</a></div>
  </div>`;
}
function mountMaps(root) { $$(".mapcard__map", root).forEach(el => { if (el.dataset.lat) Maps.render(el, +el.dataset.lat, +el.dataset.lng); }); }

/* ================= Inicio ================= */
function searchTiles() {
  return `<div class="tiles">
    <button class="tile tone-turquesa" ${goAttr("loc")}><span class="tile__ic">${icon("map")}</span><span class="tile__t">¿Dónde te encuentras?</span><span class="tile__s">Elige alcaldía, colonia o tianguis</span></button>
    <button class="tile tone-mostaza" ${goAttr("productSearch")}><span class="tile__ic">${icon("huacal")}</span><span class="tile__t">¿Qué producto buscas?</span><span class="tile__s">Jitomate, pan de muerto, martillo…</span></button>
    <button class="tile tone-lila" ${goAttr("budget")}><span class="tile__ic">${icon("wallet")}</span><span class="tile__t">¿Cuál es tu presupuesto?</span><span class="tile__s">Productos que te alcanzan</span></button>
  </div>`;
}
VIEWS.home = () => {
  const vis = Store.visible();
  const open = vis.filter(b => Store.status(b).code === "open");
  const list = (open.length ? open : vis).slice(0, 6);
  return {
    html: `
    <section class="hero">
      <p class="eyebrow">Tianguis, mercados y locales de la Ciudad de México</p>
      <h1 class="display">Empieza a explorar los negocios de tu ciudad</h1>
      <p class="lede">Encuentra quién está abierto ahora, qué vende y a cuánto, antes de salir de casa.</p>
    </section>
    ${searchTiles()}
    <section class="sec">
      <div class="sec__head"><h2>${open.length ? "Abiertos ahora" : "Negocios cerca de ti"}</h2><span class="muted">${open.length} de ${vis.length} abiertos</span>
        <button class="link" ${goAttr("results", open.length ? { openOnly: true } : {})}>Ver todos</button></div>
      <div class="grid-cards">${list.map(b => bizCard(b)).join("")}</div>
    </section>
    <section class="sec">
      <div class="sec__head"><h2>Explora por categoría</h2></div>
      <div class="chips">${CATEGORIES.map(c => `<button class="chip ${SPECIAL_CATS.includes(c) ? "chip--special" : ""}" ${goAttr("results", { category: c })}>${cap(c)}</button>`).join("")}</div>
    </section>`
  };
};

/* ================= Búsqueda por ubicación ================= */
VIEWS.loc = ({ alc }) => {
  const steps = `<ol class="steps" aria-label="Pasos">
    <li class="${alc ? "done" : "on"}"><span>1</span>Alcaldía</li><li class="${alc ? "on" : ""}"><span>2</span>Colonia o tianguis</li><li><span>3</span>Negocios</li></ol>`;
  if (!alc) {
    const counts = {}; Store.visible().forEach(b => counts[b.alcaldia] = (counts[b.alcaldia] || 0) + 1);
    return {
      title: "¿Dónde te encuentras?",
      html: `<header class="phead"><span class="phead__ic tone-turquesa">${icon("map")}</span><div><h1>¿Dónde te encuentras?</h1><p class="muted">Elige tu alcaldía para ver colonias y tianguis.</p></div></header>${steps}
      <div class="alc-grid">${ALCALDIAS.map(a => `<button class="alc" ${goAttr("loc", { alc: a.name })}><b>${a.name}</b><small>${counts[a.name] ? `${counts[a.name]} negocio${counts[a.name] > 1 ? "s" : ""}` : "Sin negocios aún"}</small></button>`).join("")}</div>`
    };
  }
  const A = ALCALDIAS.find(a => a.name === alc);
  const tg = TIANGUIS.filter(t => t.alcaldia === alc);
  const n = c => Store.filterBiz({ alcaldia: alc, colonia: c }).length;
  return {
    title: alc,
    html: `<header class="phead"><span class="phead__ic tone-turquesa">${icon("pin")}</span><div><p class="eyebrow">${esc(alc)}</p><h1>Elige una colonia o un tianguis</h1></div></header>${steps}
    <section class="sec"><h2 class="h3">Tianguis</h2>
      ${tg.length ? `<div class="list">${tg.map(t => `<button class="row" ${goAttr("results", { tianguis: t.id })}><span class="row__ic tone-tierra">${icon("stall")}</span><span class="row__main"><b>${t.name}</b><small>${t.colonia} · ${t.days} · ${Store.filterBiz({ tianguis: t.id }).length} puestos</small></span>${icon("chev")}</button>`).join("")}</div>`
        : `<p class="muted">No hay tianguis registrados en esta alcaldía todavía.</p>`}
    </section>
    <section class="sec"><h2 class="h3">Colonias</h2>
      <div class="chips">${A.colonias.map(c => `<button class="chip" ${goAttr("results", { alcaldia: alc, colonia: c })}>${c}<span class="chip__n">${n(c)}</span></button>`).join("")}</div>
    </section>
    <button class="btn btn--teal" ${goAttr("results", { alcaldia: alc })}>${icon("search")}Ver todos los negocios de ${esc(alc)}</button>`
  };
};

/* ================= Búsqueda por producto ================= */
VIEWS.productSearch = ({ q = "" }) => ({
  title: "¿Qué producto buscas?",
  html: `<header class="phead"><span class="phead__ic tone-mostaza">${icon("huacal")}</span><div><h1>¿Qué producto buscas?</h1><p class="muted">Buscamos en nombres, categorías y descripciones de los negocios, también palabras parecidas.</p></div></header>
  <form class="searchbar" id="psForm" role="search">
    <label class="sr" for="ps-q">Producto</label>
    ${icon("search")}<input id="ps-q" type="search" placeholder="Ej. jitomate, pan de muerto, pollo" value="${esc(q)}" autocomplete="off" enterkeyhint="search">
    <button class="btn btn--primary" type="submit">Buscar</button>
  </form>
  <div id="ps-live" class="live" aria-live="polite"></div>
  <section class="sec"><h2 class="h3">Lo más buscado esta semana</h2>
    <div class="chips">${["jitomate", "aguacate", "pan de muerto", "cempasúchil", "pollo", "tortillas", "martillo", "papel de china"].map(s => `<button class="chip" ${goAttr("results", { q: s })}>${s}</button>`).join("")}</div>
  </section>`,
  mount(root) {
    const inp = $("#ps-q", root), live = $("#ps-live", root);
    inp.focus();
    const upd = () => {
      const r = inp.value.trim().length > 1 ? Store.searchProducts(inp.value) : [];
      live.innerHTML = inp.value.trim().length > 1 ? (r.length ? `<p><b>${r.length}</b> negocio${r.length > 1 ? "s" : ""} con coincidencias${r.some(x => x.fuzzy) ? " o productos parecidos" : ""}. Presiona Buscar para verlos.</p>` : `<p>Sin coincidencias para “${esc(inp.value)}”. Prueba con otra palabra.</p>`) : "";
    };
    inp.addEventListener("input", upd); upd();
    $("#psForm", root).addEventListener("submit", e => { e.preventDefault(); const q = inp.value.trim(); if (q.length > 1) go("results", { q }); else inp.focus(); });
  }
});

/* ================= Búsqueda por presupuesto ================= */
VIEWS.budget = ({ amount = "", cat = "" }) => ({
  title: "¿Cuál es tu presupuesto?",
  html: `<header class="phead"><span class="phead__ic tone-lila">${icon("wallet")}</span><div><h1>¿Cuál es tu presupuesto?</h1><p class="muted">Escribe cuánto quieres gastar por producto y te mostramos lo que te alcanza.</p></div></header>
  <form class="form budget" id="bgForm" novalidate>
    <div class="money-in"><span aria-hidden="true">$</span><label class="sr" for="bg-amt">Monto en pesos</label><input id="bg-amt" type="number" inputmode="decimal" min="1" step="1" placeholder="100" value="${esc(amount)}"><span class="money-in__u">MXN</span></div>
    <div class="chips">${[20, 50, 100, 200, 500].map(v => `<button type="button" class="chip" data-amt="${v}">${money(v)}</button>`).join("")}</div>
    ${field("bg-cat", "Categoría (opcional)", `<select id="bg-cat">${options(CATEGORIES.map(c => [c, cap(c)]), cat, "Todas las categorías")}</select>`)}
    <small class="ferr" id="bg-amt-err" hidden></small>
    <button class="btn btn--primary btn--block" type="submit">Ver productos</button>
  </form>`,
  mount(root) {
    const f = $("#bgForm", root), amt = $("#bg-amt", root);
    $$("[data-amt]", root).forEach(b => b.onclick = () => { amt.value = b.dataset.amt; });
    f.addEventListener("submit", e => {
      e.preventDefault();
      const v = parseFloat(amt.value);
      if (!(v > 0)) return setErr(f, "bg-amt", "Escribe un monto mayor a $0."), amt.focus();
      go("budgetResults", { amount: v, cat: $("#bg-cat", root).value });
    });
  }
});
VIEWS.budgetResults = ({ amount, cat }) => {
  const rows = Store.budget(amount, cat);
  const ids = [...new Set(rows.map(r => r.b.id))];
  return {
    title: `Hasta ${money(amount)}`,
    html: `<header class="phead"><span class="phead__ic tone-lila">${icon("wallet")}</span><div><p class="eyebrow">Tu presupuesto${cat ? ` · ${cap(cat)}` : ""}</p><h1>Productos de hasta ${money(amount)}</h1><p class="muted">${rows.length} productos en ${ids.length} negocios, del más cercano a tu monto al más barato.</p></div></header>
    <div class="actions-row"><button class="btn btn--ghost btn--sm" ${goAttr("budget", { amount, cat })}>${icon("edit")}Cambiar monto</button>${ids.length ? `<button class="btn btn--teal btn--sm" ${goAttr("results", { ids, label: `Negocios con productos de hasta ${money(amount)}` })}>${icon("stall")}Ver negocios</button>` : ""}</div>
    ${rows.length ? `<div class="plist">${rows.map(({ b, p }) => {
      const st = Store.status(b);
      return `<button class="prow" ${goAttr("business", { id: b.id, product: p.id })}>${productArt(p, b, "prow__art")}<span class="prow__main"><b>${esc(p.name)}</b><small>${esc(b.name)}</small><span class="prow__st">${statusPill(st)}</span></span>${priceTag(p)}</button>`;
    }).join("")}</div>` : emptyState("Nada por ese monto todavía", "Prueba con un monto un poco mayor o quita la categoría.", `<button class="btn btn--primary" ${goAttr("budget", { amount, cat: "" })}>Cambiar búsqueda</button>`)}`
  };
};

/* ================= Consulta genérica (menú de negocios) ================= */
VIEWS.results = (p) => {
  let list, matches = new Map(), fuzzy = false, title, eyebrow = "Consulta de negocios";
  if (p.q) {
    const r = Store.searchProducts(p.q);
    list = r.map(x => x.b); r.forEach(x => matches.set(x.b.id, x)); fuzzy = r.some(x => x.fuzzy);
    title = `Resultados para “${esc(p.q)}”`; eyebrow = "Búsqueda por producto";
  } else {
    list = Store.filterBiz(p);
    const t = p.tianguis && Store.tianguis(p.tianguis);
    title = p.label ? esc(p.label) : t ? esc(t.name) : p.colonia ? `${esc(p.colonia)}, ${esc(p.alcaldia)}` : p.alcaldia ? esc(p.alcaldia) : p.category ? cap(p.category) : "Todos los negocios";
    if (t) eyebrow = `Tianguis · ${t.days}`; else if (p.alcaldia) eyebrow = "Búsqueda por ubicación"; else if (p.category) eyebrow = "Categoría";
  }
  const total = list.length;
  if (p.openOnly) list = list.filter(b => Store.status(b).code === "open");
  if (p.cardOnly) list = list.filter(b => b.card);
  const toggle = (k, label, ic) => `<button class="chip chip--toggle ${p[k] ? "is-on" : ""}" aria-pressed="${!!p[k]}" data-toggle="${k}">${icon(ic)}${label}</button>`;
  return {
    title: "Negocios",
    html: `<header class="phead phead--compact"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div></header>
    <div class="filters">${toggle("openOnly", "Abierto ahora", "clock")}${toggle("cardOnly", "Acepta tarjeta", "card")}<span class="muted filters__n">${list.length} de ${total}</span></div>
    ${fuzzy ? `<p class="note">${icon("sparkle")}Incluimos productos con nombres parecidos a tu búsqueda.</p>` : ""}
    ${list.length ? `<div class="grid-cards">${list.map(b => {
      const m = matches.get(b.id);
      const extra = m && m.products.length ? `<p class="bcard__match">${icon("huacal")}${m.products.slice(0, 3).map(pp => `${esc(pp.name)} <b>${money(pp.price)}/${esc(unitText(pp.unit))}</b>`).join(" · ")}</p>` : "";
      return bizCard(b, extra);
    }).join("")}</div>`
      : emptyState("No encontramos negocios", total ? "Quita algún filtro para ver más resultados." : "Prueba con otra palabra, otra colonia o explora por categoría.", `<button class="btn btn--teal" data-act="home">Volver al inicio</button>`)}`,
    mount(root) {
      $$("[data-toggle]", root).forEach(b => b.onclick = () => go("results", Object.assign({}, p, { [b.dataset.toggle]: !p[b.dataset.toggle] }), { replace: true }));
    }
  };
};

/* ================= Consulta por negocio ================= */
VIEWS.business = ({ id, product }) => {
  const b = Store.biz(id);
  if (!b) return { html: emptyState("Este negocio ya no está disponible", "Puede que haya cerrado su cuenta.", "") };
  const st = Store.status(b);
  const t = b.tianguisId && Store.tianguis(b.tianguisId);
  const fav = Store.favorites().includes(b.id);
  const avg = Store.avgStars(b);
  const slides = b.products.length
    ? b.products.map(p => `<article class="slide ${p.id === product ? "is-hl" : ""}" id="sl-${p.id}">${productArt(p, b, "slide__art")}
        <div class="slide__body"><h3>${esc(p.name)}</h3>${priceTag(p)}${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
        <button class="btn btn--ghost btn--sm" data-add="${p.id}">${icon("plus")}Agregar al carrito</button></div></article>`).join("")
    : (b.photos.length ? b.photos.map((ph, i) => `<figure class="slide slide--photo"><img src="${ph}" alt="Foto ${i + 1} de ${esc(b.name)}"></figure>`).join("")
      : ["Fachada", "Puesto", "Mercancía"].map(c => `<figure class="slide slide--photo">${bizArt(b, "slide__art")}<figcaption>${c}</figcaption></figure>`).join(""));
  return {
    title: b.name,
    html: `<section class="bhead">
      ${bizArt(b, "bhead__art")}
      <div class="bhead__main">
        <div class="bhead__top">${catTag(b.category)}${cardBadge(b, true)}${b.format === "tianguis" ? `<span class="tag tone-tierra">Puesto en tianguis</span>` : `<span class="tag tone-petroleo">Local</span>`}</div>
        <h1>${esc(b.name)}</h1>
        <div class="bhead__status">${statusPill(st)}<span>${esc(st.detail)}</span></div>
        <dl class="facts">
          <div><dt>${icon("clock")}Horario</dt><dd>${esc(Store.scheduleText(b))}</dd></div>
          <div><dt>${icon("pin")}Ubicación</dt><dd>${esc(b.address)}<br><span class="muted">${t ? esc(t.name) + " · " : ""}${esc(b.colonia)}, ${esc(b.alcaldia)}</span></dd></div>
          ${b.phone ? `<div><dt>${icon("phone")}Teléfono</dt><dd class="sel">${esc(b.phone)}</dd></div>` : ""}
          ${b.socials ? `<div><dt>${icon("social")}Redes</dt><dd class="sel">${esc(b.socials)}</dd></div>` : ""}
          ${b.reviews.length ? `<div><dt>${icon("star")}Opiniones</dt><dd>${stars(avg)} <span class="muted">${avg.toFixed(1)} · ${b.reviews.length}</span></dd></div>` : ""}
        </dl>
      </div>
      <button class="fav ${fav ? "is-on" : ""}" id="favBtn" aria-pressed="${fav}" aria-label="${fav ? "Quitar de favoritos" : "Guardar en favoritos"}">${icon(fav ? "heartFill" : "heart")}</button>
    </section>
    ${b.description ? `<p class="bdesc">${esc(b.description)}</p>` : ""}
    <section class="sec">
      <div class="sec__head"><h2>${b.products.length ? "Productos" : "Fotos del negocio"}</h2><span class="muted">${b.products.length ? `${b.products.length} registrados` : "Aún no registra productos"}</span>
        <span class="car-nav"><button class="iconbtn iconbtn--plain" data-car="-1" aria-label="Anterior">${icon("back")}</button><button class="iconbtn iconbtn--plain" data-car="1" aria-label="Siguiente">${icon("chev")}</button></span></div>
      <div class="carousel" id="car" tabindex="0" aria-label="Carrusel">${slides}</div>
    </section>
    <div class="cta-bar"><button class="btn btn--primary btn--block btn--lg" ${goAttr("chat", { bizId: b.id })}>${icon("msg")}Hacer pedido o escribir una pregunta</button></div>
    <section class="sec">${mapCard(b.lat, b.lng, b.address)}</section>
    ${b.reviews.length ? `<section class="sec"><div class="sec__head"><h2>Lo que dicen los clientes</h2></div><div class="reviews">${b.reviews.slice(0, 3).map(r => `<article class="review">${stars(r.stars)}<p>${esc(r.text)}</p><small>${esc(r.client)} · ${fmtDay(r.ts)}</small></article>`).join("")}</div></section>` : ""}`,
    mount(root) {
      const car = $("#car", root);
      $$("[data-car]", root).forEach(btn => btn.onclick = () => car.scrollBy({ left: +btn.dataset.car * car.clientWidth * .8, behavior: "smooth" }));
      if (product) { const el = $("#sl-" + product, root); if (el) car.scrollLeft = el.offsetLeft - car.offsetLeft - 8; }
      $$("[data-add]", root).forEach(btn => btn.onclick = () => { Store.addToCart(b.id, btn.dataset.add); refreshCartCount(); toast("Agregado a tu carrito", { icon: "cart", action: "Ver", onAction: openCart }); });
      $("#favBtn", root).onclick = () => { const on = Store.toggleFav(b.id); toast(on ? "Guardado en favoritos" : "Quitado de favoritos", { icon: "heart", tone: "cereza" }); refresh(); };
      mountMaps(root);
    }
  };
};
function refreshCartCount() { const n = Store.cart().reduce((s, i) => s + i.qty, 0); const btn = $("[data-act=cart]"); if (btn) btn.outerHTML = `<button class="iconbtn" data-act="cart" aria-label="Carrito de verduras, ${n} productos">${icon("cart")}${n ? `<span class="count">${n}</span>` : ""}</button>`; }

/* ================= Carrito de verduras ================= */
function openCart() {
  const draw = body => {
    const items = Store.cart().map((it, i) => ({ it, i, b: Store.biz(it.bizId) })).filter(x => x.b).map(x => ({ ...x, p: x.b.products.find(p => p.id === x.it.productId) })).filter(x => x.p);
    const byBiz = {}; items.forEach(x => (byBiz[x.b.id] = byBiz[x.b.id] || []).push(x));
    const total = items.reduce((s, x) => s + x.p.price * x.it.qty, 0);
    body.innerHTML = items.length ? `${Object.values(byBiz).map(group => `<section class="cartgrp"><h3>${esc(group[0].b.name)}</h3>
        ${group.map(x => `<div class="citem">${productArt(x.p, x.b, "citem__art")}<div class="citem__main"><b>${esc(x.p.name)}</b><small>${money(x.p.price)} / ${esc(unitText(x.p.unit))}</small></div>
          <div class="qty"><button class="iconbtn iconbtn--plain" data-q="${x.i}" data-d="-1" aria-label="Quitar uno">${icon("minus")}</button><span>${x.it.qty}</span><button class="iconbtn iconbtn--plain" data-q="${x.i}" data-d="1" aria-label="Agregar uno">${icon("plus")}</button></div></div>`).join("")}
        <button class="btn btn--ghost btn--sm" ${goAttr("chat", { bizId: group[0].b.id, draft: "Hola, quiero hacer un pedido: " + group.map(x => `${x.it.qty} ${unitText(x.p.unit)} de ${x.p.name.toLowerCase()}`).join(", ") + "." })}>${icon("msg")}Enviar pedido a este negocio</button></section>`).join("")}
      <div class="carttotal"><span>Total estimado</span><b>${money(total)}</b></div><p class="muted small">El precio final lo confirma cada negocio.</p>`
      : emptyState("Tu carrito está vacío", "Agrega productos desde la ficha de un negocio para armar tu pedido.", "");
    $$("[data-q]", body).forEach(btn => btn.onclick = () => { const i = +btn.dataset.q; Store.setQty(i, Store.cart()[i].qty + +btn.dataset.d); draw(body); refreshCartCount(); });
  };
  openSheet({ title: "Carrito de verduras", html: "", mount: draw });
}

/* ================= Chat cliente → vendedor ================= */
function chatHtml(t, me, b) {
  return t.msgs.map((m, i) => {
    const day = fmtDay(m.ts), prev = t.msgs[i - 1];
    return `${!prev || fmtDay(prev.ts) !== day ? `<p class="chat__day">${day}</p>` : ""}<div class="bubble ${m.from === me ? "is-me" : ""}"><p>${esc(m.text)}</p><time>${fmtTime(m.ts)}</time></div>`;
  }).join("") || `<p class="chat__empty">Escribe tu pregunta o tu pedido. ${b ? esc(b.name) : "El cliente"} te responderá aquí.</p>`;
}
function autoReply(b, text) {
  const s = Store.norm(text);
  if (/pedido|aparta|quiero|kilo|kg/.test(s)) return "¡Claro! Se lo aparto. ¿A qué hora pasa por su pedido?";
  if (/tarjeta|transferencia|pago/.test(s)) return b.card ? "Sí aceptamos tarjeta de débito y crédito." : "Por ahora solo efectivo y transferencia.";
  if (/hora|abre|cierr/.test(s)) return `Estamos ${Store.scheduleText(b)}.`;
  if (/tiene|hay|venden/.test(s)) return "Sí hay, está fresco de hoy. ¿Cuánto le aparto?";
  return "¡Hola! Gracias por escribir, en un momento le contesto.";
}
VIEWS.chat = ({ bizId, draft = "" }) => {
  const b = Store.biz(bizId);
  const u = Store.currentUser();
  const isClient = u && u.role === "cliente";
  const t = Store.threadFor(bizId, isClient ? u.id : "guest", isClient ? u.name : "Visitante");
  t.unreadClient = 0; Store.save();
  const st = Store.status(b);
  return {
    title: "Chat", cls: "main--chat",
    html: `<header class="chat__head">${bizArt(b, "chat__av")}<div><h1>${esc(b.name)}</h1><div class="chat__st">${statusPill(st)}<span class="muted">${esc(st.detail)}</span></div></div></header>
    ${!isClient ? `<p class="note">${icon("user")}Escribes como visitante. <button class="link" ${goAttr("login", { role: "cliente" })}>Inicia sesión como cliente</button> para guardar tus conversaciones.</p>` : ""}
    <div class="chat__log" id="log" aria-live="polite">${chatHtml(t, "client", b)}</div>
    <div class="chips chips--scroll">${["¿Tiene disponible…?", "Quiero hacer un pedido", "¿Aceptan tarjeta?", "¿A qué hora cierran?"].map(q => `<button class="chip" data-quick="${esc(q)}">${q}</button>`).join("")}</div>
    <form class="composer" id="cmp"><label class="sr" for="cmp-t">Mensaje</label><textarea id="cmp-t" rows="1" placeholder="Escribe tu mensaje" enterkeyhint="send">${esc(draft)}</textarea><button class="btn btn--primary btn--icon" type="submit" aria-label="Enviar">${icon("send")}</button></form>`,
    mount(root) {
      const log = $("#log", root), ta = $("#cmp-t", root);
      const paint = () => { log.innerHTML = chatHtml(t, "client", b); log.scrollTop = log.scrollHeight; window.scrollTo(0, document.body.scrollHeight); };
      paint();
      $$("[data-quick]", root).forEach(c => c.onclick = () => { ta.value = c.dataset.quick.replace("…", " "); ta.focus(); });
      ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#cmp", root).requestSubmit(); } });
      $("#cmp", root).addEventListener("submit", e => {
        e.preventDefault();
        const text = ta.value.trim(); if (!text) return;
        Store.send(t, "client", text); ta.value = ""; paint();
        if (b.simulated && !b.ownerAccount) {
          log.insertAdjacentHTML("beforeend", `<div class="bubble typing" id="typing"><span></span><span></span><span></span></div>`); log.scrollTop = log.scrollHeight;
          setTimeout(() => { Store.send(t, "vendor", autoReply(b, text)); t.unreadClient = 0; Store.save(); if ($("#log")) paint(); }, 1400);
        } else toast("Mensaje enviado. El vendedor recibirá un aviso.", { icon: "check", tone: "turquesa" });
      });
    }
  };
};

/* ================= Inicio de sesión ================= */
VIEWS.login = ({ role = "cliente", prefill = "" }) => {
  const R = ROLE[role], admin = role === "comercios" || role === "gobierno";
  return {
    title: "Iniciar sesión", cls: "main--narrow",
    html: `<section class="auth">
      <header class="auth__head"><span class="roleic roleic--lg tone-${R.tone}">${icon(R.icon)}</span><div><p class="eyebrow">Iniciar sesión</p><h1>${R.label}</h1></div></header>
      <form class="form" id="lgForm" novalidate>
        ${field("lg-id", "Correo o teléfono", `<input id="lg-id" type="text" autocomplete="username" inputmode="email" value="${esc(prefill)}" placeholder="tu@correo.com o 55 1234 5678">`, "", true)}
        ${admin ? field("lg-folio", "Folio de identificación", `<input id="lg-folio" type="text" autocomplete="off" placeholder="${role === "comercios" ? "ADC-0000" : "GOB-0000"}" style="text-transform:uppercase">`, "Lo encuentras en tu credencial o en el correo de alta.", true) : ""}
        ${field("lg-pw", "Contraseña", `<div class="pw"><input id="lg-pw" type="password" autocomplete="current-password"><button type="button" class="pw__t" aria-label="Mostrar contraseña">${icon("eye")}</button></div>`, "", true)}
        <p class="form__err" id="lg-err" role="alert" hidden></p>
        <button class="btn btn--primary btn--block btn--lg" type="submit">Entrar</button>
      </form>
      ${role !== "gobierno" ? `<p class="auth__alt">¿Aún no tienes cuenta? <button class="link" ${goAttr("register", { role })}>Regístrate como ${R.label.toLowerCase()}</button></p>`
        : `<p class="auth__alt muted">Las cuentas de gobierno las emite la dependencia. Solicita tu folio a tu área de sistemas.</p>`}
    </section>`,
    mount(root) {
      const f = $("#lgForm", root);
      $(".pw__t", root).onclick = e => { const i = $("#lg-pw", root); i.type = i.type === "password" ? "text" : "password"; e.currentTarget.setAttribute("aria-label", i.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña"); };
      (prefill ? $("#lg-pw", root) : $("#lg-id", root)).focus();
      f.addEventListener("submit", e => {
        e.preventDefault();
        const id = $("#lg-id", root).value.trim(), pw = $("#lg-pw", root).value, folio = admin ? $("#lg-folio", root).value.trim() : "";
        let ok = setErr(f, "lg-id", id ? "" : "Escribe tu correo o teléfono.");
        ok = setErr(f, "lg-pw", pw ? "" : "Escribe tu contraseña.") && ok;
        if (admin) ok = setErr(f, "lg-folio", folio ? "" : "Escribe tu folio.") && ok;
        const err = $("#lg-err", root); err.hidden = true;
        if (!ok) return;
        const res = Store.login(role, id, pw, folio);
        if (res.error) { err.textContent = res.error; err.hidden = false; return; }
        $("[type=submit]", f).disabled = true;
        fruitTransition(res.user.name, () => { stack = [{ name: "home", params: {} }, { name: PANEL[role], params: {} }]; push(); render(); });
      });
    }
  };
};

/* ================= Registro ================= */
function credFields(p = "rg") {
  return field(`${p}-login`, "Correo o teléfono", `<input id="${p}-login" type="text" autocomplete="username" inputmode="email">`, "Con este dato iniciarás sesión.", true)
    + field(`${p}-pw`, "Contraseña", `<input id="${p}-pw" type="password" autocomplete="new-password" minlength="8">`, "Mínimo 8 caracteres.", true);
}
function checkCreds(f, p = "rg") {
  const l = $(`#${p}-login`, f).value.trim(), pw = $(`#${p}-pw`, f).value;
  const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l), isPhone = /^\d{10}$/.test(l.replace(/[\s-]/g, ""));
  let ok = setErr(f, `${p}-login`, !l ? "Escribe un correo o un teléfono de 10 dígitos." : !(isMail || isPhone) ? "Usa un correo válido o un teléfono de 10 dígitos." : Store.loginTaken(l) ? "Ya existe una cuenta con este dato. Inicia sesión." : "");
  ok = setErr(f, `${p}-pw`, pw.length < 8 ? "La contraseña necesita al menos 8 caracteres." : "") && ok;
  return ok ? { login: l, password: pw } : null;
}
const CURP_RX = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/;
const RFC_RX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
function alcColSelects(p, alc = "", col = "") {
  return `<div class="grid2">${field(`${p}-alc`, "Alcaldía", `<select id="${p}-alc">${options(ALCALDIAS.map(a => a.name), alc, "Elige tu alcaldía")}</select>`, "", true)}
    ${field(`${p}-col`, "Colonia", `<select id="${p}-col" ${alc ? "" : "disabled"}>${options(alc ? ALCALDIAS.find(a => a.name === alc).colonias : [], col, "Elige tu colonia")}</select>`, "", true)}</div>`;
}
function bindAlcCol(root, p, after) {
  $(`#${p}-alc`, root).addEventListener("change", e => {
    const A = ALCALDIAS.find(a => a.name === e.target.value), col = $(`#${p}-col`, root);
    col.innerHTML = options(A ? A.colonias : [], "", "Elige tu colonia"); col.disabled = !A;
    after && after(e.target.value);
  });
}
function firstError(f) { const e = $("[aria-invalid=true]", f); if (e) { e.focus(); e.scrollIntoView({ block: "center", behavior: "smooth" }); } }

VIEWS.register = ({ role = "cliente" }) => {
  const R = ROLE[role];
  const head = `<header class="auth__head"><span class="roleic roleic--lg tone-${R.tone}">${icon(R.icon)}</span><div><p class="eyebrow">Crear cuenta</p><h1>${role === "vendedor" ? "Alta de negocio" : R.label}</h1></div></header>`;
  if (role === "cliente") return {
    title: "Registro de cliente", cls: "main--narrow",
    html: `<section class="auth">${head}<form class="form" id="rgForm" novalidate>
      ${field("rg-name", "Nombre", `<input id="rg-name" type="text" autocomplete="name">`, "", true)}
      ${credFields()}
      ${alcColSelects("rg")}
      <fieldset class="fs"><legend>Tianguis y locales favoritos</legend><p class="hint">Los usaremos para sugerirte lugares cercanos cuando busques productos.</p>
        <div id="rg-favs" class="favpick">${favPicker("")}</div></fieldset>
      <p class="form__err" id="rg-err" role="alert" hidden></p>
      <button class="btn btn--primary btn--block btn--lg" type="submit">Crear mi cuenta</button></form></section>`,
    mount(root) {
      const f = $("#rgForm", root);
      bindAlcCol(root, "rg", alc => { const sel = $$("#rg-favs input:checked", root).map(i => i.value); $("#rg-favs", root).innerHTML = favPicker(alc, sel); });
      f.addEventListener("submit", e => {
        e.preventDefault();
        const name = $("#rg-name", f).value.trim(), alc = $("#rg-alc", f).value, col = $("#rg-col", f).value;
        let ok = setErr(f, "rg-name", name.length < 2 ? "Escribe tu nombre." : "");
        const cred = checkCreds(f); ok = !!cred && ok;
        ok = setErr(f, "rg-alc", alc ? "" : "Elige tu alcaldía.") && ok;
        ok = setErr(f, "rg-col", col ? "" : "Elige tu colonia.") && ok;
        if (!ok) return firstError(f);
        const u = Store.register("cliente", { name, ...cred, alcaldia: alc, colonia: col, favorites: $$("#rg-favs input:checked", f).map(i => i.value) });
        go("registered", { uid: u.id }, { replace: true });
      });
    }
  };
  if (role === "comercios") return {
    title: "Registro de administrador", cls: "main--narrow",
    html: `<section class="auth">${head}<form class="form" id="rgForm" novalidate>
      ${field("rg-name", "Nombre completo", `<input id="rg-name" type="text" autocomplete="name">`, "", true)}
      ${credFields()}
      ${field("rg-rfc", "RFC", `<input id="rg-rfc" type="text" maxlength="13" autocomplete="off" class="upper" placeholder="SAGJ800312QK4">`, "13 caracteres con homoclave.", true)}
      ${field("rg-tg", "Tianguis de adscripción", `<select id="rg-tg">${options(TIANGUIS.map(t => [t.id, `${t.name} (${t.alcaldia})`]), "", "Elige el tianguis que administras")}</select>`, "", true)}
      <button class="btn btn--primary btn--block btn--lg" type="submit">Solicitar cuenta</button></form></section>`,
    mount(root) {
      const f = $("#rgForm", root);
      f.addEventListener("submit", e => {
        e.preventDefault();
        const name = $("#rg-name", f).value.trim(), rfc = $("#rg-rfc", f).value.trim().toUpperCase(), tg = $("#rg-tg", f).value;
        let ok = setErr(f, "rg-name", name.length < 3 ? "Escribe tu nombre completo." : "");
        const cred = checkCreds(f); ok = !!cred && ok;
        ok = setErr(f, "rg-rfc", RFC_RX.test(rfc) ? "" : "El RFC no tiene el formato correcto (ej. SAGJ800312QK4).") && ok;
        ok = setErr(f, "rg-tg", tg ? "" : "Elige tu tianguis de adscripción.") && ok;
        if (!ok) return firstError(f);
        const u = Store.register("comercios", { name, ...cred, rfc, tianguisId: tg });
        go("registered", { uid: u.id }, { replace: true });
      });
    }
  };
  return VIEWS.registerVendor();
};
function favPicker(alc, sel = []) {
  const tg = TIANGUIS.filter(t => !alc || t.alcaldia === alc);
  const locs = Store.visible().filter(b => b.format === "local" && (!alc || b.alcaldia === alc));
  const item = (id, name, sub, ic) => `<label class="pick"><input type="checkbox" value="${id}" ${sel.includes(id) ? "checked" : ""}><span class="pick__box">${icon(ic)}</span><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></label>`;
  const html = tg.map(t => item(t.id, t.name, `${t.alcaldia} · ${t.days}`, "stall")).join("") + locs.map(b => item(b.id, b.name, `${b.colonia} · ${cap(b.category)}`, "door")).join("");
  return html || `<p class="muted small">No hay tianguis ni locales registrados en ${esc(alc)} todavía. Puedes agregarlos después.</p>`;
}

VIEWS.registerVendor = () => ({
  title: "Alta de negocio", cls: "main--narrow",
  html: `<section class="auth"><header class="auth__head"><span class="roleic roleic--lg tone-tierra">${icon("stall")}</span><div><p class="eyebrow">Registro de vendedor</p><h1>Alta de negocio</h1></div></header>
  <form class="form" id="rvForm" novalidate>
    <fieldset class="fs"><legend><span class="fs__n">1</span>Tu cuenta</legend>${credFields("rv")}</fieldset>
    <fieldset class="fs"><legend><span class="fs__n">2</span>Datos del propietario</legend>
      ${field("rv-owner", "Nombre del dueño", `<input id="rv-owner" type="text" autocomplete="name">`, "", true)}
      <div class="grid2">${field("rv-curp", "CURP", `<input id="rv-curp" type="text" maxlength="18" class="upper" autocomplete="off" placeholder="18 caracteres">`, "", true)}
      ${field("rv-rfc", "RFC", `<input id="rv-rfc" type="text" maxlength="13" class="upper" autocomplete="off" placeholder="13 caracteres">`, "", true)}</div>
      ${field("rv-workers", "Cantidad de trabajadores", `<input id="rv-workers" type="number" min="1" max="200" inputmode="numeric" value="1">`, "Incluyéndote a ti.", true)}
    </fieldset>
    <fieldset class="fs"><legend><span class="fs__n">3</span>Datos del comercio</legend>
      ${field("rv-name", "Nombre del negocio", `<input id="rv-name" type="text" placeholder="Ej. Recaudería Doña Mary">`, "", true)}
      <div class="field"><span class="lbl">Formato <span class="req">*</span></span><div class="seg" role="radiogroup" aria-label="Formato del negocio">
        <label class="seg__o"><input type="radio" name="rv-format" value="local" checked><span>${icon("door")}Local</span></label>
        <label class="seg__o"><input type="radio" name="rv-format" value="tianguis"><span>${icon("stall")}Puesto en tianguis</span></label></div></div>
      <div id="rv-tgbox" hidden>${field("rv-tg", "Tianguis", `<select id="rv-tg">${options(TIANGUIS.map(t => [t.id, `${t.name} (${t.alcaldia})`]), "", "Elige tu tianguis")}</select>`, "", true)}
        <p class="note note--warn">${icon("shield")}Los puestos en tianguis aparecen en las búsquedas cuando el administrador de comercios del tianguis aprueba el registro.</p></div>
      <div id="rv-locbox">${alcColSelects("rv")}</div>
      ${field("rv-cat", "Categoría", `<select id="rv-cat">${options(CATEGORIES.map(c => [c, cap(c)]), "", "Elige una categoría")}</select>`, "", true)}
    </fieldset>
    <fieldset class="fs"><legend><span class="fs__n">4</span>Ubicación</legend>
      ${field("rv-addr", "Escribe la dirección del negocio", `<input id="rv-addr" type="text" autocomplete="street-address" placeholder="Calle, número, referencia">`, CFG.GOOGLE_MAPS_API_KEY ? "Elige una sugerencia de Google Maps para fijar el punto." : "", true)}
      <div class="gpsbox"><p>¿Estás en tu negocio? Usa tu ubicación actual para registrar la dirección.</p><button type="button" class="btn btn--teal" id="rv-gps">${icon("gps")}Usar mi ubicación actual</button><p class="small" id="rv-gps-msg" aria-live="polite"></p></div>
      <div id="rv-map"></div>
    </fieldset>
    <fieldset class="fs"><legend><span class="fs__n">5</span>Operatividad</legend>
      <div class="field"><span class="lbl">Días de servicio <span class="req">*</span></span><div class="days" id="rv-days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="day"><input type="checkbox" value="${d}" ${d >= 1 && d <= 6 ? "checked" : ""}><span>${DAY_SHORT[d]}</span></label>`).join("")}</div><small class="ferr" id="rv-days-err" hidden></small></div>
      <div class="grid2">${field("rv-open", "Abre", `<input id="rv-open" type="time" value="08:00">`, "", true)}${field("rv-close", "Cierra", `<input id="rv-close" type="time" value="17:00">`, "", true)}</div>
      <label class="switch"><input type="checkbox" id="rv-card"><span class="switch__t" aria-hidden="true"></span><span><b>Cuento con terminal bancaria</b><small>Tus clientes verán que aceptas pago con tarjeta.</small></span></label>
    </fieldset>
    <fieldset class="fs"><legend><span class="fs__n">6</span>Contacto y fotos</legend>
      ${field("rv-social", "Redes sociales", `<input id="rv-social" type="text" placeholder="facebook.com/tunegocio, @tunegocio">`)}
      ${field("rv-phone", "Teléfono (opcional)", `<input id="rv-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="55 1234 5678">`)}
      ${field("rv-desc", "Breve descripción de tus productos", `<textarea id="rv-desc" rows="3" maxlength="280" placeholder="Ej. Verdura fresca de la Central de Abasto, chiles secos y hierbas de olor."></textarea>`, "Hasta 280 caracteres. También la usamos para que te encuentren en las búsquedas.", true)}
      <div class="field"><span class="lbl">Fotos del negocio (opcional)</span>
        <label class="upload"><input type="file" id="rv-photos" accept="image/*" multiple>${icon("image")}<span>Agregar fotos</span></label>
        <div class="thumbs" id="rv-thumbs"></div></div>
    </fieldset>
    <p class="form__err" id="rv-err" role="alert" hidden></p>
    <button class="btn btn--primary btn--block btn--lg" type="submit">Registrar mi negocio</button>
  </form></section>`,
  mount(root) {
    const f = $("#rvForm", root);
    const geo = { lat: null, lng: null };
    let photos = [];
    const fmt = () => $("input[name=rv-format]:checked", f).value;
    $$("input[name=rv-format]", f).forEach(r => r.onchange = () => { $("#rv-tgbox", f).hidden = fmt() !== "tianguis"; $("#rv-locbox", f).hidden = fmt() === "tianguis"; });
    bindAlcCol(root, "rv");
    const drawMap = () => { $("#rv-map", f).innerHTML = geo.lat != null ? mapCard(geo.lat, geo.lng, $("#rv-addr", f).value) : ""; mountMaps(f); };
    Maps.autocomplete($("#rv-addr", f), p => { $("#rv-addr", f).value = p.address; geo.lat = p.lat; geo.lng = p.lng; drawMap(); });
    $("#rv-gps", f).onclick = () => {
      const msg = $("#rv-gps-msg", f);
      if (!navigator.geolocation) { msg.textContent = "Tu navegador no permite obtener la ubicación. Escribe la dirección."; return; }
      msg.textContent = "Buscando tu ubicación…";
      navigator.geolocation.getCurrentPosition(async pos => {
        geo.lat = +pos.coords.latitude.toFixed(6); geo.lng = +pos.coords.longitude.toFixed(6);
        const addr = await Maps.reverse(geo.lat, geo.lng);
        const a = $("#rv-addr", f);
        a.value = addr || a.value || `Ubicación GPS ${geo.lat}, ${geo.lng}`;
        msg.textContent = `Ubicación registrada con precisión de ${Math.round(pos.coords.accuracy)} m. Puedes corregir la dirección arriba.`;
        setErr(f, "rv-addr", ""); drawMap();
      }, err => { msg.textContent = err.code === 1 ? "No diste permiso de ubicación. Actívalo en tu navegador o escribe la dirección." : "No pudimos obtener tu ubicación. Escribe la dirección."; }, { enableHighAccuracy: true, timeout: 12000 });
    };
    $("#rv-photos", f).onchange = async e => {
      for (const file of [...e.target.files].slice(0, 6 - photos.length)) { const src = await OCR.fileToDataUrl(file); const s = src && await OCR.shrink(src, 720); if (s) photos.push(s); }
      e.target.value = "";
      $("#rv-thumbs", f).innerHTML = photos.map((p, i) => `<figure class="thumb"><img src="${p}" alt="Foto ${i + 1}"><button type="button" class="thumb__x" data-rm="${i}" aria-label="Quitar foto ${i + 1}">${icon("x")}</button></figure>`).join("");
      $$("[data-rm]", f).forEach(b => b.onclick = () => { photos.splice(+b.dataset.rm, 1); $("#rv-photos", f).dispatchEvent(new Event("change")); });
    };
    f.addEventListener("submit", e => {
      e.preventDefault();
      const v = id => $("#" + id, f).value.trim();
      const cred = checkCreds(f, "rv"); let ok = !!cred;
      ok = setErr(f, "rv-owner", v("rv-owner").length < 3 ? "Escribe el nombre del dueño." : "") && ok;
      ok = setErr(f, "rv-curp", CURP_RX.test(v("rv-curp").toUpperCase()) ? "" : "La CURP debe tener 18 caracteres (ej. HELM780514MDFRPR04).") && ok;
      ok = setErr(f, "rv-rfc", RFC_RX.test(v("rv-rfc").toUpperCase()) ? "" : "El RFC debe tener 12 o 13 caracteres con homoclave.") && ok;
      ok = setErr(f, "rv-workers", +v("rv-workers") >= 1 ? "" : "Indica al menos 1 trabajador.") && ok;
      ok = setErr(f, "rv-name", v("rv-name").length < 3 ? "Escribe el nombre del negocio." : "") && ok;
      const format = fmt();
      if (format === "tianguis") ok = setErr(f, "rv-tg", v("rv-tg") ? "" : "Elige tu tianguis.") && ok;
      else { ok = setErr(f, "rv-alc", v("rv-alc") ? "" : "Elige la alcaldía.") && ok; ok = setErr(f, "rv-col", v("rv-col") ? "" : "Elige la colonia.") && ok; }
      ok = setErr(f, "rv-cat", v("rv-cat") ? "" : "Elige una categoría.") && ok;
      ok = setErr(f, "rv-addr", v("rv-addr") ? "" : "Escribe la dirección o usa tu ubicación actual.") && ok;
      const days = $$("#rv-days input:checked", f).map(i => +i.value);
      ok = setErr(f, "rv-days", days.length ? "" : "Elige al menos un día.") && ok;
      ok = setErr(f, "rv-close", Store.hm(v("rv-close")) > Store.hm(v("rv-open")) ? "" : "La hora de cierre debe ser después de la apertura.") && ok;
      ok = setErr(f, "rv-desc", v("rv-desc").length >= 10 ? "" : "Describe tus productos en al menos 10 caracteres.") && ok;
      if (!ok) return firstError(f);
      const u = Store.register("vendedor", {
        ...cred, name: v("rv-owner"), curp: v("rv-curp").toUpperCase(), rfc: v("rv-rfc").toUpperCase(), workers: +v("rv-workers"),
        bizName: v("rv-name"), format, tianguisId: v("rv-tg"), alcaldia: v("rv-alc"), colonia: v("rv-col"), category: v("rv-cat"),
        address: v("rv-addr"), lat: geo.lat, lng: geo.lng, schedule: { days, open: v("rv-open"), close: v("rv-close") },
        card: $("#rv-card", f).checked, socials: v("rv-social"), phone: v("rv-phone"), description: v("rv-desc"), photos
      });
      go("registered", { uid: u.id }, { replace: true });
    });
  }
});

VIEWS.registered = ({ uid }) => {
  const u = Store.user(uid); const R = ROLE[u.role];
  const b = u.bizId && Store.biz(u.bizId);
  const pending = b && b.status === "pending";
  return {
    title: "Cuenta creada", cls: "main--narrow",
    html: `<section class="done">${fruit(pending ? "lemon" : "watermelon", "done__art")}
      <p class="eyebrow">${R.label}</p><h1>${pending ? "Registro enviado a revisión" : "Tu cuenta está lista"}</h1>
      <p>${pending ? `Tu puesto <b>${esc(b.name)}</b> aparecerá en las búsquedas cuando el administrador de comercios de ${esc(Store.tianguis(b.tianguisId).name)} lo apruebe. Mientras tanto ya puedes entrar a tu panel y cargar productos.`
        : u.role === "comercios" ? `Tu folio de identificación es <b class="folio sel">${u.folio}</b>. Guárdalo: lo pedimos cada vez que inicias sesión.`
          : b ? `<b>${esc(b.name)}</b> ya aparece en las búsquedas de los clientes.` : "Ya puedes guardar favoritos y escribir a los negocios."}</p>
      <button class="btn btn--primary btn--lg" ${goAttr("login", { role: u.role, prefill: u.login || u.phone })}>Iniciar sesión</button></section>`
  };
};

/* ================= Panel del cliente ================= */
VIEWS.panelCliente = () => {
  const u = Store.currentUser();
  if (!u || u.role !== "cliente") return needLogin("cliente");
  const favs = u.favorites.map(id => id.startsWith("t-") ? { t: Store.tianguis(id) } : { b: Store.biz(id) }).filter(x => x.t || x.b);
  const threads = Store.threadsForClient(u.id);
  const nearOpen = Store.filterBiz({ alcaldia: u.alcaldia }).filter(b => Store.status(b).code === "open");
  return {
    title: "Mi panel",
    html: `<header class="phead"><span class="phead__ic tone-turquesa">${icon("userBag")}</span><div><p class="eyebrow">${esc(u.colonia)}, ${esc(u.alcaldia)}</p><h1>Hola, ${esc(u.name.split(" ")[0])}</h1></div></header>
    ${searchTiles()}
    <section class="sec"><div class="sec__head"><h2>Tus favoritos</h2></div>
      ${favs.length ? `<div class="list">${favs.map(x => x.t ? `<button class="row" ${goAttr("results", { tianguis: x.t.id })}><span class="row__ic tone-tierra">${icon("stall")}</span><span class="row__main"><b>${x.t.name}</b><small>${x.t.days} · ${Store.filterBiz({ tianguis: x.t.id }).filter(b => Store.status(b).code === "open").length} puestos abiertos ahora</small></span>${icon("chev")}</button>`
        : `<button class="row" ${goAttr("business", { id: x.b.id })}><span class="row__ic tone-cereza">${icon("heartFill")}</span><span class="row__main"><b>${esc(x.b.name)}</b><small>${esc(Store.status(x.b).label)} · ${esc(Store.scheduleText(x.b))}</small></span>${icon("chev")}</button>`).join("")}</div>`
        : `<p class="muted">Toca el corazón en un negocio para guardarlo aquí.</p>`}
    </section>
    <section class="sec"><div class="sec__head"><h2>Mis conversaciones</h2></div>
      ${threads.length ? `<div class="list">${threads.map(t => { const b = Store.biz(t.bizId), m = t.msgs[t.msgs.length - 1]; return `<button class="row" ${goAttr("chat", { bizId: t.bizId })}><span class="row__ic tone-petroleo">${icon("msg")}</span><span class="row__main"><b>${esc(b.name)}</b><small>${esc(m.text)}</small></span><span class="row__meta">${fmtDay(m.ts)} ${fmtTime(m.ts)}${t.unreadClient ? `<span class="count count--inline">${t.unreadClient}</span>` : ""}</span></button>`; }).join("")}</div>`
        : `<p class="muted">Aún no escribes a ningún negocio.</p>`}
    </section>
    <section class="sec"><div class="sec__head"><h2>Abiertos ahora en ${esc(u.alcaldia)}</h2></div>
      ${nearOpen.length ? `<div class="grid-cards">${nearOpen.slice(0, 4).map(b => bizCard(b)).join("")}</div>` : `<p class="muted">Ningún negocio de tu alcaldía está abierto en este momento.</p>`}
    </section>`
  };
};
function needLogin(role) {
  return { html: emptyState("Inicia sesión para ver este panel", `Este panel es para el perfil ${ROLE[role].label}.`, `<button class="btn btn--primary" ${goAttr("login", { role })}>Iniciar sesión</button>`) };
}

/* ================= Arranque ================= */
function boot() {
  Store.load();
  const u = Store.currentUser();
  if (u) stack.push({ name: PANEL[u.role], params: {} });
  else if (/[?&]v=producto/.test(location.search)) stack.push({ name: "productSearch", params: {} });
  if (HIST) { try { history.replaceState({ d: 1 }, ""); } catch (e) { } if (stack.length > 1) push(); }
  render();
  // Refresca estados "Abierto ahora" cada minuto en vistas que los muestran.
  setInterval(() => {
    const v = stack[stack.length - 1].name;
    const busy = $(".sheet") || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    if (!busy && ["home", "results", "business", "panelVendedor", "panelCliente", "panelComercios"].includes(v)) refresh();
  }, 60000);
}
