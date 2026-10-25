/* Integración real. Reutiliza el enrutador y el lenguaje visual de la PWA. */
Object.assign(Store, {
  load() { /* No cargar cuentas, catálogo ni sesiones de la antigua demo local. */ },
  currentUser: LiveAPI.currentUser,
  login: LiveAPI.login,
  logout: LiveAPI.logout,
  register: LiveAPI.register
});

const LIVE_ROLES = { cliente: "Cliente", vendedor: "Puesto", gerente: "Gerente de tianguis", comercios: "Seguridad", gobierno: "Administración" };
ROLE.comercios.label = "Seguridad";
ROLE.gobierno.label = "Administración";
const LIVE_STATES = { borrador: "Borrador · pendiente de confirmar", publicada: "Publicada", agotada: "Agotada", vencida: "Vencida", suspendida: "Suspendida" };
const liveDate = value => value ? new Date(value).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" }) : "Sin confirmar";
const loading = text => `<p class="note" role="status">${esc(text || "Cargando…")}</p>`;
function liveError(root, error, retry) {
  root.innerHTML = `<div class="note note--warn" role="alert"><p>${esc(error.message)}</p><button class="btn btn--ghost" data-retry>Volver a intentar</button>${error.status === 401 ? `<button class="btn btn--primary" ${goAttr("login")}>Iniciar sesión</button>` : ""}</div>`;
  $("[data-retry]", root).onclick = retry;
}
async function liveSubmit(form, action) {
  const button = $("[type=submit]", form);
  const error = $("[data-error]", form);
  error.hidden = true; button.disabled = true;
  try { await action(); }
  catch (e) { error.textContent = e.message; error.hidden = false; error.focus(); }
  finally { button.disabled = false; }
}
const errorField = () => '<p class="form__err" data-error role="alert" tabindex="-1" hidden></p>';
const inputValue = (form, name) => form.elements.namedItem(name).value.trim();
const liveInput = (name, label, type = "text", attrs = "", value = "") => field(name, label, `<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`, "", /required/.test(attrs));

topbar = function () {
  const user = LiveAPI.currentUser();
  return `<header class="topbar"><div class="topbar__bar"><div class="topbar__in">
    ${stack.length > 1 ? `<button class="iconbtn" data-act="back" aria-label="Regresar">${icon("back")}</button>` : ""}
    <button class="logo" data-act="home" aria-label="Mi Changarrito, inicio">${LOGO_MARK}<span>Mi Changarrito</span></button><span class="topbar__sp"></span>
    ${user ? `<button class="btn btn--ghost btn--sm" ${goAttr(PANEL[user.role])}>Mi panel</button><button class="iconbtn" data-act="logout" aria-label="Cerrar sesión">${icon("logout")}</button>` : `<button class="loginbtn" ${goAttr("login")}>${icon("user")}<span>Iniciar sesión</span></button>`}
    </div></div><div class="toldo" aria-hidden="true"></div></header>`;
};
ACTS.logout = async () => {
  try { await LiveAPI.logout(); toast("Sesión cerrada"); }
  catch (_) { toast("Sesión cerrada en este dispositivo. No se pudo confirmar el cierre remoto."); }
  goHome();
};

