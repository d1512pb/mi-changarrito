/* Paneles: vendedor (inventario con cámara/OCR, horarios, mensajes, opiniones),
 * administrador de comercios y administrador de gobierno. */

/* ================= Panel del vendedor ================= */
let simMsgTimer = null, simMsgDone = false;

VIEWS.panelVendedor = () => {
  const u = Store.currentUser();
  if (!u || u.role !== "vendedor") return needLogin("vendedor");
  const b = Store.biz(u.bizId);
  const st = Store.status(b);
  const ds = Store.dstr();
  const log = (b.logs && b.logs[ds]) || { in: null, out: null, pauses: [] };
  const threads = Store.threadsForBiz(b.id);
  const unread = threads.reduce((s, t) => s + t.unreadVendor, 0);
  const lastMsg = threads[0] && threads[0].msgs[threads[0].msgs.length - 1];
  const avg = Store.avgStars(b);
  const m = Store.nowMins();
  const scheduledToday = b.schedule.days.includes(new Date().getDay());
  const pauseRows = (log.pauses || []).map((p, i) => {
    const s = Store.hm(p.start), e = Store.hm(p.end);
    const state = m >= e ? ["done", "Terminada"] : m >= s ? ["on", "En curso"] : ["next", "Programada"];
    return `<li class="pz pz--${state[0]}"><span>${icon("pause")}<b>${p.start}–${p.end}</b></span><span class="muted">${state[1]}</span>${state[0] !== "done" ? `<button class="link" data-unpause="${i}">${state[0] === "on" ? "Terminar ahora" : "Cancelar"}</button>` : ""}</li>`;
  }).join("");
  const t = b.tianguisId && Store.tianguis(b.tianguisId);
  return {
    title: "Panel del vendedor",
    html: `<section class="vhead">
      ${bizArt(b, "vhead__art")}
      <div class="vhead__main"><p class="eyebrow">Panel del vendedor</p><h1>${esc(b.name)}</h1>
        <p class="vhead__meta">${catTag(b.category)}<span>${t ? esc(t.name) : `${esc(b.colonia)}, ${esc(b.alcaldia)}`}</span></p></div>
      <div class="vhead__st"><span class="muted small">Así te ven los clientes</span>${statusPill(st)}<span class="small">${esc(st.detail)}</span></div>
    </section>
    ${b.status === "pending" ? `<p class="note note--warn">${icon("shield")}Tu puesto está en revisión. Aparecerá en las búsquedas cuando el administrador de comercios de ${esc(t.name)} lo apruebe.</p>` : ""}
    ${b.status === "rejected" ? `<p class="note note--bad">${icon("x")}El administrador de comercios no aprobó tu registro. Comunícate con la mesa de tu tianguis para revisar los datos.</p>` : ""}
    <div class="vgrid">
      <section class="pcard">
        <header class="pcard__h"><h2>${icon("clock")}Registro del día</h2><span class="muted small">${fmtLong(new Date())}</span></header>
        ${!scheduledToday ? `<p class="small muted">Hoy no está en tu horario (${esc(Store.scheduleText(b))}), pero puedes registrar si abriste.</p>` : ""}
        <label class="check"><input type="checkbox" id="chk-open" ${log.in ? "checked" : ""}><span class="check__box">${icon("check")}</span>
          <span><b>Negocio abierto</b><small>${log.in ? `Llegada registrada a las <b>${log.in}</b>` : "Márcalo al llegar: guardamos tu hora de llegada"}</small></span></label>
        <label class="check ${!log.in ? "is-off" : ""}"><input type="checkbox" id="chk-close" ${log.out ? "checked" : ""} ${!log.in ? "disabled" : ""}><span class="check__box">${icon("check")}</span>
          <span><b>Negocio cerrado</b><small>${log.out ? `Salida registrada a las <b>${log.out}</b>` : "Márcalo al irte: guardamos tu hora de salida"}</small></span></label>
        <div class="pausebox">
          ${pauseRows ? `<ul class="pzlist">${pauseRows}</ul>` : ""}
          <button class="btn btn--mostaza btn--block" id="btn-pause" ${log.out ? "disabled" : ""}>${icon("pause")}Haré una pausa</button>
        </div>
      </section>
      <section class="pcard">
        <header class="pcard__h"><h2>${icon("users")}Tus clientes</h2></header>
        <button class="bigbtn" ${goAttr("vendorMessages")}><span class="bigbtn__ic tone-cereza">${icon("msg")}${unread ? `<span class="count">${unread}</span>` : ""}</span>
          <span><b>Mensajes de clientes</b><small>${unread ? `${unread} sin leer · ` : ""}${lastMsg ? `Último: ${fmtDay(lastMsg.ts)}, ${fmtTime(lastMsg.ts)}` : "Sin mensajes todavía"}</small></span>${icon("chev")}</button>
        <button class="bigbtn" ${goAttr("vendorReviews")}><span class="bigbtn__ic tone-mostaza">${icon("star")}</span>
          <span><b>Opiniones de los usuarios</b><small>${b.reviews.length ? `${avg.toFixed(1)} de 5 · ${b.reviews.length} opiniones` : "Aún no tienes opiniones"}</small></span>${icon("chev")}</button>
      </section>
      <section class="pcard pcard--wide">
        <header class="pcard__h"><h2>${icon("huacal")}Mis productos</h2><span class="muted small">${b.products.length} registrados</span></header>
        <button class="camerabtn" id="btn-cam"><span class="camerabtn__ic">${icon("camera")}</span><span><b>Tomar foto de producto nuevo</b><small>Leemos el nombre, el precio y la unidad de tu cartulina</small></span></button>
        ${b.products.length ? `<div class="inv">${b.products.map(p => `<article class="inv__i">${productArt(p, b, "inv__art")}<div class="inv__main"><b>${esc(p.name)}</b>${p.desc ? `<small>${esc(p.desc)}</small>` : ""}<span>${priceTag(p, true)}</span></div>
          <div class="inv__act"><button class="iconbtn iconbtn--plain" data-edit="${p.id}" aria-label="Editar ${esc(p.name)}">${icon("edit")}</button><button class="iconbtn iconbtn--plain" data-del="${p.id}" aria-label="Eliminar ${esc(p.name)}">${icon("trash")}</button></div></article>`).join("")}</div>`
          : `<p class="muted">Aún no tienes productos. Mientras tanto, los clientes ven las fotos de tu negocio.</p>`}
      </section>
    </div>`,
    mount(root) {
      const chkO = $("#chk-open", root), chkC = $("#chk-close", root);
      chkO.onchange = () => {
        if (chkO.checked) { Store.setTodayLog(b, { in: Store.nowHM() }); toast(`Llegada registrada a las ${Store.nowHM()}. Ya apareces como abierto.`, { icon: "check", tone: "turquesa" }); }
        else { Store.setTodayLog(b, { in: null, out: null, pauses: [] }); toast("Quitaste el registro de llegada de hoy."); }
        refresh();
      };
      chkC.onchange = () => {
        if (chkC.checked) { Store.setTodayLog(b, { out: Store.nowHM() }); toast(`Salida registrada a las ${Store.nowHM()}. Apareces como cerrado.`, { icon: "door" }); }
        else { Store.setTodayLog(b, { out: null }); toast("Volviste a aparecer como abierto."); }
        refresh();
      };
      $("#btn-pause", root).onclick = () => openPause(b);
      $$("[data-unpause]", root).forEach(x => x.onclick = () => {
        const l = b.logs[Store.dstr()], i = +x.dataset.unpause, p = l.pauses[i];
        if (Store.nowMins() >= Store.hm(p.start)) p.end = Store.nowHM(); else l.pauses.splice(i, 1);
        Store.save(); refresh();
      });
      $("#btn-cam", root).onclick = () => openCamera(b);
      $$("[data-edit]", root).forEach(x => x.onclick = () => openProductForm(b, { product: b.products.find(p => p.id === x.dataset.edit) }));
      $$("[data-del]", root).forEach(x => x.onclick = () => {
        if (x.classList.contains("is-confirm")) { b.products = b.products.filter(p => p.id !== x.dataset.del); Store.save(); refresh(); toast("Producto eliminado"); return; }
        x.classList.add("is-confirm"); x.innerHTML = "¿Eliminar?"; x.setAttribute("aria-label", "Confirmar eliminación");
        setTimeout(() => { if (x.isConnected) { x.classList.remove("is-confirm"); x.innerHTML = icon("trash"); } }, 3500);
      });
      scheduleSimMessage(b);
    }
  };
};

