/* Store: capa de datos local (localStorage).
 * Todas las vistas leen y escriben a través de este objeto; para conectar un backend real,
 * reemplaza estas funciones por llamadas fetch() a tu API manteniendo las mismas firmas.
 */
const Store = (() => {
  const KEY = "huacal:db";
  const SKEY = "huacal:session";
  let db = null;

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { db = null; }
    const fresh = buildSeed();
    if (!db || db.version !== fresh.version) db = fresh;
    db.businesses.forEach(b => { b.description = b.description || ""; b.photos = b.photos || []; b.logs = b.logs || {}; b.reviews = b.reviews || []; });
    save();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* cuota llena o almacenamiento bloqueado */ } }
  function reset() { db = buildSeed(); save(); }

  /* ---------- utilidades de tiempo ---------- */
  const pad = n => String(n).padStart(2, "0");
  const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const hm = s => { if (!s) return null; const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const fmtHM = mins => `${pad(Math.floor(mins / 60) % 24)}:${pad(Math.round(mins % 60))}`;
  const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const nowHM = () => fmtHM(nowMins());
  const addDays = (ds, n) => { const d = parseD(ds); d.setDate(d.getDate() + n); return dstr(d); };

  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* Bitácora diaria simulada para negocios de demostración (determinística por negocio y fecha). */
  function simLog(b, ds) {
    const today = dstr();
    if (ds > today) return null;
    if (ds === today && b.ownerAccount) return null;
    if (b.status !== "approved" && ds >= dstr(new Date(b.createdAt))) return null;
    const d = parseD(ds);
    if (!b.schedule.days.includes(d.getDay())) return null;
    const r = rng(hash(b.id + ds));
    if (r() < 0.06) return null;
    const o = hm(b.schedule.open), c = hm(b.schedule.close);
    const late = r() < 0.2 ? 16 + Math.floor(r() * 35) : Math.floor(r() * 14) - 8;
    const early = r() < 0.12 ? 20 + Math.floor(r() * 40) : Math.floor(r() * 12) - 4;
    const inM = o + late, outM = c - early;
    const mid = o + Math.floor((c - o) / 2);
    const pauses = r() < 0.3 ? [{ start: fmtHM(mid), end: fmtHM(mid + 30) }] : [];
    const log = { in: fmtHM(inM), out: fmtHM(outM), pauses };
    if (ds === today) {
      const m = nowMins();
      if (m < inM) return null;
      if (m < outM) log.out = null;
      log.pauses = pauses.filter(p => hm(p.start) <= m);
    }
    return log;
  }
  function getLog(b, ds) { return (b.logs && b.logs[ds]) || (b.simulated ? simLog(b, ds) : null); }

  function setTodayLog(b, patch) {
    const ds = dstr();
    const cur = b.logs[ds] || { in: null, out: null, pauses: [] };
    b.logs[ds] = Object.assign(cur, patch);
    save();
    return b.logs[ds];
  }

  /* Estado visible para clientes: combina horario, registro del día y pausas. */
  function status(b) {
    const now = new Date(), m = nowMins(), ds = dstr(now);
    const log = getLog(b, ds);
    const sched = b.schedule;
    if (log && log.in && !log.out) {
      const p = (log.pauses || []).find(p => m >= hm(p.start) && m < hm(p.end));
      if (p) return { code: "pause", label: "En pausa", detail: `Regresa a las ${p.end}` };
      return { code: "open", label: "Abierto ahora", detail: `Abrió a las ${log.in}` };
    }
    if (log && log.out) return { code: "closed", label: "Cerrado", detail: `Cerró hoy a las ${log.out}` };
    if (sched.days.includes(now.getDay())) {
      if (m < hm(sched.open)) return { code: "closed", label: "Cerrado", detail: `Abre hoy a las ${sched.open}` };
      if (m < hm(sched.close)) return { code: "late", label: "Sin abrir", detail: `Su horario empezó a las ${sched.open}` };
    }
    return { code: "closed", label: "Cerrado", detail: nextOpen(b) };
  }
  function nextOpen(b) {
    const now = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      if (b.schedule.days.includes(d.getDay())) return `Abre ${i === 1 ? "mañana" : DAY_LONG[d.getDay()]} a las ${b.schedule.open}`;
    }
    return "Sin horario registrado";
  }
  const DAY_LONG = ["el domingo", "el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado"];

  function daysText(days) {
    const s = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (s.length === 7) return "Todos los días";
    const order = s.map(d => (d + 6) % 7);
    const contiguous = order.every((v, i) => i === 0 || v === order[i - 1] + 1);
    if (contiguous && s.length >= 3) return `${DAY_SHORT[s[0]]}–${DAY_SHORT[s[s.length - 1]]}`;
    const names = s.map(d => DAY_SHORT[d]);
    return names.length > 1 ? names.slice(0, -1).join(", ") + " y " + names[names.length - 1] : names[0];
  }
  const scheduleText = b => `${daysText(b.schedule.days)} · ${b.schedule.open}–${b.schedule.close}`;

  /* Cumplimiento de horario: llegada ≤ 15 min tarde y salida ≥ 15 min antes del cierre. */
  function punctuality(b, ds) {
    const d = parseD(ds);
    if (!b.schedule.days.includes(d.getDay())) return { code: "off", label: "No labora" };
    const log = getLog(b, ds);
    if (!log || !log.in) return ds === dstr() && nowMins() < hm(b.schedule.open) + 15 ? { code: "pending", label: "Por llegar" } : { code: "absent", label: "Ausente" };
    const late = hm(log.in) - hm(b.schedule.open);
    const early = log.out ? hm(b.schedule.close) - hm(log.out) : 0;
    if (late > 15) return { code: "late", label: `Retardo ${late} min`, late };
    if (log.out && early > 15) return { code: "early", label: `Salió ${early} min antes`, late };
    return { code: "ok", label: "Puntual", late };
  }
  function compliance(b, days = 14) {
    let ok = 0, total = 0, lateSum = 0, lateN = 0;
    const today = dstr();
    for (let i = 1; i <= days; i++) {
      const ds = addDays(today, -i);
      if (ds < dstr(new Date(b.createdAt))) continue;
      const p = punctuality(b, ds);
      if (p.code === "off") continue;
      total++;
      if (p.code === "ok") ok++;
      if (typeof p.late === "number") { lateSum += Math.max(0, p.late); lateN++; }
    }
    return { pct: total ? Math.round((ok / total) * 100) : null, total, ok, avgLate: lateN ? Math.round(lateSum / lateN) : 0 };
  }

  /* ---------- búsqueda ---------- */
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const SYN = { tomate: ["jitomate"], jitomate: ["tomate"], patata: ["papa"], carne: ["bistec", "molida", "carniceria", "res", "chuleta"], res: ["bistec", "molida"], cerdo: ["chuleta"], pollo: ["pechuga", "pierna", "polleria"], pescado: ["mojarra", "tilapia", "pescaderia"], mariscos: ["camaron", "pescaderia"], flor: ["floreria", "cempasuchil", "rosas"], flores: ["floreria", "cempasuchil", "rosas"], pan: ["bolillo", "concha", "panaderia", "cuernito"], fruta: ["frutas"], verdura: ["verduras", "recauderia"], herramienta: ["ferreteria", "martillo"], ofrenda: ["cempasuchil", "pan de muerto", "papel picado", "calaverita"], muertos: ["cempasuchil", "pan de muerto", "papel picado", "calaverita"], huevo: ["huevo", "polleria"], antojitos: ["comida", "quesadilla", "tlacoyo"], escolar: ["papeleria", "cuaderno"] };
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  }
  const stem = t => t.length > 4 && t.endsWith("es") ? t.slice(0, -2) : t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t;

  function searchProducts(q, list = visible()) {
    const tokens = norm(q).split(/[^a-z0-9ñ]+/).filter(t => t.length > 1);
    if (!tokens.length) return [];
    const out = [];
    for (const b of list) {
      const fields = [
        { w: 4, txt: norm(b.name) }, { w: 3, txt: norm(b.category) }, { w: 1, txt: norm(b.description) },
        ...b.products.map(p => ({ w: 3, txt: norm(p.name + " " + p.key), product: p })),
        ...b.products.map(p => ({ w: 1, txt: norm(p.desc), product: p }))
      ];
      let score = 0, fuzzy = false; const matched = new Set();
      for (const tok of tokens) {
        const variants = [tok, stem(tok), ...(SYN[tok] || []), ...(SYN[stem(tok)] || [])];
        let best = 0, bestFuzzy = false, bestProducts = [];
        for (const f of fields) {
          if (!f.txt) continue;
          const words = f.txt.split(/[^a-z0-9ñ]+/);
          let hit = 0, fz = false;
          if (variants.some(v => f.txt.includes(v))) hit = f.w;
          else if (words.some(w => w.length >= 4 && tok.length >= 4 && lev(stem(w), stem(tok)) <= (tok.length >= 7 ? 2 : 1))) { hit = f.w / 2; fz = true; }
          if (hit) {
            if (hit > best) { best = hit; bestFuzzy = fz; }
            if (f.product) bestProducts.push(f.product);
          }
        }
        if (!best) { score = 0; break; }
        score += best; fuzzy = fuzzy || bestFuzzy; bestProducts.forEach(p => matched.add(p));
      }
      if (score > 0) out.push({ b, score, fuzzy, products: [...matched] });
    }
    return out.sort((a, b) => b.score - a.score || Number(status(b.b).code === "open") - Number(status(a.b).code === "open"));
  }

  function budget(amount, cat) {
    const rows = [];
    for (const b of visible()) {
      if (cat && b.category !== cat) continue;
      for (const p of b.products) if (p.price <= amount) rows.push({ b, p });
    }
    return rows.sort((x, y) => y.p.price - x.p.price);
  }

  /* ---------- consultas ---------- */
  const visible = () => db.businesses.filter(b => b.status === "approved");
  const biz = id => db.businesses.find(b => b.id === id);
  const tianguis = id => TIANGUIS.find(t => t.id === id);
  const user = id => db.users.find(u => u.id === id);
  const avgStars = b => b.reviews.length ? b.reviews.reduce((s, r) => s + r.stars, 0) / b.reviews.length : 0;

  function filterBiz(f = {}) {
    let list = f.includePending ? db.businesses : visible();
    if (f.ids) list = list.filter(b => f.ids.includes(b.id));
    if (f.alcaldia) list = list.filter(b => b.alcaldia === f.alcaldia);
    if (f.colonia) list = list.filter(b => b.colonia === f.colonia);
    if (f.tianguis) list = list.filter(b => b.tianguisId === f.tianguis);
    if (f.category) list = list.filter(b => b.category === f.category);
    return list;
  }

  /* ---------- sesión y cuentas ---------- */
  function session() { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (e) { return null; } }
  function setSession(s) { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) { } memSession = s; }
  let memSession = null;
  function currentUser() { const s = memSession || session(); return s ? user(s.uid) : null; }

  function login(role, id, password, folio) {
    const k = norm(id).replace(/[\s-]/g, "");
    const u = db.users.find(u => u.role === role && (norm(u.login) === k || (u.phone && u.phone === k)));
    if (!u || u.password !== password) return { error: "El correo, teléfono o contraseña no coinciden con una cuenta de este perfil." };
    if ((role === "comercios" || role === "gobierno") && norm(u.folio) !== norm(folio).trim()) return { error: "El folio de identificación no corresponde a esta cuenta." };
    setSession({ uid: u.id, at: Date.now() });
    return { user: u };
  }
  function logout() { setSession(null); }
  function loginTaken(id) { const k = norm(id).replace(/[\s-]/g, ""); return db.users.some(u => norm(u.login) === k || u.phone === k); }

  function register(role, data) {
    const id = "u-" + Date.now().toString(36);
    const isPhone = /^\d{10}$/.test(data.login.replace(/[\s-]/g, ""));
    const u = { id, role, name: data.name, login: isPhone ? "" : data.login.trim().toLowerCase(), phone: isPhone ? data.login.replace(/[\s-]/g, "") : "", password: data.password, createdAt: Date.now() };
    if (role === "cliente") Object.assign(u, { alcaldia: data.alcaldia, colonia: data.colonia, favorites: data.favorites || [] });
    if (role === "comercios") Object.assign(u, { rfc: data.rfc, tianguisId: data.tianguisId, folio: "ADC-" + String(1000 + Math.floor(Math.random() * 8999)) });
    if (role === "vendedor") {
      const t = data.format === "tianguis" ? tianguis(data.tianguisId) : null;
      const b = {
        id: "b" + Date.now().toString(36), name: data.bizName, owner: data.name, curp: data.curp, rfc: data.rfc, workers: data.workers,
        format: data.format, tianguisId: t ? t.id : null, category: data.category,
        alcaldia: t ? t.alcaldia : data.alcaldia, colonia: t ? t.colonia : data.colonia, address: data.address, lat: data.lat, lng: data.lng,
        schedule: data.schedule, card: data.card, socials: data.socials, phone: data.phone, description: data.description, photos: data.photos,
        products: [], reviews: [], logs: {}, simulated: false, ownerAccount: id, createdAt: Date.now(),
        status: data.format === "tianguis" ? "pending" : "approved"
      };
      db.businesses.push(b); u.bizId = b.id;
    }
    db.users.push(u); save();
    return u;
  }

  function decide(bizId, accept, adminId) {
    const b = biz(bizId); if (!b) return;
    b.status = accept ? "approved" : "rejected";
    db.decisions.unshift({ bizId, accept, adminId, ts: Date.now() });
    save();
  }

  /* ---------- carrito, favoritos y mensajes ---------- */
  const cart = () => db.cart;
  function addToCart(bizId, productId) {
    const ex = db.cart.find(i => i.bizId === bizId && i.productId === productId);
    if (ex) ex.qty++; else db.cart.push({ bizId, productId, qty: 1 });
    save();
  }
  function setQty(i, qty) { if (qty <= 0) db.cart.splice(i, 1); else db.cart[i].qty = qty; save(); }

  function favorites() { const u = currentUser(); return u && u.role === "cliente" ? u.favorites : db.guestFavorites; }
  function toggleFav(id) { const f = favorites(); const i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.push(id); save(); return i < 0; }

  function threadFor(bizId, clientId, clientName) {
    let t = db.threads.find(t => t.bizId === bizId && t.clientId === clientId);
    if (!t) { t = { id: "th" + Date.now().toString(36), bizId, clientId, clientName, msgs: [], unreadVendor: 0, unreadClient: 0 }; db.threads.push(t); save(); }
    return t;
  }
  const thread = id => db.threads.find(t => t.id === id);
  const threadsForBiz = bizId => db.threads.filter(t => t.bizId === bizId && t.msgs.length).sort((a, b) => b.msgs[b.msgs.length - 1].ts - a.msgs[a.msgs.length - 1].ts);
  const threadsForClient = clientId => db.threads.filter(t => t.clientId === clientId && t.msgs.length);
  function send(t, from, text) {
    t.msgs.push({ from, text, ts: Date.now() });
    if (from === "client") t.unreadVendor++; else t.unreadClient++;
    save();
  }

  /* ---------- analítica ---------- */
  function productStats(list) {
    const groups = {};
    for (const b of list) for (const p of b.products) {
      const k = p.key + "|" + p.unit;
      (groups[k] = groups[k] || { key: p.key, unit: p.unit, label: p.key, prices: [], biz: new Set() }).prices.push(p.price);
      groups[k].biz.add(b.id);
    }
    return Object.values(groups).map(g => {
      const n = g.prices.length, avg = g.prices.reduce((a, c) => a + c, 0) / n;
      const sd = Math.sqrt(g.prices.reduce((a, c) => a + (c - avg) ** 2, 0) / n);
      return { ...g, n, avg, min: Math.min(...g.prices), max: Math.max(...g.prices), cv: avg ? (sd / avg) * 100 : 0, bizCount: g.biz.size };
    }).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
  }

  return {
    load, save, reset, get db() { return db; },
    dstr, parseD, hm, fmtHM, nowHM, nowMins, addDays,
    getLog, setTodayLog, status, scheduleText, daysText, punctuality, compliance,
    norm, searchProducts, budget, filterBiz, visible, biz, tianguis, user, avgStars,
    session, currentUser, login, logout, loginTaken, register, decide,
    cart, addToCart, setQty, favorites, toggleFav,
    threadFor, thread, threadsForBiz, threadsForClient, send, productStats
  };
})();