function liveOfferCard(offer, privateView = false, showDetailLink = true) {
  const valid = offer.estado === "publicada" && new Date(offer.vigente_hasta) > new Date();
  // Las fotos privadas requieren autorización; no insertar tokens en URLs de imágenes.
  const image = valid && typeof offer.foto_url === "string" && /^\/uploads\/[a-zA-Z0-9._/-]+$/.test(offer.foto_url) ? offer.foto_url : "";
  const state = offer.estado === "publicada" && !valid ? "Vencida" : LIVE_STATES[offer.estado] || "Estado desconocido";
  return `<article class="live-offer">
    ${image ? `<img class="live-offer__photo" src="${esc(image)}" alt="Foto de ${esc(offer.producto || "la oferta")}" loading="lazy">` : `<div class="live-offer__art" style="background-color:${ART_TINT[offerArt(offer.producto)] || ART_TINT.crate}" aria-hidden="true">${fruit(offerArt(offer.producto))}</div>`}
    <div class="live-offer__body"><p class="eyebrow">${esc(offer.tianguis_nombre || "Tianguis por confirmar")}${offer.is_demo ? " · Demostración" : ""}</p><p>${esc(offer.negocio || "Puesto sin nombre")}</p><h2>${esc(offer.producto || "Producto por revisar")}</h2>
    ${privateView && offer.foto_url && !valid ? '<p class="small muted">Foto privada guardada</p>' : ""}
    <p class="price">${offer.precio_declarado == null ? "Precio por confirmar" : money(offer.precio_declarado)}${offer.unidad ? `<small> / ${esc(offer.unidad)}</small>` : ""}</p>
    ${offer.descripcion ? `<p>${esc(offer.descripcion)}</p>` : ""}<p class="small muted">${esc(offer.ubicacion?.direccion || "Dirección no declarada")}</p>
    <p class="small">${esc(state)}${offer.vigente_hasta ? ` · Hasta ${esc(liveDate(offer.vigente_hasta))} (CDMX)` : ""}</p>
    ${offer.horario ? `<p class="small muted">Horario declarado: ${esc(offer.horario)}</p>` : ""}
    ${offer.motivo_suspension ? `<p class="note note--warn">${esc(offer.motivo_suspension)}</p>` : ""}
    <div class="live-actions">${privateView ? `${["borrador", "publicada"].includes(offer.estado) && (offer.estado !== "publicada" || valid) ? `<button class="btn btn--ghost btn--sm" data-edit="${esc(offer.id)}">Revisar y confirmar</button>` : ""}${valid ? `<button class="btn btn--ghost btn--sm" data-sold="${esc(offer.id)}">Marcar agotada</button>` : ""}` : showDetailLink ? `<button class="btn btn--ghost btn--sm" ${goAttr("business", { id: offer.id })}>Ver oferta</button>` : ""}</div></div></article>`;
}

function liveCatalogue({ q = "" } = {}) {
  return {
    title: "Ofertas de los tianguis",
    html: `<section class="live-hero"><div><p class="eyebrow">Lo que hay hoy en tu barrio</p><h1>Encuentra tu<br>próximo changarrito.</h1><p>Ofertas confirmadas por quien las vende, con precio declarado y vigencia.</p>
      <form class="live-search" id="live-search"><label class="sr" for="live-query">Buscar producto o negocio</label><input id="live-query" name="q" value="${esc(q)}" placeholder="¿Qué producto buscas?" maxlength="120"><button class="btn btn--primary" type="submit">${icon("search")}Buscar</button></form>
      <div class="live-actions"><button class="btn btn--ghost" ${goAttr("register", { role: "cliente" })}>Crear cuenta de cliente</button><button class="link" ${goAttr("demo")}>Ver ejemplo sintético</button></div><p class="small muted">Los puestos y sus usuarios los registra el gerente de cada tianguis.</p></div><div class="live-hero__art" aria-hidden="true">${fruit("avocado")}${fruit("panmuerto")}${fruit("lemon")}</div></section>
      <section class="sec"><div class="sec__head"><h2>${q ? `Resultados para “${esc(q)}”` : "Ofertas vigentes"}</h2></div><p class="small muted">Sólo se muestran ofertas publicadas y vigentes del catálogo del servidor. La vigencia de una oferta no confirma que el local esté abierto ahora.</p><div id="live-catalogue" aria-live="polite">${loading("Buscando ofertas…")}</div></section>`,
    mount(root) {
      $("#live-search", root).onsubmit = e => { e.preventDefault(); go("results", { q: inputValue(e.currentTarget, "q") }); };
      const target = $("#live-catalogue", root);
      const load = async () => {
        target.innerHTML = loading("Buscando ofertas…");
        try {
          const offers = await LiveAPI.search(q);
          if (!root.isConnected) return;
          target.innerHTML = offers.length ? `<div class="live-grid">${offers.map(o => liveOfferCard(o)).join("")}</div>` : emptyState("Aún no hay ofertas disponibles", q ? "Prueba otro producto, puesto o tianguis. Las ofertas agotadas o vencidas no aparecen aquí." : "Los gerentes registran los puestos de sus tianguis. Sus ofertas aparecerán cuando el responsable las confirme.");
        } catch (e) { if (root.isConnected) liveError(target, e, load); }
      }; load();
    }
  };
}
VIEWS.home = liveCatalogue;
VIEWS.results = liveCatalogue;
VIEWS.productSearch = liveCatalogue;