function openPause(b) {
  const now = Store.nowMins();
  const start = Store.fmtHM(now), end = Store.fmtHM(Math.min(now + 30, 23 * 60 + 59));
  openSheet({
    title: "Haré una pausa",
    html: `<form class="form" id="pzForm" novalidate>
      <p class="muted">Indica cuándo te ausentas hoy. Mientras dure la pausa los clientes verán “En pausa” y la hora en que regresas.</p>
      <div class="grid2">${field("pz-s", "Inicio", `<input id="pz-s" type="time" value="${start}">`, "", true)}${field("pz-e", "Regreso", `<input id="pz-e" type="time" value="${end}">`, "", true)}</div>
      <div class="chips">${[15, 30, 45, 60].map(n => `<button type="button" class="chip" data-min="${n}">${n} min</button>`).join("")}</div>
      <button class="btn btn--mostaza btn--block btn--lg" type="submit">${icon("pause")}Registrar pausa</button></form>`,
    mount(body) {
      const f = $("#pzForm", body);
      $$("[data-min]", body).forEach(c => c.onclick = () => { $("#pz-e", f).value = Store.fmtHM(Math.min(Store.hm($("#pz-s", f).value) + +c.dataset.min, 23 * 60 + 59)); });
      f.onsubmit = e => {
        e.preventDefault();
        const s = $("#pz-s", f).value, en = $("#pz-e", f).value;
        if (!setErr(f, "pz-e", s && en && Store.hm(en) > Store.hm(s) ? "" : "La hora de regreso debe ser después del inicio.")) return;
        const l = b.logs[Store.dstr()] || {};
        if (!l.in && Store.hm(s) <= Store.nowMins()) Store.setTodayLog(b, { in: s });
        const log = Store.setTodayLog(b, {});
        log.pauses = (log.pauses || []).concat({ start: s, end: en }); Store.save();
        closeSheet(); refresh();
        toast(`Pausa registrada de ${s} a ${en}. Los clientes lo verán en tu ficha.`, { icon: "pause", tone: "mostaza" });
      };
    }
  });
}

function scheduleSimMessage(b) {
  if (simMsgDone || simMsgTimer || !b.simulated && !b.ownerAccount) return;
  simMsgTimer = setTimeout(() => {
    simMsgDone = true;
    const t = Store.threadFor(b.id, "x-sofia", "Sofía Ramos");
    Store.send(t, "client", "Hola, ¿todavía tiene cilantro? Quiero 3 manojos, paso en media hora.");
    notifyVendor("Sofía Ramos", t.msgs[t.msgs.length - 1].text, t.id);
  }, CFG.SIMULATE_NEW_MESSAGE_MS);
}
function notifyVendor(name, text, threadId) {
  const v = stack[stack.length - 1].name;
  if (v === "panelVendedor" || v === "vendorMessages") refresh();
  if (v === "vendorChat" && stack[stack.length - 1].params.id === threadId) { refresh(); return; }
  toast(`<b>Nuevo mensaje de ${esc(name)}</b>`, { icon: "bell", tone: "cereza", action: "Ver", onAction: () => go("vendorChat", { id: threadId }), ms: 7000 });
  try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(`Mensaje de ${name}`, { body: text, icon: "icons/icon-192.png", tag: threadId }); } catch (e) { }
}

