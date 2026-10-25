/* Chat común: cada perfil consulta únicamente su alcance del servidor. */
function chatTurn(query, result) {
  const mode = result.mode === "claude" ? "Claude · datos del catálogo" : result.mode === "local_fallback" ? "Respuesta local de respaldo" : "Datos actuales del sistema";
  return `<div class="chat-turn"><div class="chat-bubble chat-bubble--user">${esc(query)}</div><div class="chat-bubble chat-bubble--assistant"><p class="eyebrow">${esc(mode)}</p><div class="chat-answer">${esc(result.answer || "No hay una respuesta disponible.")}</div>${(result.warnings || []).map(w => `<p class="small muted">${esc(w)}</p>`).join("")}${result.recommendations?.length ? `<div class="chat-options">${result.recommendations.map(row => liveOfferCard(row)).join("")}</div>` : ""}${result.created_at ? `<p class="chat-time">${esc(liveDate(result.created_at))}</p>` : ""}</div></div>`;
}

VIEWS.chat = ({ query = "" } = {}) => {
  const user = LiveAPI.currentUser();
  if (!user) return needLogin("cliente");
  const administrative = ["gobierno", "gerente"].includes(user.role);
  const suggestions = administrative ? ["Dame un resumen de mis tianguis", "Compara los precios vigentes", "¿Cuántos puestos están registrados?"] : ["¿Qué frutas hay disponibles?", "¿Qué puedo comprar con 100 pesos?", "Busco ofertas para cocinar"];
  return { title: administrative ? "Chat de administración" : "Chat de Mi Changarrito", cls: "main--narrow",
    html: `<section class="sec chat-heading"><p class="eyebrow">${administrative ? "Asistente de administración" : "Asistente de compras"}</p><h1>${administrative ? "Consulta tus tianguis" : "¿Qué estás buscando hoy?"}</h1><p>${administrative ? "Pregunta por puestos, ofertas y precios de los tianguis que puedes administrar. El chat consulta información; no crea usuarios ni modifica datos." : "Cuéntame qué necesitas y, si tienes un presupuesto, cuánto quieres gastar. Te mostraré opciones reales, con las fotos que hayan publicado los puestos."}</p><div class="live-actions">${suggestions.map(text => `<button class="btn btn--ghost btn--sm" data-chat-suggestion="${esc(text)}">${esc(text)}</button>`).join("")}</div></section><section id="chat-log" class="chat-log" aria-live="polite" aria-label="Conversación">${loading("Cargando tu conversación…")}</section><form class="form chat-composer" id="chat-form"><label class="sr" for="chat-query">Tu mensaje</label><textarea id="chat-query" name="query" rows="2" maxlength="1000" required placeholder="Escribe tu pregunta…">${esc(query)}</textarea>${errorField()}<button class="btn btn--primary" type="submit">${icon("sparkle")}Enviar mensaje</button><p class="small muted">Claude recibe tu pregunta y los datos públicos necesarios del catálogo. Las fotos se muestran desde los puestos; no se envían al modelo.</p></form>`,
    mount(root) {
      const log = $("#chat-log", root), form = $("#chat-form", root), input = form.elements.query;
      let pending = false;
      const showHistory = async () => {
        try {
          const history = await LiveAPI.request("/ai/chat/history");
          if (!root.isConnected) return;
          log.innerHTML = history.items?.length ? history.items.map(turn => chatTurn(turn.query, turn)).join("") : `<p class="note">${administrative ? "Hola. Puedo ayudarte a consultar el estado actual de tus tianguis y puestos." : "Hola. Dime qué necesitas y buscaremos opciones en las ofertas vigentes."}</p>`;
        } catch (error) { log.innerHTML = `<p class="note note--warn">${esc(error.message)}</p>`; }
      };
      $$("[data-chat-suggestion]", root).forEach(button => { button.onclick = () => { if (!pending) { input.value = button.dataset.chatSuggestion; form.requestSubmit(); } }; });
      input.onkeydown = event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (!pending) form.requestSubmit(); } };
      form.onsubmit = event => {
        event.preventDefault();
        if (pending || !input.value.trim()) return;
        liveSubmit(form, async () => {
          pending = true;
          const message = input.value.trim(), waiting = document.createElement("div");
          waiting.className = "note"; waiting.setAttribute("role", "status"); waiting.textContent = "Consultando los datos de tus tianguis…";
          log.append(waiting);
          try {
            const result = await LiveAPI.request("/ai/chat", { method: "POST", body: { query: message } });
            if (!root.isConnected) return;
            input.value = "";
            waiting.remove();
            log.insertAdjacentHTML("beforeend", chatTurn(message, result));
            log.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
          } finally { waiting.remove(); pending = false; }
        });
      };
      showHistory();
    }
  };
};
VIEWS.assistant = VIEWS.chat;