VIEWS.business = ({ id }) => ({
  title: "Detalle de oferta", cls: "main--narrow", html: `<div id="live-detail">${loading()}</div>`,
  mount(root) {
    const load = async () => {
      try {
        const offer = await LiveAPI.offer(id); if (!root.isConnected) return;
        const user = LiveAPI.currentUser();
        const location = offer.ubicacion;
        root.innerHTML = liveOfferCard(offer, false, false) + `<section class="sec"><p class="small muted">Confirmada: ${esc(liveDate(offer.confirmado_en))} (CDMX). La información la declara el comerciante.</p>
          ${location ? `<a class="btn btn--ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}" target="_blank" rel="noopener noreferrer">${icon("pin")}Cómo llegar</a>` : ""}
          ${user?.role === "cliente" ? `<form class="form sec" id="report-form">${field("report-reason", "¿Hay información incorrecta?", '<textarea id="report-reason" name="motivo" minlength="3" maxlength="300" required placeholder="Describe el problema"></textarea>')}${errorField()}<button class="btn btn--ghost" type="submit">Enviar reporte a seguridad</button></form>` : ""}</section>`;
        const report = $("#report-form", root);
        if (report) report.onsubmit = e => { e.preventDefault(); liveSubmit(report, async () => { await LiveAPI.report(id, inputValue(report, "motivo")); report.reset(); toast("Reporte enviado a seguridad"); }); };
      } catch (e) { if (root.isConnected) liveError(root, e, load); }
    }; load();
  }
});

VIEWS.login = ({ prefill = "" } = {}) => ({
  title: "Iniciar sesión", cls: "main--narrow",
  html: `<section class="auth"><header class="auth__head"><span class="roleic roleic--lg tone-turquesa">${icon("user")}</span><div><p class="eyebrow">Tu cuenta de Mi Changarrito</p><h1>Iniciar sesión</h1></div></header>
    <form class="form" id="live-login">${liveInput("email", "Correo electrónico", "email", 'autocomplete="username" required maxlength="254"', prefill)}${liveInput("password", "Contraseña", "password", 'autocomplete="current-password" required maxlength="72"')}${errorField()}<button class="btn btn--primary btn--block btn--lg" type="submit">Entrar</button></form>
    <p class="auth__alt">¿Aún no tienes cuenta? <button class="link" ${goAttr("register", { role: "cliente" })}>Crear cuenta</button></p><p class="small muted">Los perfiles de seguridad y administración los asigna el administrador del sistema.</p></section>`,
  mount(root) {
    const form = $("#live-login", root);
    form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
      await LiveAPI.login(inputValue(form, "email"), form.elements.password.value);
      form.reset(); go(PANEL[LiveAPI.currentUser().role], {}, { replace: true });
    }); };
  }
});

