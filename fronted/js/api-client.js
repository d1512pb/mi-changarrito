/* Cliente de la API del mismo origen. La sesión vive sólo en esta pestaña. */
const LiveAPI = (() => {
  const sessionKey = "changarrito:api-session";
  let token = "", profile = null;
  const roleMap = { consumidor: "cliente", locatario: "vendedor", seguridad: "comercios", pro: "gobierno" };
  try { token = sessionStorage.getItem(sessionKey) || ""; } catch (_) { /* memoria si el almacenamiento está bloqueado */ }

  function clearSession() {
    token = ""; profile = null;
    try { sessionStorage.removeItem(sessionKey); } catch (_) { }
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const headers = { Accept: "application/json" };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    try {
      const response = await fetch(`/api${path}`, {
        method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        cache: "no-store", credentials: "same-origin", signal: controller.signal
      });
      let data;
      try { data = await response.json(); } catch (_) { data = null; }
      if (!response.ok) {
        if (response.status === 401 && auth) clearSession();
        let message = "No pudimos completar la solicitud. Intenta de nuevo.";
        if (response.status < 500) {
          if (typeof data?.detail === "string") message = data.detail;
          else if (Array.isArray(data?.detail)) message = data.detail.map(item => `${item.loc?.at(-1) || "Campo"}: ${item.msg}`).join(". ");
          else if (typeof data?.error?.message === "string") message = data.error.message;
        } else message = "El servicio no está disponible. Tus cambios no se confirmaron; vuelve a intentar.";
        const error = new Error(message); error.status = response.status; throw error;
      }
      if (data === null) throw new Error("El servidor devolvió una respuesta no válida. Intenta de nuevo.");
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La solicitud tardó demasiado. Revisa tu conexión e intenta de nuevo.");
      if (error instanceof TypeError) throw new Error("No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.");
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function restore() {
    if (!token) return null;
    try { profile = await request("/user/profile"); return profile; }
    catch (error) { if (error.status === 401 || error.status === 403) clearSession(); throw error; }
  }
  async function login(email, password) {
    const result = await request("/user/login", { method: "POST", body: { email, password }, auth: false });
    token = result.token;
    try {
      profile = await request("/user/profile");
      try { sessionStorage.setItem(sessionKey, token); } catch (_) { }
      return profile;
    } catch (error) { clearSession(); throw error; }
  }
  async function logout() {
    try { if (token) await request("/user/logout", { method: "POST" }); }
    finally { clearSession(); }
  }
  function currentUser() {
    return profile ? { id: profile.id, role: roleMap[profile.rol], name: profile.nombre, login: profile.email, bizId: profile.id, favorites: [] } : null;
  }
  function register(role, data) {
    if (!["cliente", "vendedor"].includes(role)) return Promise.reject(new Error("El registro público sólo admite clientes y vendedores."));
    return request("/user/register", { method: "POST", auth: false, body: {
      email: data.email, password: data.password, nombre: data.nombre,
      rol: role === "vendedor" ? "locatario" : "consumidor",
      ...(role === "vendedor" ? { nombre_negocio: data.nombre_negocio, ubicacion: data.ubicacion, horario: data.horario || null } : {})
    } });
  }
  function search(query = "") {
    return request(`/offer/search?limit=100${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`, { auth: false });
  }
  const ownOffers = () => request("/offer/mine");
  const offer = id => request(`/offer/${encodeURIComponent(id)}`, { auth: false });
  const draft = form => request("/offer/draft", { method: "POST", body: form });
  const updateOffer = (id, data) => request(`/offer/update/${encodeURIComponent(id)}`, { method: "PUT", body: data });
  const publish = (id, hours) => request(`/offer/publish/${encodeURIComponent(id)}`, { method: "POST", body: { vigencia_horas: hours } });
  const soldOut = id => request(`/offer/sold_out/${encodeURIComponent(id)}`, { method: "POST" });
  const report = (id, motivo) => request(`/offer/report/${encodeURIComponent(id)}`, { method: "POST", body: { motivo } });
  return { request, restore, login, logout, register, currentUser, search, ownOffers, offer, draft, updateOffer, publish, soldOut, report, clearSession, get profile() { return profile; } };
})();