/* ---------- Cámara + OCR ---------- */
function openCamera(b) {
  let stream = null;
  const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  openSheet({
    title: "Tomar foto de producto nuevo",
    onClose: stop,
    html: `<div class="cam">
      <div class="cam__view" id="camView"><video id="camVideo" playsinline muted></video>
        <div class="cam__frame" aria-hidden="true"></div>
        <p class="cam__msg" id="camMsg">Abriendo la cámara…</p></div>
      <p class="small muted">Encuadra la cartulina o etiqueta del producto con el precio bien visible.</p>
      <div class="cam__btns">
        <button class="btn btn--primary btn--lg" id="camShot" disabled>${icon("camera")}Tomar foto</button>
        <label class="btn btn--ghost"><input type="file" accept="image/*" capture="environment" id="camFile" class="sr">${icon("image")}Usar foto del teléfono</label>
        <button class="btn btn--ghost" id="camSample" type="button">${icon("sparkle")}Probar con cartulina de ejemplo</button>
      </div></div>`,
    mount(body) {
      const video = $("#camVideo", body), msg = $("#camMsg", body), shot = $("#camShot", body);
      OCR.startCamera(video).then(s => { stream = s; msg.hidden = true; shot.disabled = false; })
        .catch(() => { msg.textContent = "No pudimos abrir la cámara aquí. Usa una foto del teléfono o prueba con la cartulina de ejemplo."; $("#camView", body).classList.add("is-off"); });
      shot.onclick = () => { const src = OCR.snap(video); stop(); analyze(b, src); };
      $("#camFile", body).onchange = async e => { const f = e.target.files[0]; if (!f) return; stop(); analyze(b, await OCR.fileToDataUrl(f)); };
      let sampleN = 0;
      $("#camSample", body).onclick = () => { stop(); const s = OCR.sampleImage(sampleN++); analyze(b, s.dataUrl, s.text); };
    }
  });
}

async function analyze(b, src, knownText) {
  const sheet = openSheet({
    title: "Leyendo la etiqueta",
    html: `<div class="reading"><img src="${src}" alt="Foto del producto"><div class="scanline" aria-hidden="true"></div></div>
      <div class="progress"><span id="ocrBar"></span></div><p class="muted" id="ocrMsg" aria-live="polite">Buscando nombre, precio y unidad…</p>`
  });
  const bar = $("#ocrBar", sheet), msg = $("#ocrMsg", sheet);
  let parsed = null, note = "";
  try {
    let text;
    if (knownText) { for (let p = 0; p <= 1; p += .2) { bar.style.width = p * 100 + "%"; await new Promise(r => setTimeout(r, 160)); } text = knownText; }
    else text = await OCR.recognize(src, p => { bar.style.width = Math.round(p * 100) + "%"; });
    parsed = OCR.parse(text);
    note = parsed.price ? "Revisa los datos que leímos de tu foto y corrígelos si hace falta." : "Leímos la foto pero no encontramos un precio claro. Escríbelo abajo.";
  } catch (e) {
    parsed = { name: "", price: null, unit: "" };
    note = e.message === "ocr-unavailable" ? "La lectura automática no está disponible en esta vista. Escribe los datos del producto." : "No pudimos leer la etiqueta. Escribe los datos del producto.";
  }
  if (!$(".sheet")) return; // la persona cerró la hoja
  if (msg) msg.textContent = "Listo";
  const photo = await OCR.shrink(src, 640);
  openProductForm(b, { parsed, photo, note });
}

function openProductForm(b, { product, parsed, photo, note }) {
  const p = product || { name: parsed.name, price: parsed.price, unit: parsed.unit || "kg", desc: "", photo };
  const fromOcr = !!parsed;
  openSheet({
    title: product ? "Editar producto" : "Confirma tu producto",
    html: `<form class="form" id="pfForm" novalidate>
      <div class="pf__top">${p.photo ? `<img class="pf__img" src="${p.photo}" alt="">` : productArt(p, b, "pf__img")}
        ${note ? `<p class="note ${parsed && parsed.price ? "note--ok" : "note--warn"}">${icon(parsed && parsed.price ? "sparkle" : "edit")}${note}</p>` : ""}</div>
      ${field("pf-name", "Nombre del producto", `<input id="pf-name" type="text" value="${esc(p.name)}" placeholder="Ej. Jitomate saladet">`, fromOcr && parsed.name ? "Leído de la foto" : "", true)}
      <div class="grid2">
        ${field("pf-price", "Precio", `<div class="money-in money-in--sm"><span aria-hidden="true">$</span><input id="pf-price" type="number" inputmode="decimal" min="0" step="0.5" value="${p.price ?? ""}"></div>`, fromOcr && parsed.price ? "Leído de la foto" : "", true)}
        ${field("pf-unit", "Unidad", `<select id="pf-unit">${options(UNITS, p.unit)}</select>`, fromOcr && parsed.unit ? "Leída de la foto" : "", true)}
      </div>
      ${field("pf-desc", "Descripción", `<textarea id="pf-desc" rows="2" maxlength="160" placeholder="Ej. Maduro para hoy, de Michoacán">${esc(p.desc)}</textarea>`)}
      <button class="btn btn--primary btn--block btn--lg" type="submit">${product ? "Guardar cambios" : "Publicar producto"}</button></form>`,
    mount(body) {
      const f = $("#pfForm", body);
      f.onsubmit = e => {
        e.preventDefault();
        const name = $("#pf-name", f).value.trim(), price = parseFloat($("#pf-price", f).value);
        let ok = setErr(f, "pf-name", name.length >= 2 ? "" : "Escribe el nombre del producto.");
        ok = setErr(f, "pf-price", price > 0 ? "" : "Escribe un precio mayor a $0.") && ok;
        if (!ok) return firstError(f);
        const data = { name, price, unit: $("#pf-unit", f).value, desc: $("#pf-desc", f).value.trim() };
        if (product) Object.assign(product, data);
        else b.products.unshift({ id: "p" + Date.now().toString(36), key: Store.norm(name).split(" ")[0], photo: p.photo || null, ...data });
        Store.save(); closeSheet(); refresh();
        toast(product ? "Cambios guardados" : `${esc(name)} ya aparece en tu catálogo`, { icon: "check", tone: "turquesa" });
      };
    }
  });
}