VIEWS.register = ({ role = "cliente" } = {}) => {
  if (role !== "cliente") return { html: emptyState("Los puestos los registra su gerente", "Crea una cuenta de cliente para buscar ofertas. Para operar un puesto necesitas la cuenta creada por el gerente de tu tianguis.") };
  const seller = role === "vendedor";
  return {
    title: "Crear cuenta", cls: "main--narrow",
    html: `<section class="auth"><p class="eyebrow">${seller ? "Para quien vende" : "Para tu barrio"}</p><h1>${seller ? "Registra tu negocio" : "Crea tu cuenta"}</h1><p>Usa datos que puedas confirmar. No se solicitan CURP, RFC ni folios.</p>
      <form class="form" id="live-register">${liveInput("nombre", "Tu nombre", "text", 'required maxlength="120" autocomplete="name"')}${liveInput("email", "Correo electrónico", "email", 'required maxlength="254" autocomplete="email"')}${liveInput("password", "Contraseña", "password", 'required minlength="8" maxlength="72" autocomplete="new-password"')}
      ${seller ? `${liveInput("nombre_negocio", "Nombre del negocio", "text", 'required maxlength="120"')}${liveInput("direccion", "Dirección o referencia del puesto", "text", 'maxlength="300"')}<div class="grid2">${liveInput("lat", "Latitud", "number", 'required min="-90" max="90" step="any"')}${liveInput("lng", "Longitud", "number", 'required min="-180" max="180" step="any"')}</div><button class="btn btn--ghost" type="button" id="use-location">${icon("pin")}Usar mi ubicación actual</button><p class="small muted" id="location-note">Revisa que las coordenadas correspondan al negocio. No inventamos una ubicación.</p>${liveInput("horario", "Horario declarado (opcional)", "text", 'maxlength="120" placeholder="Lunes a sábado, 9:00 a 18:00"')}` : ""}
      ${errorField()}<button class="btn btn--primary btn--block btn--lg" type="submit">Crear cuenta ${seller ? "de vendedor" : "de cliente"}</button></form>
      <p class="small muted">Esta cuenta permite buscar ofertas. El gerente del tianguis crea los usuarios de los puestos.</p></section>`,
    mount(root) {
      const form = $("#live-register", root);
      if (seller) $("#use-location", root).onclick = () => {
        const note = $("#location-note", root);
        if (!navigator.geolocation) { note.textContent = "La ubicación no está disponible. Escribe las coordenadas del negocio."; return; }
        note.textContent = "Consultando ubicación…";
        navigator.geolocation.getCurrentPosition(position => {
          form.elements.lat.value = position.coords.latitude; form.elements.lng.value = position.coords.longitude;
          note.textContent = "Ubicación obtenida. Comprueba que corresponde a tu negocio antes de registrarlo.";
        }, () => { note.textContent = "No se pudo obtener la ubicación. Escribe las coordenadas o vuelve a intentar."; }, { timeout: 12000 });
      };
      form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
        const email = inputValue(form, "email");
        await LiveAPI.register(role, { email, password: form.elements.password.value, nombre: inputValue(form, "nombre"), ...(seller ? {
          nombre_negocio: inputValue(form, "nombre_negocio"), ubicacion: { lat: Number(inputValue(form, "lat")), lng: Number(inputValue(form, "lng")), direccion: inputValue(form, "direccion") || null }, horario: inputValue(form, "horario")
        } : {}) });
        form.reset(); go("login", { prefill: email }, { replace: true }); toast("Cuenta creada. Inicia sesión con tu contraseña.");
      }); };
    }
  };
};

VIEWS.panelCliente = () => {
  const user = LiveAPI.currentUser();
  if (!user) return needLogin("cliente");
  return { title: "Mi cuenta", html: `<section class="sec"><p class="eyebrow">${esc(LIVE_ROLES[user.role])}</p><h1>Hola, ${esc(user.name)}</h1><p>Tu sesión está verificada por el servidor.</p><div class="live-actions"><button class="btn btn--primary" ${goAttr("home")}>Buscar ofertas vigentes</button><button class="btn btn--ghost" ${goAttr("assistant")}>${icon("sparkle")}Ayúdame con mi presupuesto</button></div></section>` };
};

VIEWS.assistant = () => {
  if (!LiveAPI.currentUser()) return needLogin("cliente");
  return {
    title: "¿Qué puedo comprar?", cls: "main--narrow",
    html: `<section class="sec"><p class="eyebrow">Compra dentro de tu presupuesto</p><h1>¿Qué estás buscando?</h1><p>Consulta las ofertas vigentes del catálogo. El modo local compara productos y presupuesto; no inventa precios ni negocios.</p><form class="form" id="recommend-form">${field("query", "Producto o pregunta", '<textarea id="query" name="query" maxlength="500" required placeholder="Busco jitomate para cocinar, tengo 100 pesos"></textarea>')}${liveInput("budget", "Presupuesto en pesos (opcional)", "number", 'min="0.01" max="1000000" step="0.01"')}${errorField()}<button class="btn btn--primary" type="submit">Buscar opciones</button></form><div id="recommend-results" class="sec" aria-live="polite"></div></section>`,
    mount(root) {
      const form = $("#recommend-form", root), target = $("#recommend-results", root);
      form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
        target.innerHTML = loading("Consultando ofertas vigentes…");
        try {
          const budget = inputValue(form, "budget");
          const result = await LiveAPI.request("/ai/recommend", { method: "POST", body: { query: inputValue(form, "query"), ...(budget ? { budget_cents: Math.round(Number(budget) * 100) } : {}) } });
          if (!root.isConnected) return;
          target.innerHTML = `<p class="eyebrow">${result.mode === "rules" ? "Modo local · recomendaciones por reglas" : "Modo " + esc(result.mode || "local")}</p><p style="white-space:pre-wrap">${esc(result.answer || result.message || "Revisa las opciones disponibles.")}</p>${(result.warnings || []).map(warning => `<p class="note note--warn">${esc(warning)}</p>`).join("")}${(result.recommendations || []).map(item => `<article class="live-offer sec"><div class="live-offer__body"><p class="eyebrow">${esc(item.negocio)}</p><h2>${esc(item.producto || item.name)}</h2><p class="price">${item.price_cents != null ? money(item.price_cents / 100) : item.precio_declarado != null ? money(item.precio_declarado) : "Precio no declarado"}${item.unidad ? `<small> / ${esc(item.unidad)}</small>` : ""}</p><button class="btn btn--ghost" ${goAttr("business", { id: item.offer_id || item.id })}>Ver oferta y vigencia</button></div></article>`).join("")}`;
        } catch (error) { target.innerHTML = ""; throw error; }
      }); };
    }
  };
};

