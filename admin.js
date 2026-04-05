(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  // DOM elements
  var loginBox     = document.getElementById("loginBox");
  var setupBox     = document.getElementById("setupBox");
  var panel        = document.getElementById("adminPanel");
  var adminEmail   = document.getElementById("adminEmail");
  var adminPwd     = document.getElementById("adminPwd");
  var pwdErr       = document.getElementById("pwdErr");
  var btnLogin     = document.getElementById("btnLogin");
  var btnLogout    = document.getElementById("btnLogout");
  var btnShowSetup = document.getElementById("btnShowSetup");
  var btnShowLogin = document.getElementById("btnShowLogin");
  var setupEmail   = document.getElementById("setupEmail");
  var setupPwd     = document.getElementById("setupPwd");
  var setupErr     = document.getElementById("setupErr");
  var btnCreateAdmin = document.getElementById("btnCreateAdmin");

  var torneoNombre     = document.getElementById("torneoNombre");
  var torneoFecha      = document.getElementById("torneoFecha");
  var torneoHora       = document.getElementById("torneoHora");
  var torneoTipoFormato = document.getElementById("torneoTipoFormato");
  var torneoModalidad  = document.getElementById("torneoModalidad");
  var btnAddTorneo     = document.getElementById("btnAddTorneo");
  var torneoMsg        = document.getElementById("torneoMsg");
  var torneoList       = document.getElementById("torneoList");

  var registryList       = document.getElementById("registryList");
  var registryEmpty      = document.getElementById("registryEmpty");
  var registryFilterTorneo = document.getElementById("registryFilterTorneo");

  var currentPwd = document.getElementById("currentPwd");
  var newPwd     = document.getElementById("newPwd");
  var btnSavePwd = document.getElementById("btnSavePwd");
  var pwdMsg     = document.getElementById("pwdMsg");

  var cachedTorneos = [];
  var cachedRegistros = [];

  function showHint(el, text, isErr) {
    if (!el) return;
    el.textContent = text;
    el.className = "hint" + (isErr ? " hint--err" : text ? " hint--ok" : "");
  }

  // ── UI state ──
  function updateUI() {
    var loggedIn = api.isAuthenticated();
    if (loginBox) loginBox.hidden = loggedIn;
    if (setupBox) setupBox.hidden = true;
    if (panel)    panel.hidden = !loggedIn;
    if (btnLogout) btnLogout.hidden = !loggedIn;
    if (loggedIn) loadAdminData();
  }

  // ── Auth ──
  function handleLogin() {
    var email = adminEmail ? adminEmail.value.trim() : "";
    var pwd   = adminPwd ? adminPwd.value : "";
    if (!email || !pwd) { showHint(pwdErr, "Email y contraseña requeridos", true); return; }

    if (btnLogin) btnLogin.disabled = true;
    showHint(pwdErr, "");

    api.login(email, pwd)
      .then(function() {
        if (btnLogin) btnLogin.disabled = false;
        updateUI();
      })
      .catch(function(err) {
        if (btnLogin) btnLogin.disabled = false;
        showHint(pwdErr, err.message || "Error de login", true);
      });
  }

  function handleLogout() {
    api.logout().then(function() { updateUI(); }).catch(function() { updateUI(); });
  }

  function handleSetup() {
    var email = setupEmail ? setupEmail.value.trim() : "";
    var pwd   = setupPwd ? setupPwd.value : "";
    if (!email || !pwd) { showHint(setupErr, "Email y contraseña requeridos", true); return; }
    if (pwd.length < 4) { showHint(setupErr, "Mínimo 4 caracteres", true); return; }

    if (btnCreateAdmin) btnCreateAdmin.disabled = true;
    showHint(setupErr, "");

    api.setupAdmin(email, pwd)
      .then(function() {
        showHint(setupErr, "✅ Admin creado. Ahora haz login.", false);
        setTimeout(function() {
          if (loginBox) loginBox.hidden = false;
          if (setupBox) setupBox.hidden = true;
        }, 2000);
      })
      .catch(function(err) {
        showHint(setupErr, err.message, true);
        if (btnCreateAdmin) btnCreateAdmin.disabled = false;
      });
  }

  function handleChangePassword() {
    var cur = currentPwd ? currentPwd.value : "";
    var np  = newPwd ? newPwd.value : "";
    if (!cur || !np) { showHint(pwdMsg, "Ambas contraseñas requeridas", true); return; }
    if (np.length < 4) { showHint(pwdMsg, "Mínimo 4 caracteres", true); return; }

    if (btnSavePwd) btnSavePwd.disabled = true;
    api.changePassword(cur, np)
      .then(function() {
        showHint(pwdMsg, "Contraseña actualizada", false);
        if (currentPwd) currentPwd.value = "";
        if (newPwd) newPwd.value = "";
      })
      .catch(function(err) {
        showHint(pwdMsg, err.message, true);
        if (btnSavePwd) btnSavePwd.disabled = false;
      });
  }

  // ── Load data ──
  function loadAdminData() {
    Promise.all([api.getTorneos(), api.getRegistros()])
      .then(function(results) {
        cachedTorneos = results[0] || [];
        cachedRegistros = results[1] || [];
        renderTorneoList();
        renderTorneoFilter();
        renderRegistryList();
      })
      .catch(function(err) {
        console.error("Error loading admin data:", err);
        // If unauthorized, go back to login
        if (err.status === 401) {
          api.clearToken();
          updateUI();
        }
      });
  }

  // ── Torneos ──
  function renderTorneoList() {
    if (!torneoList) return;
    torneoList.innerHTML = "";

    if (cachedTorneos.length === 0) {
      var empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No hay torneos. Añade uno.";
      torneoList.appendChild(empty);
      return;
    }

    var sorted = cachedTorneos.slice().sort(function(a, b) {
      return ((a.fecha || "") + (a.hora || "")).localeCompare((b.fecha || "") + (b.hora || ""));
    });

    sorted.forEach(function(t) {
      var li = document.createElement("li");
      li.className = "torneo-admin-item";

      var title = document.createElement("div");
      title.className = "torneo-admin-item__title";
      title.textContent = t.nombre;
      li.appendChild(title);

      var when = document.createElement("div");
      when.className = "muted torneo-admin-item__when";
      when.textContent = S.formatWhen(t);
      li.appendChild(when);

      var fmt = document.createElement("div");
      fmt.className = "torneo-admin-item__fmt muted";
      fmt.textContent = S.formatoYModalidad(t);
      li.appendChild(fmt);

      var est = document.createElement("div");
      est.className = "torneo-admin-item__estado torneo-admin-item__estado--" + (t.estado || "inscripcion");
      est.textContent = S.ESTADO_LABELS[t.estado || "inscripcion"] || t.estado || "—";
      li.appendChild(est);

      var actions = document.createElement("div");
      actions.className = "torneo-admin-item__actions";

      // Estado change buttons
      var st = t.estado || "inscripcion";
      if (st === "inscripcion") {
        actions.appendChild(makeBtn("Iniciar torneo", "btn--primary", function() {
          if (!confirm("Se cerrarán las inscripciones. ¿Continuar?")) return;
          api.updateTorneo(S.getId(t), { estado: "en_curso" }).then(loadAdminData)
            .catch(function(e) { alert(e.message); });
        }));
      }
      if (st === "en_curso") {
        actions.appendChild(makeBtn("Finalizar", "btn--ghost", function() {
          api.updateTorneo(S.getId(t), { estado: "finalizado" }).then(loadAdminData);
        }));
        actions.appendChild(makeBtn("Reabrir inscripciones", "btn--ghost", function() {
          if (!confirm("¿Reabrir inscripciones?")) return;
          api.updateTorneo(S.getId(t), { estado: "inscripcion" }).then(loadAdminData);
        }));
      }
      if (st === "finalizado") {
        actions.appendChild(makeBtn("Reabrir inscripciones", "btn--ghost", function() {
          if (!confirm("¿Reabrir inscripciones?")) return;
          api.updateTorneo(S.getId(t), { estado: "inscripcion" }).then(loadAdminData);
        }));
      }

      // Public link
      var link = document.createElement("a");
      link.className = "btn btn--ghost";
      link.href = "torneo.html?id=" + encodeURIComponent(S.getId(t));
      link.textContent = "Vista pública";
      actions.appendChild(link);

      // Delete
      actions.appendChild(makeBtn("Eliminar", "btn--ghost", function() {
        if (!confirm("¿Eliminar este torneo?")) return;
        api.deleteTorneo(S.getId(t)).then(loadAdminData)
          .catch(function(e) { alert(e.message); });
      }));

      li.appendChild(actions);
      torneoList.appendChild(li);
    });
  }

  function makeBtn(text, cls, handler) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn " + cls;
    b.textContent = text;
    b.addEventListener("click", handler);
    return b;
  }

  // ── Add torneo ──
  function handleAddTorneo() {
    showHint(torneoMsg, "");
    var nom = torneoNombre ? torneoNombre.value.trim() : "";
    var fe  = torneoFecha ? torneoFecha.value : "";
    var ho  = torneoHora ? torneoHora.value : "";
    var tf  = torneoTipoFormato ? torneoTipoFormato.value : "eliminatoria";
    var mod = torneoModalidad ? torneoModalidad.value : "";

    if (!nom) { showHint(torneoMsg, "Indica el nombre", true); return; }
    if (!fe)  { showHint(torneoMsg, "Indica la fecha", true); return; }
    if (!ho)  { showHint(torneoMsg, "Indica la hora", true); return; }
    if (!mod) { showHint(torneoMsg, "Elige la modalidad", true); return; }

    if (btnAddTorneo) btnAddTorneo.disabled = true;
    api.createTorneo({ nombre: nom, fecha: fe, hora: ho, tipoFormato: tf, modalidad: mod })
      .then(function() {
        showHint(torneoMsg, "Torneo añadido", false);
        if (torneoNombre) torneoNombre.value = "";
        if (torneoFecha) torneoFecha.value = "";
        if (torneoHora) torneoHora.value = "";
        if (torneoModalidad) torneoModalidad.selectedIndex = 0;
        loadAdminData();
      })
      .catch(function(err) { showHint(torneoMsg, err.message, true); })
      .finally(function() { if (btnAddTorneo) btnAddTorneo.disabled = false; });
  }

  // ── Registry filter ──
  function renderTorneoFilter() {
    if (!registryFilterTorneo) return;
    var sel = registryFilterTorneo.value;
    registryFilterTorneo.innerHTML = '<option value="">Todos</option>';
    cachedTorneos.forEach(function(t) {
      var opt = document.createElement("option");
      opt.value = S.getId(t);
      opt.textContent = t.nombre + " · " + S.formatWhen(t);
      registryFilterTorneo.appendChild(opt);
    });
    if ([].slice.call(registryFilterTorneo.options).some(function(o) { return o.value === sel; })) {
      registryFilterTorneo.value = sel;
    }
  }

  // ── Registry list ──
  function renderRegistryList() {
    if (!registryList) return;
    registryList.innerHTML = "";

    var filterVal = registryFilterTorneo ? registryFilterTorneo.value : "";
    var filtered = cachedRegistros.filter(function(ent) {
      if (!filterVal) return true;
      var entTid = ent.torneoId ? (ent.torneoId._id || ent.torneoId) : "";
      return entTid === filterVal;
    });

    if (registryEmpty) {
      registryEmpty.hidden = filtered.length > 0;
      registryEmpty.textContent = cachedRegistros.length === 0
        ? "No hay inscripciones guardadas."
        : filtered.length === 0
        ? "Ninguna inscripción para este torneo."
        : "";
    }

    filtered.slice().reverse().forEach(function(ent) {
      var li = document.createElement("li");
      li.className = "registry-card";

      var cat = S.REG_CAT_LABELS[ent.category] || ent.category || "—";
      var titleDiv = document.createElement("div");
      titleDiv.className = "registry-card__head";
      var strong = document.createElement("strong");
      strong.textContent = cat;
      titleDiv.appendChild(strong);
      if (ent.teamName) {
        titleDiv.appendChild(document.createTextNode(" · "));
        var teamSpan = document.createElement("span");
        teamSpan.textContent = ent.teamName;
        titleDiv.appendChild(teamSpan);
      }
      li.appendChild(titleDiv);

      var meta = document.createElement("p");
      meta.className = "muted registry-card__meta";
      var metaParts = [];
      if (ent.registeredAt) metaParts.push("Registro: " + new Date(ent.registeredAt).toLocaleString());
      var tor = ent.torneoId;
      if (tor && typeof tor === "object" && tor.nombre) {
        metaParts.push("Torneo: " + tor.nombre);
      }
      meta.textContent = metaParts.join(" · ");
      li.appendChild(meta);

      var ul = document.createElement("ul");
      ul.className = "registry-players";
      (ent.players || []).forEach(function(p) {
        var pli = document.createElement("li");
        var parts = [p.nick || "—", " (ID: " + (p.mlId || "—") + ")"];
        if (p.role === "captain") parts.push(" · Capitán");
        if (p.substitute) parts.push(" · Suplente");
        if (p.role === "captain" && p.phone) parts.push(" · Tel: " + p.phone);
        pli.textContent = parts.join("");
        ul.appendChild(pli);
      });
      li.appendChild(ul);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn--ghost registry-card__del";
      delBtn.textContent = "Eliminar inscripción";
      delBtn.addEventListener("click", function() {
        if (!confirm("¿Eliminar esta inscripción?")) return;
        api.deleteRegistro(S.getId(ent)).then(loadAdminData)
          .catch(function(e) { alert(e.message); });
      });
      li.appendChild(delBtn);
      registryList.appendChild(li);
    });
  }

  // ── Event listeners ──
  if (btnLogin)     btnLogin.addEventListener("click", handleLogin);
  if (btnLogout)    btnLogout.addEventListener("click", handleLogout);
  if (btnShowSetup) btnShowSetup.addEventListener("click", function(e) {
    e.preventDefault();
    if (loginBox) loginBox.hidden = true;
    if (setupBox) setupBox.hidden = false;
  });
  if (btnShowLogin) btnShowLogin.addEventListener("click", function(e) {
    e.preventDefault();
    if (loginBox) loginBox.hidden = false;
    if (setupBox) setupBox.hidden = true;
  });
  if (btnCreateAdmin) btnCreateAdmin.addEventListener("click", handleSetup);
  if (btnAddTorneo)   btnAddTorneo.addEventListener("click", handleAddTorneo);
  if (btnSavePwd)     btnSavePwd.addEventListener("click", handleChangePassword);

  if (adminPwd) adminPwd.addEventListener("keydown", function(e) {
    if (e.key === "Enter") handleLogin();
  });

  if (registryFilterTorneo) {
    registryFilterTorneo.addEventListener("change", renderRegistryList);
  }

  // Init
  updateUI();
})();
