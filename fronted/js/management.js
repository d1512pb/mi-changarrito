/* Administración del MVP: administrador -> tianguis/gerentes -> puestos. */
PANEL.gerente = "panelGerente";
ROLE.gerente = { label: "Gerente de tianguis", icon: "stall", tone: "turquesa" };
VIEWS.staffOffers = liveStaff;

function managementNotice(root, error) {
  root.innerHTML = `<p class="note note--warn" role="alert">${esc(error.message)}</p>`;
}
const marketLabel = market => esc(market.nombre) + (market.is_demo ? " · DEMO" : "");
const marketOptions = markets => markets.filter(m => m.activo).map(m => `<option value="${esc(m.id)}">${marketLabel(m)}</option>`).join("");
const marketSelect = markets => field("tianguis_id", "Tianguis asignado", `<select id="tianguis_id" name="tianguis_id" required>${marketOptions(markets)}</select>`);
const accountFields = () => liveInput("nombre", "Nombre del responsable", "text", 'required maxlength="120" autocomplete="name"') +
  liveInput("email", "Correo para iniciar sesión", "email", 'required autocomplete="off"') +
  liveInput("password", "Contraseña inicial", "password", 'required minlength="8" maxlength="72" autocomplete="new-password"');

VIEWS.panelGobierno = () => {
  if (LiveAPI.currentUser()?.role !== "gobierno") return needLogin("gobierno");
  return { title: "Administración de tianguis", html: `<section class="sec"><p class="eyebrow">Administrador</p><h1>Tianguis y gerentes</h1><p>Crea el tianguis y asigna su gerente. El gerente registra los puestos y sus usuarios; el registro público es sólo para clientes.</p><div class="live-actions"><button class="btn btn--primary" id="add-market">Crear tianguis</button><button class="btn btn--ghost" id="add-manager" disabled>Crear gerente</button><button class="btn btn--ghost" ${goAttr("staffOffers")}>Revisar ofertas</button></div></section><section class="sec" id="market-admin-list">${loading()}</section>`,
    mount(root) {
      let markets = [];
      const target = $("#market-admin-list", root);
      const load = async () => {
        try {
          const [marketRows, managers] = await Promise.all([LiveAPI.request("/admin/tianguis"), LiveAPI.request("/admin/users?rol=gerente")]);
          if (!root.isConnected) return;
          markets = marketRows;
          $("#add-manager", root).disabled = !markets.some(m => m.activo);
          target.innerHTML = markets.length ? `<h2>${markets.length} tianguis registrados</h2><div class="live-grid">${markets.map(m => `<article class="live-offer"><div class="live-offer__body"><h2>${marketLabel(m)}</h2><p>${esc(m.ubicacion?.direccion || "Ubicación por completar")}</p><p>${esc(m.horario || "Horario por completar")}</p><p class="eyebrow">Gerentes asignados</p>${managers.filter(u => u.tianguis_ids?.includes(m.id)).map(u => `<p><b>${esc(u.nombre)}</b><br>${esc(u.email)}</p>`).join("") || "<p>Sin gerente asignado. Crea su cuenta con el botón superior.</p>"}</div></article>`).join("")}</div>` : emptyState("Primero crea un tianguis", "Después podrás crear al gerente y ese gerente registrará sus puestos.");
        } catch (error) { managementNotice(target, error); }
      };
      $("#add-market", root).onclick = () => openSheet({ title: "Crear tianguis", html: `<form class="form" id="market-form">${liveInput("nombre", "Nombre del tianguis", "text", 'required minlength="2" maxlength="160"')}${liveInput("direccion", "Dirección o referencia (opcional)", "text", 'maxlength="300"')}<div class="grid2">${liveInput("lat", "Latitud (opcional)", "number", 'step="any" min="-90" max="90"')}${liveInput("lng", "Longitud (opcional)", "number", 'step="any" min="-180" max="180"')}</div>${liveInput("horario", "Días y horario (opcional)", "text", 'maxlength="200"')}<label class="live-check"><input name="is_demo" type="checkbox"> Estos datos son de demostración</label><p class="small muted">Las coordenadas desconocidas pueden quedar vacías.</p>${errorField()}<button class="btn btn--primary" type="submit">Guardar tianguis</button></form>`, mount(body) {
        const form = $("#market-form", body);
        form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
          const lat = inputValue(form, "lat"), lng = inputValue(form, "lng");
          if (!!lat !== !!lng) throw new Error("Completa ambas coordenadas o deja ambas vacías.");
          const data = { nombre: inputValue(form, "nombre"), horario: inputValue(form, "horario") || null, is_demo: form.elements.is_demo.checked };
          if (lat && lng) data.ubicacion = { lat: Number(lat), lng: Number(lng), direccion: inputValue(form, "direccion") || null };
          else if (inputValue(form, "direccion")) throw new Error("Para guardar una dirección en este MVP, completa también las coordenadas.");
          await LiveAPI.request("/admin/tianguis", { method: "POST", body: data }); closeSheet(); await load(); toast("Tianguis creado. Ya puedes asignar un gerente.");
        }); };
      } });
      $("#add-manager", root).onclick = () => openSheet({ title: "Crear cuenta de gerente", html: `<form class="form" id="manager-form">${accountFields()}${marketSelect(markets)}<p class="small muted">Entrega el correo y contraseña al gerente. Sólo administrará el tianguis asignado.</p>${errorField()}<button class="btn btn--primary" type="submit">Crear gerente</button></form>`, mount(body) {
        const form = $("#manager-form", body);
        form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
          await LiveAPI.request("/admin/users", { method: "POST", body: { nombre: inputValue(form, "nombre"), email: inputValue(form, "email"), password: form.elements.password.value, rol: "gerente", tianguis_ids: [inputValue(form, "tianguis_id")] } });
          closeSheet(); await load(); toast("Cuenta de gerente creada.");
        }); };
      } });
      load();
    }
  };
};