VIEWS.panelVendedor = () => {
  if (LiveAPI.currentUser()?.role !== "vendedor") return needLogin("vendedor");
  const profile = LiveAPI.profile;
  return {
    title: "Mis ofertas",
    html: `<section class="sec"><p class="eyebrow">Panel del vendedor</p><h1>${esc(profile.nombre_negocio)}</h1><p>${esc(profile.ubicacion?.direccion || "Dirección no declarada")}</p><p class="small muted">Cada captura crea un borrador privado. Revisa los datos y confirma antes de publicar. Si editas una oferta publicada, vuelve a borrador.</p><button class="btn btn--primary" id="new-draft">${icon("camera")}Crear oferta con texto o foto</button></section><section class="sec"><h2>Mis ofertas</h2><div id="my-offers" aria-live="polite">${loading()}</div></section>`,
    mount(root) {
      $("#new-draft", root).onclick = liveCapture;
      const target = $("#my-offers", root);
      const load = async () => {
        try {
          const offers = await LiveAPI.ownOffers(); if (!root.isConnected) return;
          target.innerHTML = offers.length ? `<div class="live-grid">${offers.map(o => liveOfferCard(o, true)).join("")}</div>` : emptyState("Tu primera oferta empieza aquí", "Captura texto o una foto y revisa el borrador antes de publicarlo.");
          $$("[data-edit]", target).forEach(button => { button.onclick = () => liveReview(offers.find(o => o.id === button.dataset.edit)); });
          $$("[data-sold]", target).forEach(button => { button.onclick = async () => {
            button.disabled = true;
            try { await LiveAPI.soldOut(button.dataset.sold); toast("Oferta agotada. Ya no aparece en búsqueda."); await load(); }
            catch (e) { toast(esc(e.message)); button.disabled = false; }
          }; });
        } catch (e) { if (root.isConnected) liveError(target, e, load); }
      }; load();
    }
  };
};

function liveCapture() {
  openSheet({ title: "Capturar una oferta", html: `<form class="form" id="capture-form"><p>El texto y la foto producen un borrador para tu revisión. La captura no publica.</p><p class="note">Extracción local de texto · revisión manual. Una foto por sí sola puede dejar campos pendientes.</p>${field("capture-text", "Texto de tu oferta", '<textarea id="capture-text" name="texto" maxlength="3000" placeholder="Ej. Jitomate saladet a $28 el kg" rows="3"></textarea>')}${field("capture-photo", "Foto (JPEG, PNG o WebP, máximo 5 MB)", '<input id="capture-photo" name="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment">')}<button class="btn btn--ghost" id="read-photo" type="button">Leer texto de la foto en este dispositivo</button><p class="small muted" id="capture-note">La lectura local es opcional y procesa la foto en este dispositivo. Descarga un lector de texto al usarla. Si no está disponible, escribe o corrige los datos manualmente.</p>${errorField()}<button class="btn btn--primary btn--block" type="submit">Crear borrador y revisar</button></form>`,
    mount(root) {
      const form = $("#capture-form", root), note = $("#capture-note", root);
      $("#read-photo", root).onclick = async e => {
        const file = form.elements.foto.files[0];
        if (!file) { note.textContent = "Primero elige una foto."; return; }
        if (file.size > 5 * 1024 * 1024) { note.textContent = "La foto supera 5 MB. Elige una más pequeña."; return; }
        e.currentTarget.disabled = true; note.textContent = "Leyendo en tu dispositivo…";
        try { const text = await OCR.recognize(file); form.elements.texto.value = text; note.textContent = "Revisa y corrige el texto leído antes de crear el borrador."; }
        catch (_) { note.textContent = "No pudimos leer la foto. Conservamos tu captura; escribe los datos manualmente."; }
        finally { $("#read-photo", root).disabled = false; }
      };
      form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
        const file = form.elements.foto.files[0], text = inputValue(form, "texto");
        if (!text && !file) throw new Error("Escribe tu oferta o elige una foto.");
        if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) throw new Error("Usa una foto JPEG, PNG o WebP de máximo 5 MB.");
        const data = new FormData(); if (text) data.append("texto", text); if (file) data.append("foto", file);
        const draft = await LiveAPI.draft(data); closeSheet(true); refresh(); liveReview(draft);
      }); };
    }
  });
}