/* ---------- Mensajes y opiniones ---------- */
VIEWS.vendorMessages = () => {
  const u = Store.currentUser(); if (!u || u.role !== "vendedor") return needLogin("vendedor");
  const threads = Store.threadsForBiz(u.bizId);
  const canNotify = "Notification" in window && Notification.permission === "default";
  return {
    title: "Mensajes de clientes",
    html: `<header class="phead"><span class="phead__ic tone-cereza">${icon("msg")}</span><div><p class="eyebrow">Panel del vendedor</p><h1>Mensajes de clientes</h1></div></header>
    ${canNotify ? `<div class="note">${icon("bell")}<span>Activa los avisos para enterarte de mensajes nuevos aunque tengas la app cerrada.</span><button class="btn btn--sm btn--ghost" id="notifOn">Activar avisos</button></div>` : ""}
    ${threads.length ? `<div class="list">${threads.map(t => { const m = t.msgs[t.msgs.length - 1]; return `<button class="row ${t.unreadVendor ? "is-unread" : ""}" ${goAttr("vendorChat", { id: t.id })}>
      <span class="avatar">${esc(initials(t.clientName))}</span>
      <span class="row__main"><b>${esc(t.clientName)}</b><small>${m.from === "vendor" ? "Tú: " : ""}${esc(m.text)}</small></span>
      <span class="row__meta"><span>${fmtDay(m.ts)}</span><span>${fmtTime(m.ts)}</span>${t.unreadVendor ? `<span class="count count--inline">${t.unreadVendor}</span>` : ""}</span></button>`; }).join("")}</div>`
      : emptyState("Sin mensajes todavía", "Cuando un cliente te escriba desde tu ficha, aparecerá aquí con la fecha y la hora.", "")}`,
    mount(root) {
      const n = $("#notifOn", root);
      if (n) n.onclick = () => Notification.requestPermission().then(p => { toast(p === "granted" ? "Avisos activados" : "No se activaron los avisos"); refresh(); });
    }
  };
};
VIEWS.vendorChat = ({ id }) => {
  const t = Store.thread(id); const b = Store.biz(t.bizId);
  t.unreadVendor = 0; Store.save();
  return {
    title: t.clientName, cls: "main--chat",
    html: `<header class="chat__head"><span class="avatar avatar--lg">${esc(initials(t.clientName))}</span><div><h1>${esc(t.clientName)}</h1><p class="muted small">Cliente · primera consulta ${fmtDay(t.msgs[0].ts)}, ${fmtTime(t.msgs[0].ts)}</p></div></header>
    <div class="chat__log" id="log">${chatHtml(t, "vendor", null)}</div>
    <div class="chips chips--scroll">${["Sí hay, se lo aparto.", "Ya se terminó, disculpe.", "Estamos abiertos hasta las " + b.schedule.close + ".", "¿A qué hora pasa?"].map(q => `<button class="chip" data-quick="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    <form class="composer" id="cmp"><label class="sr" for="cmp-t">Respuesta</label><textarea id="cmp-t" rows="1" placeholder="Escribe tu respuesta"></textarea><button class="btn btn--primary btn--icon" type="submit" aria-label="Enviar">${icon("send")}</button></form>`,
    mount(root) {
      const log = $("#log", root), ta = $("#cmp-t", root);
      const paint = () => { log.innerHTML = chatHtml(t, "vendor", null); log.scrollTop = log.scrollHeight; window.scrollTo(0, document.body.scrollHeight); };
      paint();
      $$("[data-quick]", root).forEach(c => c.onclick = () => { ta.value = c.dataset.quick; ta.focus(); });
      ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#cmp", root).requestSubmit(); } });
      $("#cmp", root).onsubmit = e => { e.preventDefault(); const text = ta.value.trim(); if (!text) return; Store.send(t, "vendor", text); ta.value = ""; paint(); };
    }
  };
};
VIEWS.vendorReviews = () => {
  const u = Store.currentUser(); if (!u || u.role !== "vendedor") return needLogin("vendedor");
  const b = Store.biz(u.bizId), avg = Store.avgStars(b);
  const dist = [5, 4, 3, 2, 1].map(s => ({ s, n: b.reviews.filter(r => r.stars === s).length }));
  return {
    title: "Opiniones",
    html: `<header class="phead"><span class="phead__ic tone-mostaza">${icon("star")}</span><div><p class="eyebrow">Panel del vendedor</p><h1>Opiniones de los usuarios</h1></div></header>
    ${b.reviews.length ? `<section class="rsum"><div class="rsum__big"><b>${avg.toFixed(1)}</b>${stars(avg)}<small>${b.reviews.length} opiniones</small></div>
      <div class="rsum__dist">${dist.map(d => `<div class="dist"><span>${d.s} ${icon("star")}</span><span class="dist__t"><span style="width:${(d.n / b.reviews.length) * 100}%"></span></span><span class="tnum">${d.n}</span></div>`).join("")}</div></section>
      <div class="reviews reviews--col">${[...b.reviews].sort((a, c) => c.ts - a.ts).map(r => `<article class="review">${stars(r.stars)}<p>${esc(r.text)}</p><small>${esc(r.client)} · ${fmtDate(r.ts)}</small></article>`).join("")}</div>`
      : emptyState("Aún no tienes opiniones", "Cuando tus clientes califiquen tu negocio, verás aquí sus comentarios.", "")}`
  };
};

/* ================= Analítica compartida ================= */
function kpi(label, value, sub = "", tone = "") { return `<div class="kpi ${tone ? "tone-" + tone : ""}"><span class="kpi__l">${label}</span><b class="kpi__v tnum">${value}</b>${sub ? `<span class="kpi__s">${sub}</span>` : ""}</div>`; }
function pctTone(p) { return p == null ? "" : p >= 80 ? "ok" : p >= 60 ? "warn" : "bad"; }
function priceRangeTable(stats) {
  return `<div class="tablewrap"><table class="tbl tbl--prices"><thead><tr><th scope="col">Producto</th><th scope="col" class="num">Promedio</th><th scope="col">Rango de costos</th><th scope="col" class="num">Puestos</th></tr></thead><tbody>
    ${stats.map(s => {
      const top = s.max * 1.15 || 1;
      return `<tr><th scope="row">${esc(cap(keyLabel(s.key)))} <span class="muted">/${esc(unitText(s.unit))}</span></th><td class="num"><b>${money(Math.round(s.avg * 10) / 10)}</b></td>
      <td><div class="range" role="img" aria-label="De ${money(s.min)} a ${money(s.max)}, promedio ${money(Math.round(s.avg))}"><span class="range__bar" style="left:${(s.min / top) * 100}%;width:${Math.max(1.5, ((s.max - s.min) / top) * 100)}%"></span><span class="range__avg" style="left:${(s.avg / top) * 100}%"></span></div>
        <span class="range__lbl tnum">${money(s.min)} – ${money(s.max)}</span></td><td class="num tnum">${s.bizCount}</td></tr>`;
    }).join("")}</tbody></table></div><p class="small muted">Cada barra va de $0 al precio más alto de ese producto; el punto marca el promedio.</p>`;
}
function complianceBars(list) {
  return `<div class="bars">${list.map(({ b, c }) => `<div class="hbar"><span class="hbar__l">${esc(b.name)}</span>
    <span class="hbar__t"><span class="hbar__f ${pctTone(c.pct)}" style="width:${c.pct ?? 0}%"></span></span>
    <span class="hbar__v tnum">${c.pct == null ? "—" : c.pct + "%"}</span>
    <span class="hbar__s">${c.total ? `${c.ok} de ${c.total} días · retardo prom. ${c.avgLate} min` : "Sin días evaluados"}</span></div>`).join("")}</div>`;
}
function tabs(view, params, list) {
  return `<div class="tabs" role="tablist">${list.map(([k, l, ic]) => `<button class="tab ${params.tab === k ? "is-on" : ""}" role="tab" aria-selected="${params.tab === k}" data-tab="${k}">${icon(ic)}${l}</button>`).join("")}</div>`;
}
function bindTabs(root, view, params) { $$("[data-tab]", root).forEach(t => t.onclick = () => go(view, Object.assign({}, params, { tab: t.dataset.tab }), { replace: true })); }
const LOG_CHIP = { ok: "ok", late: "warn", early: "warn", absent: "bad", pending: "", off: "" };