VIEWS.panelGerente = () => {
  if (LiveAPI.currentUser()?.role !== "gerente") return needLogin("gerente");
  return { title: "Gerencia del tianguis", html: `<section class="sec"><p class="eyebrow">Gerente de tianguis</p><h1>Mis tianguis y puestos</h1><p>Registra los puestos y crea la cuenta de su responsable. Cada cuenta queda ligada a uno de tus tianguis.</p><div class="live-actions"><button class="btn btn--primary" id="add-stall" disabled>Registrar puesto y usuario</button><button class="btn btn--ghost" ${goAttr("staffOffers")}>Revisar ofertas de mis tianguis</button></div></section><section class="sec" id="manager-stalls">${loading()}</section>`,
    mount(root) {
      let markets = [];
      const target = $("#manager-stalls", root);
      const load = async () => {
        try {
          const [rows, stalls] = await Promise.all([LiveAPI.request("/management/tianguis"), LiveAPI.request("/management/stalls")]);
          if (!root.isConnected) return;
          markets = rows;
          $("#add-stall", root).disabled = !markets.some(m => m.activo);
          target.innerHTML = `<h2>${markets.map(m => marketLabel(m)).join(" · ") || "Aún no tienes un tianguis asignado"}</h2>${stalls.length ? `<div class="live-grid">${stalls.map(u => `<article class="live-offer"><div class="live-offer__body"><p class="eyebrow">${esc(u.tianguis_nombre)}</p><h2>${esc(u.nombre_negocio)}</h2><p>${esc(u.nombre)}<br>${esc(u.email)}</p><p>${u.activo ? "Cuenta activa" : "Cuenta desactivada"}</p><div class="live-actions"><button class="btn btn--ghost" data-active="${esc(u.id)}" data-value="${!u.activo}">${u.activo ? "Desactivar cuenta" : "Activar cuenta"}</button><button class="btn btn--ghost" data-reset="${esc(u.id)}">Cambiar contraseña inicial</button></div></div></article>`).join("")}</div>` : emptyState("Aún no hay puestos", "Usa Registrar puesto y usuario para dar de alta al primer responsable.")}`;
          $$("[data-active]", target).forEach(button => { button.onclick = async () => {
            button.disabled = true;
            try { await LiveAPI.request(`/management/stalls/${encodeURIComponent(button.dataset.active)}`, { method: "PATCH", body: { activo: button.dataset.value === "true" } }); await load(); }
            catch (error) { toast(error.message); button.disabled = false; }
          }; });
          $$("[data-reset]", target).forEach(button => { button.onclick = () => openSheet({ title: "Restablecer acceso del puesto", html: `<form class="form" id="reset-stall-form">${liveInput("new_password", "Nueva contraseña", "password", 'required minlength="8" maxlength="72" autocomplete="new-password"')}<p class="small muted">Se cerrarán las sesiones anteriores de esta cuenta.</p>${errorField()}<button class="btn btn--primary" type="submit">Guardar contraseña</button></form>`, mount(body) {
            const form = $("#reset-stall-form", body);
            form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => { await LiveAPI.request(`/management/stalls/${encodeURIComponent(button.dataset.reset)}/reset_password`, { method: "POST", body: { new_password: form.elements.new_password.value } }); closeSheet(); toast("Acceso actualizado."); }); };
          } }); });
        } catch (error) { managementNotice(target, error); }
      };
      $("#add-stall", root).onclick = () => openSheet({ title: "Registrar puesto y usuario", html: `<form class="form" id="stall-form">${marketSelect(markets)}${accountFields()}${liveInput("nombre_negocio", "Nombre del puesto", "text", 'required maxlength="120"')}${liveInput("direccion", "Ubicación o referencia dentro del tianguis", "text", 'maxlength="300"')}<div class="grid2">${liveInput("lat", "Latitud del puesto", "number", 'required min="-90" max="90" step="any"')}${liveInput("lng", "Longitud del puesto", "number", 'required min="-180" max="180" step="any"')}</div>${liveInput("horario", "Horario declarado (opcional)", "text", 'maxlength="120"')}<p class="small muted">Entrega el correo y contraseña al responsable del puesto para que publique sus ofertas.</p>${errorField()}<button class="btn btn--primary" type="submit">Registrar puesto</button></form>`, mount(body) {
        const form = $("#stall-form", body), select = form.elements.tianguis_id;
        const fillCoordinates = () => {
          const market = markets.find(m => m.id === select.value);
          form.elements.lat.value = market?.ubicacion?.lat ?? "";
          form.elements.lng.value = market?.ubicacion?.lng ?? "";
        };
        select.onchange = fillCoordinates; fillCoordinates();
        form.onsubmit = e => { e.preventDefault(); liveSubmit(form, async () => {
          await LiveAPI.request("/management/stalls", { method: "POST", body: {
            tianguis_id: inputValue(form, "tianguis_id"), nombre: inputValue(form, "nombre"), email: inputValue(form, "email"), password: form.elements.password.value,
            nombre_negocio: inputValue(form, "nombre_negocio"), horario: inputValue(form, "horario") || null,
            ubicacion: { lat: Number(inputValue(form, "lat")), lng: Number(inputValue(form, "lng")), direccion: inputValue(form, "direccion") || null }
          } }); closeSheet(); await load(); toast("Puesto y usuario creados en tu tianguis.");
        }); };
      } });
      load();
    }
  };
};