function liveReview(offer) {
  openSheet({ title: "Revisa y confirma tu oferta", html: `<form class="form" id="review-form"><p class="note note--warn">El borrador puede contener errores de extracción. Verifica cada campo. Sólo tu confirmación lo publica.</p>
    ${offer.campos_faltantes?.length ? `<p class="small">Datos pendientes: ${esc(offer.campos_faltantes.join(", "))}</p>` : ""}${offer.campos_ambiguos?.length ? `<p class="small">Datos ambiguos: ${esc(offer.campos_ambiguos.join(", "))}</p>` : ""}
    ${liveInput("negocio", "Nombre del negocio", "text", 'required maxlength="120"', offer.negocio)}${liveInput("producto", "Producto", "text", 'required maxlength="120"', offer.producto)}<div class="grid2">${liveInput("precio_declarado", "Precio declarado (MXN)", "number", 'required min="0" step="0.01"', offer.precio_declarado ?? "")}${liveInput("unidad", "Unidad", "text", 'maxlength="40" placeholder="kg, pieza, litro…"', offer.unidad)}</div>
    ${field("descripcion", "Descripción (opcional)", `<textarea id="descripcion" name="descripcion" maxlength="500">${esc(offer.descripcion)}</textarea>`)}${liveInput("horario", "Horario declarado (opcional)", "text", 'maxlength="120"', offer.horario)}${liveInput("direccion", "Dirección o referencia", "text", 'maxlength="300"', offer.ubicacion?.direccion)}<div class="grid2">${liveInput("lat", "Latitud", "number", 'required min="-90" max="90" step="any"', offer.ubicacion?.lat ?? "")}${liveInput("lng", "Longitud", "number", 'required min="-180" max="180" step="any"', offer.ubicacion?.lng ?? "")}</div>
    ${field("vigencia", "Vigencia a partir de tu confirmación", '<select id="vigencia" name="vigencia"><option value="4">4 horas</option><option value="12">12 horas</option><option value="24" selected>24 horas</option><option value="48">48 horas</option></select>')}<label class="live-check"><input name="confirmed" type="checkbox" required> Revisé los campos y confirmo que esta oferta es correcta.</label>${errorField()}<button class="btn btn--primary btn--block" type="submit">Confirmar y publicar</button><p class="small muted">Puedes cerrar esta ventana y continuar después: el borrador ya está guardado en tu panel.</p></form>`,
    mount(root) {
      const form = $("#review-form", root);
      form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
        if (!form.elements.confirmed.checked) throw new Error("Confirma que revisaste los campos antes de publicar.");
        await LiveAPI.updateOffer(offer.id, {
          negocio: inputValue(form, "negocio"), producto: inputValue(form, "producto"), precio_declarado: Number(inputValue(form, "precio_declarado")), unidad: inputValue(form, "unidad") || null,
          descripcion: inputValue(form, "descripcion") || null, horario: inputValue(form, "horario") || null,
          ubicacion: { lat: Number(inputValue(form, "lat")), lng: Number(inputValue(form, "lng")), direccion: inputValue(form, "direccion") || null }
        });
        await LiveAPI.publish(offer.id, Number(inputValue(form, "vigencia"))); closeSheet(); refresh(); toast("Oferta confirmada y publicada.");
      }); };
    }
  });
}

