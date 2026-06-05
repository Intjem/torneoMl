(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  // DOM elements
  var authCheckBox = document.getElementById("authCheckBox");
  var adminContent = document.getElementById("adminContent");
  var btnLogout    = document.getElementById("btnLogout");

  var torneoNombre      = document.getElementById("torneoNombre");
  var torneoFecha       = document.getElementById("torneoFecha");
  var torneoHora        = document.getElementById("torneoHora");
  var torneoTipoFormato = document.getElementById("torneoTipoFormato");
  var torneoModalidad   = document.getElementById("torneoModalidad");
  var btnAddTorneo      = document.getElementById("btnAddTorneo");
  var torneoMsg         = document.getElementById("torneoMsg");
  var torneoList        = document.getElementById("torneoList");

  var registryList         = document.getElementById("registryList");
  var registryEmpty        = document.getElementById("registryEmpty");
  var registryFilterTorneo = document.getElementById("registryFilterTorneo");

  var playersList  = document.getElementById("playersList");
  var playersEmpty = document.getElementById("playersEmpty");

  var currentPwd = document.getElementById("currentPwd");
  var newPwd     = document.getElementById("newPwd");
  var btnSavePwd = document.getElementById("btnSavePwd");
  var pwdMsg     = document.getElementById("pwdMsg");

  var cachedTorneos   = [];
  var cachedRegistros = [];

  function showHint(el, text, isErr) {
    if (!el) return;
    el.textContent = text;
    el.className = "hint" + (isErr ? " hint--err" : text ? " hint--ok" : "");
  }

  // ── Auth guard ──
  // Verify token has admin role before showing content
  function checkAdminAccess() {
    if (!api.isAuthenticated()) {
      redirectToLogin();
      return;
    }

    api.getMe()
      .then(function(res) {
        var user = res.user;
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
          redirectToLogin();
          return;
        }
        // Access granted
        if (authCheckBox) authCheckBox.hidden = true;
        if (adminContent) adminContent.hidden = false;
        loadAdminData();
      })
      .catch(function(err) {
        // Token invalid or expired
        api.clearToken();
        redirectToLogin();
      });
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

  // ── Logout ──
  if (btnLogout) {
    btnLogout.addEventListener("click", function() {
      api.logout().then(redirectToLogin).catch(redirectToLogin);
    });
  }

  // ── Load data ──
  function loadAdminData() {
    Promise.all([
      api.getTorneos(),
      api.getEquipos(),
      api.getPlayers ? api.getPlayers() : Promise.resolve([])
    ])
      .then(function(results) {
        cachedTorneos   = results[0] || [];
        cachedRegistros = results[1] || []; // Actually equipos
        var players     = results[2] || [];
        renderTorneoList();
        renderTorneoFilter();
        renderRegistryList();
        renderPlayersList(players);
      })
      .catch(function(err) {
        console.error("Error loading admin data:", err);
        if (err.status === 401 || err.status === 403) {
          api.clearToken();
          redirectToLogin();
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

      var link = document.createElement("a");
      link.className = "btn btn--ghost";
      link.href = "torneo.html?id=" + encodeURIComponent(S.getId(t));
      link.textContent = "Vista pública";
      actions.appendChild(link);

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
    var fe  = torneoFecha  ? torneoFecha.value          : "";
    var ho  = torneoHora   ? torneoHora.value            : "";
    var tf  = torneoTipoFormato ? torneoTipoFormato.value : "eliminatoria";
    var mod = torneoModalidad ? torneoModalidad.value    : "";

    if (!nom) { showHint(torneoMsg, "Indica el nombre", true); return; }
    if (!fe)  { showHint(torneoMsg, "Indica la fecha", true); return; }
    if (!ho)  { showHint(torneoMsg, "Indica la hora", true); return; }
    if (!mod) { showHint(torneoMsg, "Elige la modalidad", true); return; }

    if (btnAddTorneo) btnAddTorneo.disabled = true;
    api.createTorneo({ nombre: nom, fecha: fe, hora: ho, tipoFormato: tf, modalidad: mod })
      .then(function() {
        showHint(torneoMsg, "Torneo añadido", false);
        if (torneoNombre) torneoNombre.value = "";
        if (torneoFecha)  torneoFecha.value = "";
        if (torneoHora)   torneoHora.value = "";
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
    var filtered  = cachedRegistros.filter(function(ent) {
      if (!filterVal) return true;
      var entTid = ent.torneoId ? (ent.torneoId._id || ent.torneoId) : "";
      return entTid === filterVal;
    });

    if (registryEmpty) {
      registryEmpty.hidden = filtered.length > 0;
      registryEmpty.textContent = cachedRegistros.length === 0
        ? "No hay equipos guardados."
        : filtered.length === 0
        ? "Ningún equipo para este torneo."
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
      
      if (ent.captain) {
        var pli = document.createElement("li");
        pli.textContent = ent.captain.nick + " (ID: " + ent.captain.mlId + ") · Capitán · Tel: " + ent.captain.phone;
        ul.appendChild(pli);
      }
      
      (ent.players || []).forEach(function(p) {
        var pli = document.createElement("li");
        var parts = [p.nick || "—", " (ID: " + (p.mlId || "—") + ")"];
        if (p.substitute) parts.push(" · Suplente");
        pli.textContent = parts.join("");
        ul.appendChild(pli);
      });
      li.appendChild(ul);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn--ghost registry-card__del";
      delBtn.textContent = "Eliminar equipo";
      delBtn.addEventListener("click", function() {
        if (!confirm("¿Eliminar este equipo de la base de datos?")) return;
        // The backend `delete /api/equipos/:id` will handle it
        api.deleteEquipo(S.getId(ent))
          .then(function() { return loadAdminData(); })
          .catch(function(e) { alert(e.message || "Error"); });
      });
      li.appendChild(delBtn);
      registryList.appendChild(li);
    });
  }

  // ── Players list ──
  function renderPlayersList(players) {
    if (!playersList) return;
    playersList.innerHTML = "";

    if (!players || players.length === 0) {
      if (playersEmpty) playersEmpty.hidden = false;
      return;
    }
    if (playersEmpty) playersEmpty.hidden = true;

    players.forEach(function(p) {
      var li = document.createElement("li");
      li.className = "registry-card";

      var head = document.createElement("div");
      head.className = "registry-card__head";
      var strong = document.createElement("strong");
      strong.textContent = p.nick || p.email;
      head.appendChild(strong);
      li.appendChild(head);

      var meta = document.createElement("p");
      meta.className = "muted registry-card__meta";
      var parts = [];
      if (p.mlId)  parts.push("ID ML: " + p.mlId);
      if (p.email) parts.push("Email: " + p.email);
      if (p.createdAt) parts.push("Desde: " + new Date(p.createdAt).toLocaleDateString());
      meta.textContent = parts.join(" · ");
      li.appendChild(meta);

      playersList.appendChild(li);
    });
  }

  // ── Change password ──
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

  // ── Event listeners ──
  if (btnAddTorneo) btnAddTorneo.addEventListener("click", handleAddTorneo);
  if (btnSavePwd)   btnSavePwd.addEventListener("click", handleChangePassword);

  if (registryFilterTorneo) {
    registryFilterTorneo.addEventListener("change", renderRegistryList);
  }

  // ── Init: verify admin access ──
  checkAdminAccess();
})();