/* ================= Administrador de comercios ================= */
VIEWS.panelComercios = (params) => {
  const u = Store.currentUser(); if (!u || u.role !== "comercios") return needLogin("comercios");
  params.tab = params.tab || "validacion";
  const tg = Store.tianguis(u.tianguisId);
  const all = Store.filterBiz({ tianguis: tg.id, includePending: true });
  const pending = all.filter(b => b.status === "pending");
  const active = all.filter(b => b.status === "approved");
  let body = "";
  if (params.tab === "validacion") {
    const decided = Store.db.decisions.filter(d => all.some(b => b.id === d.bizId)).slice(0, 6);
    body = pending.length ? `<div class="vlist">${pending.map(b => `<article class="vcard" id="vc-${b.id}">
        <header class="vcard__h">${bizArt(b, "vcard__art")}<div><h3>${esc(b.name)}</h3><p>${catTag(b.category)} <span class="muted small">Solicitó ${fmtDate(b.createdAt)}</span></p></div></header>
        <dl class="dl">
          <div><dt>Propietario</dt><dd>${esc(b.owner)}</dd></div><div><dt>CURP</dt><dd class="mono">${esc(b.curp)}</dd></div>
          <div><dt>RFC</dt><dd class="mono">${esc(b.rfc)}</dd></div><div><dt>Trabajadores</dt><dd>${b.workers}</dd></div>
          <div><dt>Horario</dt><dd>${esc(Store.scheduleText(b))}</dd></div><div><dt>Ubicación</dt><dd>${esc(b.address)}</dd></div>
          <div><dt>Terminal bancaria</dt><dd>${b.card ? "Sí" : "No"}</dd></div><div><dt>Contacto</dt><dd>${esc(b.phone || "—")} ${b.socials ? "· " + esc(b.socials) : ""}</dd></div>
        </dl>
        ${b.description ? `<p class="vcard__d">${esc(b.description)}</p>` : ""}
        ${b.photos.length ? `<div class="thumbs">${b.photos.map(p => `<figure class="thumb"><img src="${p}" alt=""></figure>`).join("")}</div>` : ""}
        <div class="vcard__a"><button class="btn btn--teal" data-accept="${b.id}">${icon("check")}Aceptar puesto</button><button class="btn btn--danger" data-reject="${b.id}">${icon("x")}Rechazar</button></div>
      </article>`).join("")}</div>`
      : emptyState("No hay solicitudes pendientes", `Cuando un vendedor registre un puesto en ${esc(tg.name)}, aparecerá aquí para que lo revises.`, "");
    if (decided.length) body += `<section class="sec"><h2 class="h3">Decisiones recientes</h2><div class="list">${decided.map(d => { const b = Store.biz(d.bizId); return `<div class="row row--static"><span class="row__ic tone-${d.accept ? "turquesa" : "tierra"}">${icon(d.accept ? "check" : "x")}</span><span class="row__main"><b>${esc(b.name)}</b><small>${d.accept ? "Aceptado" : "Rechazado"} el ${fmtDate(d.ts)} a las ${fmtTime(d.ts)}</small></span></div>`; }).join("")}</div></section>`;
  }
  if (params.tab === "horarios") {
    const date = params.date || Store.dstr();
    const dates = Array.from({ length: 14 }, (_, i) => Store.addDays(Store.dstr(), -i));
    const rows = active.map(b => ({ b, log: Store.getLog(b, date), p: Store.punctuality(b, date) })).filter(r => r.p.code !== "off");
    const order = { absent: 0, late: 1, early: 2, pending: 3, ok: 4 };
    rows.sort((a, c) => order[a.p.code] - order[c.p.code]);
    body = `<div class="toolbar">${field("hr-date", "Día", `<select id="hr-date">${options(dates.map(d => [d, fmtLong(Store.parseD(d))]), date)}</select>`)}
      <p class="muted small">${rows.length} puestos con horario ese día · ${rows.filter(r => r.p.code === "ok").length} puntuales</p></div>
      ${rows.length ? `<div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Vendedor</th><th scope="col">Horario</th><th scope="col" class="num">Llegada</th><th scope="col" class="num">Salida</th><th scope="col">Pausas</th><th scope="col">Estado</th></tr></thead><tbody>
      ${rows.map(({ b, log, p }) => `<tr><th scope="row">${esc(b.name)}<small class="muted">${esc(b.owner)}</small></th><td class="tnum">${b.schedule.open}–${b.schedule.close}</td>
        <td class="num tnum">${log && log.in ? log.in : "—"}</td><td class="num tnum">${log && log.out ? log.out : log && log.in ? "Abierto" : "—"}</td>
        <td class="tnum small">${log && log.pauses && log.pauses.length ? log.pauses.map(x => `${x.start}–${x.end}`).join(", ") : "—"}</td>
        <td><span class="chip-s ${LOG_CHIP[p.code]}">${p.label}</span></td></tr>`).join("")}</tbody></table></div>`
        : emptyState("Ningún puesto trabaja ese día", "Elige otro día para ver llegadas y salidas.", "")}`;
  }
  if (params.tab === "reportes") {
    const stats = Store.productStats(active);
    const comp = active.map(b => ({ b, c: Store.compliance(b) })).sort((a, c) => (c.c.pct ?? -1) - (a.c.pct ?? -1));
    const evaluated = comp.filter(x => x.c.pct != null);
    const avgComp = evaluated.length ? Math.round(evaluated.reduce((s, x) => s + x.c.pct, 0) / evaluated.length) : null;
    body = `<div class="kpis">${kpi("Puestos activos", active.length, `${pending.length} en revisión`)}${kpi("Cumplimiento de horario", avgComp == null ? "—" : avgComp + "%", "Últimos 14 días", pctTone(avgComp) === "bad" ? "cereza" : "")}${kpi("Productos con precio", stats.reduce((s, x) => s + x.n, 0), `${stats.length} productos distintos`)}</div>
      <section class="sec"><div class="sec__head"><h2>Precios promedio del tianguis</h2></div>${stats.length ? priceRangeTable(stats) : `<p class="muted">Aún no hay productos registrados.</p>`}</section>
      <section class="sec"><div class="sec__head"><h2>Cumplimiento de horarios</h2><span class="muted small">Puntual = llega máximo 15 min tarde y no se va más de 15 min antes</span></div>${complianceBars(comp)}</section>`;
  }
  return {
    title: "Administrador de comercios",
    html: `<header class="phead"><span class="phead__ic tone-mostaza">${icon("board")}</span><div><p class="eyebrow">Administrador de comercios · ${esc(u.folio)}</p><h1>${esc(tg.name)}</h1><p class="muted">${esc(tg.colonia)}, ${esc(tg.alcaldia)} · ${esc(tg.days)}</p></div></header>
    ${tabs("panelComercios", params, [["validacion", `Validación${pending.length ? ` <span class="count count--inline">${pending.length}</span>` : ""}`, "shield"], ["horarios", "Horarios", "clock"], ["reportes", "Reportes", "chart"]])}
    <div class="tabbody">${body}</div>`,
    mount(root) {
      bindTabs(root, "panelComercios", params);
      const d = $("#hr-date", root); if (d) d.onchange = () => go("panelComercios", Object.assign({}, params, { date: d.value }), { replace: true });
      $$("[data-accept]", root).forEach(x => x.onclick = () => { Store.decide(x.dataset.accept, true, u.id); toast(`${esc(Store.biz(x.dataset.accept).name)} ya aparece en las búsquedas`, { icon: "check", tone: "turquesa" }); refresh(); });
      $$("[data-reject]", root).forEach(x => x.onclick = () => {
        if (!x.classList.contains("is-confirm")) { x.classList.add("is-confirm"); x.innerHTML = `${icon("x")}Confirmar rechazo`; return; }
        Store.decide(x.dataset.reject, false, u.id); toast("Solicitud rechazada", { icon: "x", tone: "tierra" }); refresh();
      });
    }
  };
};