function liveStaff() {
  const user = LiveAPI.currentUser();
  if (!user || !["comercios", "gobierno", "gerente"].includes(user.role)) return needLogin("comercios");
  return {
    title: "Seguridad de ofertas", html: `<section class="sec"><p class="eyebrow">${esc(LIVE_ROLES[user.role])}</p><h1>Revisión de ofertas</h1><p>Acceso verificado por el servidor. Las acciones se aplican al catálogo real.</p><div id="staff-offers">${loading()}</div></section>`,
    mount(root) {
      const target = $("#staff-offers", root);
      const load = async () => {
        try {
          const offers = await LiveAPI.request("/moderation/"); if (!root.isConnected) return;
          target.innerHTML = offers.length ? offers.map(o => `<section class="sec">${liveOfferCard(o, false, false)}<p class="small">${o.reportes?.length || 0} reportes</p><button class="btn btn--ghost" data-moderate="${esc(o.id)}" data-state="${esc(o.estado)}">${o.estado === "suspendida" ? "Restablecer oferta" : "Revisar suspensión"}</button></section>`).join("") : emptyState("Sin ofertas que revisar", "Las ofertas registradas aparecerán aquí.");
          $$("[data-moderate]", target).forEach(button => { button.onclick = () => {
            const reinstating = button.dataset.state === "suspendida";
            openSheet({ title: reinstating ? "Restablecer oferta" : "Suspender oferta", html: `<form class="form" id="moderate-form">${reinstating ? '<p>La oferta recuperará su estado anterior. Si ya venció, seguirá fuera de búsqueda.</p>' : field("motivo", "Motivo de suspensión", '<textarea id="motivo" name="motivo" required minlength="3" maxlength="300"></textarea>')}${errorField()}<button class="btn btn--primary" type="submit">${reinstating ? "Confirmar restablecimiento" : "Confirmar suspensión"}</button></form>`, mount(body) {
              const form = $("#moderate-form", body); form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => { await LiveAPI.request(`/moderation/${reinstating ? "reinstate" : "suspend"}/${encodeURIComponent(button.dataset.moderate)}`, { method: "POST", ...(reinstating ? {} : { body: { motivo: inputValue(form, "motivo") } }) }); closeSheet(); load(); toast("Catálogo actualizado"); }); };
            } });
          }; });
        } catch (e) { if (root.isConnected) liveError(target, e, load); }
      }; load();
    }
  };
}
VIEWS.panelComercios = liveStaff;
VIEWS.panelGobierno = liveStaff;

VIEWS.demo = () => ({ title: "Ejemplo sintético", cls: "main--narrow", html: `<section class="sec"><p class="eyebrow">Ejemplo sintético · separado del catálogo</p><h1>Así se verá tu oferta</h1><p>Estos datos son inventados para explicar la interfaz. No son una oferta disponible, no se guardan en el servidor y no tienen una cuenta de acceso.</p><article class="live-offer"><div class="live-offer__art" style="background-color:${ART_TINT.avocado}">${fruit("avocado")}</div><div class="live-offer__body"><p class="eyebrow">Negocio de ejemplo</p><h2>Aguacate de ejemplo</h2><p class="price">$78<small>/kg</small></p><p>Precio y producto sintéticos. Vigencia y ubicación por confirmar.</p></div></article><button class="btn btn--primary" ${goAttr("home")}>Volver al catálogo real</button></section>` });

boot = async function () {
  app.innerHTML = topbar() + `<main class="main">${loading("Comprobando sesión…")}</main>`;
  try { await LiveAPI.restore(); }
  catch (error) { toast(esc(error.status === 401 ? "Tu sesión venció. Puedes iniciar sesión de nuevo." : error.message)); }
  const user = LiveAPI.currentUser();
  if (user) stack.push({ name: PANEL[user.role], params: {} });
  else if (/[?&]v=producto/.test(location.search)) stack.push({ name: "productSearch", params: {} });
  if (HIST) { try { history.replaceState({ d: 1 }, ""); } catch (_) { } if (stack.length > 1) push(); }
  render();
  setInterval(() => {
    const view = stack[stack.length - 1].name;
    const busy = $(".sheet") || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (!busy && ["home", "results", "productSearch", "business", "panelVendedor"].includes(view)) refresh();
  }, 60000);
};