/* ================= Administrador de gobierno ================= */
VIEWS.panelGobierno = (params) => {
  const u = Store.currentUser(); if (!u || u.role !== "gobierno") return needLogin("gobierno");
  params.tab = params.tab || "negocios";
  const all = Store.db.businesses;
  const approved = all.filter(b => b.status === "approved");
  const comps = approved.map(b => Store.compliance(b)).filter(c => c.pct != null);
  const cityComp = comps.length ? Math.round(comps.reduce((s, c) => s + c.pct, 0) / comps.length) : null;
  const alcs = [...new Set(all.map(b => b.alcaldia))].sort();
  let body = "";
  if (params.tab === "negocios") {
    body = `<div class="toolbar toolbar--grid">
        ${field("gv-q", "Buscar", `<input id="gv-q" type="search" placeholder="Negocio, propietario, RFC o CURP">`)}
        ${field("gv-alc", "Alcaldía", `<select id="gv-alc">${options(alcs, "", "Todas")}</select>`)}
        ${field("gv-st", "Estatus", `<select id="gv-st">${options([["approved", "Aprobado"], ["pending", "En revisión"], ["rejected", "Rechazado"]], "", "Todos")}</select>`)}
      </div>
      <div class="tablewrap"><table class="tbl tbl--click" id="gvTable"><thead><tr><th scope="col">Negocio</th><th scope="col">Alcaldía</th><th scope="col">Formato</th><th scope="col">Categoría</th><th scope="col">Alta</th><th scope="col" class="num">Cumplimiento</th><th scope="col">Estatus</th></tr></thead><tbody>
      ${[...all].sort((a, c) => a.alcaldia.localeCompare(c.alcaldia) || a.name.localeCompare(c.name)).map(b => { const c = Store.compliance(b); return `<tr data-row="${b.id}" data-alc="${esc(b.alcaldia)}" data-st="${b.status}" data-s="${esc(Store.norm([b.name, b.owner, b.rfc, b.curp, b.colonia].join(" ")))}" tabindex="0">
        <th scope="row">${esc(b.name)}<small class="muted">${esc(b.owner)}</small></th><td>${esc(b.alcaldia)}<small class="muted">${esc(b.colonia)}</small></td>
        <td>${b.format === "tianguis" ? "Tianguis" : "Local"}</td><td>${cap(b.category)}</td><td class="tnum">${fmtDate(b.createdAt)}</td>
        <td class="num tnum">${c.pct == null ? "—" : c.pct + "%"}</td><td><span class="chip-s ${b.status === "approved" ? "ok" : b.status === "pending" ? "warn" : "bad"}">${b.status === "approved" ? "Aprobado" : b.status === "pending" ? "En revisión" : "Rechazado"}</span></td></tr>`; }).join("")}
      </tbody></table></div><p class="small muted" id="gvCount"></p>`;
  }
  if (params.tab === "reportes") {
    const stats = Store.productStats(approved);
    const shared = stats.filter(s => s.bizCount >= 2);
    const sel = params.product || (shared[0] ? shared[0].key + "|" + shared[0].unit : "");
    const [pk, pu] = sel.split("|");
    const byAlc = alcs.map(a => {
      const prices = approved.filter(b => b.alcaldia === a).flatMap(b => b.products.filter(p => p.key === pk && p.unit === pu).map(p => p.price));
      return { a, n: prices.length, avg: prices.length ? prices.reduce((s, x) => s + x, 0) / prices.length : null };
    }).filter(x => x.n);
    const maxAvg = Math.max(1, ...byAlc.map(x => x.avg));
    const cityAvg = byAlc.length ? byAlc.reduce((s, x) => s + x.avg * x.n, 0) / byAlc.reduce((s, x) => s + x.n, 0) : 0;
    const hoursByAlc = alcs.map(a => {
      const cs = approved.filter(b => b.alcaldia === a).map(b => Store.compliance(b)).filter(c => c.pct != null);
      return { a, n: cs.length, pct: cs.length ? Math.round(cs.reduce((s, c) => s + c.pct, 0) / cs.length) : null, late: cs.length ? Math.round(cs.reduce((s, c) => s + c.avgLate, 0) / cs.length) : null };
    }).filter(x => x.n);
    const byTg = TIANGUIS.map(t => {
      const bs = approved.filter(b => b.tianguisId === t.id);
      const st = Store.productStats(bs);
      const cs = bs.map(b => Store.compliance(b)).filter(c => c.pct != null);
      return { t, n: bs.length, products: st.length, avgPrice: st.length ? st.reduce((s, x) => s + x.avg, 0) / st.length : null, comp: cs.length ? Math.round(cs.reduce((s, c) => s + c.pct, 0) / cs.length) : null };
    }).filter(x => x.n);
    body = `<section class="sec"><div class="sec__head"><h2>Precio promedio por alcaldía</h2>
        <label class="inline-sel"><span class="sr">Producto</span><select id="gv-prod">${options(shared.map(s => [s.key + "|" + s.unit, `${cap(keyLabel(s.key))} (${unitText(s.unit)})`]), sel)}</select></label></div>
        ${byAlc.length ? `<div class="bars bars--money">${byAlc.sort((x, y) => y.avg - x.avg).map(x => `<div class="hbar"><span class="hbar__l">${esc(x.a)}</span><span class="hbar__t"><span class="hbar__f money" style="width:${(x.avg / maxAvg) * 100}%"></span><span class="hbar__ref" style="left:${(cityAvg / maxAvg) * 100}%" title="Promedio de la ciudad"></span></span><span class="hbar__v tnum">${money(Math.round(x.avg * 10) / 10)}</span><span class="hbar__s">${x.n} negocio${x.n > 1 ? "s" : ""}</span></div>`).join("")}</div>
        <p class="small muted">La línea vertical marca el promedio de la ciudad: ${money(Math.round(cityAvg * 10) / 10)} por ${esc(unitText(pu))}.</p>` : `<p class="muted">Sin datos para este producto.</p>`}
      </section>
      <section class="sec"><div class="sec__head"><h2>Variación de productos en la ciudad</h2><span class="muted small">Variación = desviación estándar entre el promedio</span></div>
        <div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Producto</th><th scope="col" class="num">Negocios</th><th scope="col" class="num">Mínimo</th><th scope="col" class="num">Promedio</th><th scope="col" class="num">Máximo</th><th scope="col" class="num">Variación</th></tr></thead><tbody>
        ${stats.slice(0, 16).map(s => `<tr><th scope="row">${esc(cap(keyLabel(s.key)))} <span class="muted">/${esc(unitText(s.unit))}</span></th><td class="num tnum">${s.bizCount}</td><td class="num tnum">${money(s.min)}</td><td class="num tnum"><b>${money(Math.round(s.avg * 10) / 10)}</b></td><td class="num tnum">${money(s.max)}</td><td class="num tnum"><span class="chip-s ${s.n < 2 ? "" : s.cv > 12 ? "warn" : "ok"}">${s.n < 2 ? "1 dato" : s.cv.toFixed(1) + "%"}</span></td></tr>`).join("")}
        </tbody></table></div></section>
      <section class="sec"><div class="sec__head"><h2>Métricas de horarios por alcaldía</h2><span class="muted small">Últimos 14 días</span></div>
        <div class="bars">${hoursByAlc.sort((x, y) => (y.pct ?? 0) - (x.pct ?? 0)).map(x => `<div class="hbar"><span class="hbar__l">${esc(x.a)}</span><span class="hbar__t"><span class="hbar__f ${pctTone(x.pct)}" style="width:${x.pct}%"></span></span><span class="hbar__v tnum">${x.pct}%</span><span class="hbar__s">${x.n} negocios · retardo prom. ${x.late} min</span></div>`).join("")}</div></section>
      <section class="sec"><div class="sec__head"><h2>Tianguis de la ciudad</h2></div>
        <div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Tianguis</th><th scope="col" class="num">Puestos</th><th scope="col" class="num">Productos</th><th scope="col" class="num">Precio prom. por producto</th><th scope="col" class="num">Cumplimiento</th></tr></thead><tbody>
        ${byTg.map(x => `<tr><th scope="row">${esc(x.t.name)}<small class="muted">${esc(x.t.alcaldia)}</small></th><td class="num tnum">${x.n}</td><td class="num tnum">${x.products}</td><td class="num tnum">${x.avgPrice == null ? "—" : money(Math.round(x.avgPrice))}</td><td class="num tnum"><span class="chip-s ${pctTone(x.comp)}">${x.comp == null ? "—" : x.comp + "%"}</span></td></tr>`).join("")}
        </tbody></table></div></section>`;
  }
  return {
    title: "Administrador de gobierno",
    html: `<header class="phead"><span class="phead__ic tone-petroleo">${icon("building")}</span><div><p class="eyebrow">Administrador de gobierno · ${esc(u.folio)}</p><h1>Comercio local en la Ciudad de México</h1><p class="note note--inline">${icon("eye")}Acceso de solo lectura</p></div></header>
    <div class="kpis">${kpi("Negocios registrados", all.length, `${alcs.length} alcaldías`)}${kpi("Aprobados", approved.length, `${all.filter(b => b.format === "tianguis").length} en tianguis`)}${kpi("En revisión", all.filter(b => b.status === "pending").length, "Esperan validación", "mostaza")}${kpi("Cumplimiento de horario", cityComp == null ? "—" : cityComp + "%", "Promedio ciudad, 14 días")}</div>
    ${tabs("panelGobierno", params, [["negocios", "Negocios", "list"], ["reportes", "Reportes", "chart"]])}
    <div class="tabbody">${body}</div>`,
    mount(root) {
      bindTabs(root, "panelGobierno", params);
      const p = $("#gv-prod", root); if (p) p.onchange = () => go("panelGobierno", Object.assign({}, params, { product: p.value }), { replace: true });
      const tbl = $("#gvTable", root);
      if (tbl) {
        const q = $("#gv-q", root), a = $("#gv-alc", root), s = $("#gv-st", root), cnt = $("#gvCount", root);
        const apply = () => { const k = Store.norm(q.value); let n = 0; $$("tbody tr", tbl).forEach(r => { const show = (!k || r.dataset.s.includes(k)) && (!a.value || r.dataset.alc === a.value) && (!s.value || r.dataset.st === s.value); r.hidden = !show; n += show; }); cnt.textContent = `${n} de ${all.length} negocios`; };
        [q, a, s].forEach(x => x.addEventListener("input", apply)); apply();
        tbl.addEventListener("click", e => { const r = e.target.closest("[data-row]"); if (r) go("govBiz", { id: r.dataset.row }); });
        tbl.addEventListener("keydown", e => { const r = e.target.closest("[data-row]"); if (r && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go("govBiz", { id: r.dataset.row }); } });
      }
    }
  };
};

VIEWS.govBiz = ({ id }) => {
  const u = Store.currentUser(); if (!u || u.role !== "gobierno") return needLogin("gobierno");
  const b = Store.biz(id), t = b.tianguisId && Store.tianguis(b.tianguisId);
  const owner = Store.db.users.find(x => x.bizId === b.id);
  const c = Store.compliance(b);
  const days = Array.from({ length: 14 }, (_, i) => Store.addDays(Store.dstr(), -i)).filter(d => d >= Store.dstr(new Date(b.createdAt)));
  const decision = Store.db.decisions.find(d => d.bizId === b.id);
  return {
    title: b.name,
    html: `<header class="phead">${bizArt(b, "phead__art")}<div><p class="eyebrow">Expediente del negocio · solo lectura</p><h1>${esc(b.name)}</h1><p>${catTag(b.category)} <span class="chip-s ${b.status === "approved" ? "ok" : b.status === "pending" ? "warn" : "bad"}">${b.status === "approved" ? "Aprobado" : b.status === "pending" ? "En revisión" : "Rechazado"}</span> ${cardBadge(b, true)}</p></div></header>
    <div class="kpis">${kpi("Cumplimiento 14 días", c.pct == null ? "—" : c.pct + "%", `${c.ok} de ${c.total} días puntuales`)}${kpi("Retardo promedio", c.avgLate + " min")}${kpi("Productos", b.products.length)}${kpi("Calificación", b.reviews.length ? Store.avgStars(b).toFixed(1) : "—", `${b.reviews.length} opiniones`)}</div>
    <section class="sec"><h2 class="h3">Datos del registro</h2><dl class="dl dl--wide">
      <div><dt>Alta de la cuenta</dt><dd>${fmtDate(b.createdAt)}, ${fmtTime(b.createdAt)}</dd></div>
      ${decision ? `<div><dt>Validación</dt><dd>${decision.accept ? "Aceptado" : "Rechazado"} el ${fmtDate(decision.ts)}</dd></div>` : ""}
      <div><dt>Propietario</dt><dd>${esc(b.owner)}</dd></div><div><dt>CURP</dt><dd class="mono sel">${esc(b.curp)}</dd></div><div><dt>RFC</dt><dd class="mono sel">${esc(b.rfc)}</dd></div>
      <div><dt>Trabajadores</dt><dd>${b.workers}</dd></div><div><dt>Formato</dt><dd>${b.format === "tianguis" ? "Puesto en tianguis" : "Local"}${t ? ` · ${esc(t.name)}` : ""}</dd></div>
      <div><dt>Dirección</dt><dd>${esc(b.address)}, ${esc(b.colonia)}, ${esc(b.alcaldia)}</dd></div><div><dt>Coordenadas</dt><dd class="mono">${b.lat != null ? `${b.lat}, ${b.lng}` : "—"}</dd></div>
      <div><dt>Horario declarado</dt><dd>${esc(Store.scheduleText(b))}</dd></div><div><dt>Terminal bancaria</dt><dd>${b.card ? "Sí" : "No"}</dd></div>
      <div><dt>Teléfono</dt><dd>${esc(b.phone || "—")}</dd></div><div><dt>Redes sociales</dt><dd>${esc(b.socials || "—")}</dd></div>
      <div><dt>Cuenta de acceso</dt><dd>${owner ? esc(owner.login || owner.phone) : "Sin cuenta vinculada"}</dd></div>
      <div class="dl__full"><dt>Descripción</dt><dd>${esc(b.description || "—")}</dd></div>
    </dl></section>
    <section class="sec"><div class="sec__head"><h2>Registro de horarios día con día</h2><span class="muted small">Últimos 14 días</span></div>
      <div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Fecha</th><th scope="col" class="num">Llegada</th><th scope="col" class="num">Salida</th><th scope="col">Pausas</th><th scope="col">Estado</th></tr></thead><tbody>
      ${days.map(d => { const l = Store.getLog(b, d), p = Store.punctuality(b, d); return `<tr><th scope="row">${fmtLong(Store.parseD(d))}</th><td class="num tnum">${l && l.in ? l.in : "—"}</td><td class="num tnum">${l && l.out ? l.out : l && l.in ? "Abierto" : "—"}</td><td class="small tnum">${l && l.pauses && l.pauses.length ? l.pauses.map(x => `${x.start}–${x.end}`).join(", ") : "—"}</td><td><span class="chip-s ${LOG_CHIP[p.code]}">${p.label}</span></td></tr>`; }).join("")}
      </tbody></table></div></section>
    ${b.products.length ? `<section class="sec"><h2 class="h3">Productos y precios</h2><div class="tablewrap"><table class="tbl"><thead><tr><th scope="col">Producto</th><th scope="col" class="num">Precio</th><th scope="col">Unidad</th><th scope="col">Descripción</th></tr></thead><tbody>${b.products.map(p => `<tr><th scope="row">${esc(p.name)}</th><td class="num tnum">${money(p.price)}</td><td>${esc(unitText(p.unit))}</td><td class="small">${esc(p.desc || "—")}</td></tr>`).join("")}</tbody></table></div></section>` : ""}`
  };
};
