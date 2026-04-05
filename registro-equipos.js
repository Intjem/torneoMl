(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  var CATEGORIES = {
    individual: { hint: "Un solo jugador; actúa como capitán.", titular: 1, subs: 0, captainTitularOnly: true, teamName: false, titularLegend: "Jugador" },
    "1v1": { hint: "Un solo jugador por inscripción (bracket 1v1); actúa como capitán.", titular: 1, subs: 0, captainTitularOnly: true, teamName: false, titularLegend: "Jugador" },
    "2v2": { hint: "Dos jugadores del dúo; uno es capitán. Nombre del dúo opcional.", titular: 2, subs: 0, captainTitularOnly: false, teamName: true, titularLegend: "Integrantes del dúo" },
    "4v4": { hint: "Cuatro titulares obligatorios; hasta tres suplentes opcionales. El capitán debe ser titular.", titular: 4, subs: 3, captainTitularOnly: true, teamName: true, titularLegend: "Titulares" }
  };

  var form            = document.getElementById("registryForm");
  var regTorneo       = document.getElementById("regTorneo");
  var regTorneosHint  = document.getElementById("regTorneosHint");
  var categoryEl      = document.getElementById("regCategory");
  var categoryHint    = document.getElementById("categoryHint");
  var teamNameWrap    = document.getElementById("teamNameWrap");
  var playerFields    = document.getElementById("playerFields");
  var titularLegend   = document.getElementById("titularLegend");
  var captainPhoneEl  = document.getElementById("captainPhone");
  var regMsg          = document.getElementById("regMsg");
  var btnSubmitReg    = document.getElementById("btnSubmitReg");

  function currentCat() { return categoryEl && categoryEl.value ? categoryEl.value : "individual"; }

  function normalizePhone(p) { return String(p || "").replace(/\s+/g, "").trim(); }

  function isPhoneOk(p) { return normalizePhone(p).replace(/\D/g, "").length >= 8; }

  function showHint(el, text, isErr) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "hint" + (isErr ? " hint--err" : text ? " hint--ok" : "");
    if (!text) el.hidden = true; else el.hidden = false;
  }

  // ── Populate torneo select from API ──
  function populateTorneoSelect() {
    if (!regTorneo) return;
    var cat = currentCat();

    api.getTorneos({ estado: "inscripcion" })
      .then(function(all) {
        var filtered = all.filter(function(t) {
          if (!t.modalidad) return true;
          return t.modalidad === cat;
        });

        filtered.sort(function(a, b) {
          return ((a.fecha || "") + (a.hora || "")).localeCompare((b.fecha || "") + (b.hora || ""));
        });

        regTorneo.innerHTML = "";

        if (all.length === 0) {
          regTorneo.appendChild(makeOpt("", "— No hay torneos —"));
          regTorneo.disabled = true;
          if (btnSubmitReg) btnSubmitReg.disabled = true;
          showHint(regTorneosHint, "El administrador debe crear torneos primero.", true);
          return;
        }

        if (filtered.length === 0) {
          regTorneo.appendChild(makeOpt("", "— Ningún torneo para esta categoría —"));
          regTorneo.disabled = true;
          if (btnSubmitReg) btnSubmitReg.disabled = true;
          showHint(regTorneosHint, "No hay torneos con inscripción abierta para esta categoría.", true);
          return;
        }

        regTorneo.disabled = false;
        if (btnSubmitReg) btnSubmitReg.disabled = false;
        showHint(regTorneosHint, "", false);

        regTorneo.appendChild(makeOpt("", "Selecciona un torneo…"));
        filtered.forEach(function(t) {
          regTorneo.appendChild(makeOpt(S.getId(t), t.nombre + " · " + S.formatWhen(t) + " · " + S.formatoYModalidad(t)));
        });

        // Auto-select from URL
        var fromUrl = new URLSearchParams(window.location.search).get("torneo");
        if (fromUrl && filtered.some(function(t) { return S.getId(t) === fromUrl; })) {
          regTorneo.value = fromUrl;
        }
      })
      .catch(function(err) {
        regTorneo.innerHTML = "";
        regTorneo.appendChild(makeOpt("", "— Error cargando torneos —"));
        regTorneo.disabled = true;
        showHint(regTorneosHint, "Error: " + (err.message || "Sin conexión al servidor"), true);
      });
  }

  function makeOpt(value, text) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    return opt;
  }

  // ── Render player fields ──
  function renderFields() {
    var cat = currentCat();
    var cfg = CATEGORIES[cat];
    if (!cfg || !playerFields) return;

    if (categoryHint) categoryHint.textContent = cfg.hint || "";
    if (teamNameWrap) teamNameWrap.hidden = !cfg.teamName;
    if (titularLegend) titularLegend.textContent = cfg.titularLegend;

    var html = "";
    for (var i = 0; i < cfg.titular; i++) {
      html += playerRowHtml(i, false, cfg, cfg.titular);
    }
    if (cfg.subs > 0) {
      html += '<p class="reg-subtitle">Suplentes <span class="muted">(opcional, máx. ' + cfg.subs + ")</span></p>";
      for (var j = 0; j < cfg.subs; j++) {
        html += playerRowHtml(cfg.titular + j, true, cfg, cfg.titular);
      }
    }
    playerFields.innerHTML = html;
  }

  function playerRowHtml(index, isSub, cfg, titularCount) {
    var showRadio = !isSub && (!cfg.captainTitularOnly || index < titularCount);
    var radio = showRadio
      ? '<label class="reg-cap"><input type="radio" name="captainPick" value="' + index + '" class="reg-cap__input" ' + (index === 0 ? "checked" : "") + ' /><span>Cap.</span></label>'
      : '<span class="reg-cap reg-cap--na" aria-hidden="true">—</span>';

    var label = isSub ? "Suplente " + (index - titularCount + 1) : "Jugador " + (index + 1);

    return '<div class="reg-player-row" data-index="' + index + '" data-sub="' + (isSub ? "1" : "0") + '">' +
      radio +
      '<div class="reg-player-row__fields">' +
      '<span class="reg-player-row__label">' + label + "</span>" +
      '<div class="field field--inline"><label class="sr-only" for="mlId_' + index + '">ID ML</label><input type="text" id="mlId_' + index + '" name="mlId_' + index + '" maxlength="32" placeholder="ID ML" inputmode="numeric" /></div>' +
      '<div class="field field--inline"><label class="sr-only" for="nick_' + index + '">Nick</label><input type="text" id="nick_' + index + '" name="nick_' + index + '" maxlength="80" placeholder="Nick en juego" /></div>' +
      "</div></div>";
  }

  // ── Collect players ──
  function getSelectedCaptainIndex(cfg) {
    var picked = form.querySelector('input[name="captainPick"]:checked');
    if (picked) return parseInt(picked.value, 10);
    return cfg.titular === 1 ? 0 : -1;
  }

  function collectPlayers(cfg) {
    var rows = playerFields.querySelectorAll(".reg-player-row");
    var players = [];
    var captainIdx = getSelectedCaptainIndex(cfg);

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var idx = parseInt(row.getAttribute("data-index"), 10);
      var isSub = row.getAttribute("data-sub") === "1";
      var mlId = (row.querySelector('[name="mlId_' + idx + '"]') || {}).value;
      var nick = (row.querySelector('[name="nick_' + idx + '"]') || {}).value;
      mlId = mlId ? mlId.trim() : "";
      nick = nick ? nick.trim() : "";

      if (isSub) {
        if (!mlId && !nick) continue;
        if (!mlId || !nick) return { error: "Completa ID y nick de cada suplente que agregues." };
      } else {
        if (!mlId || !nick) return { error: "Todos los titulares deben tener ID ML y nick." };
      }

      var isCaptain = !isSub && idx === captainIdx;
      if (cfg.titular === 1) isCaptain = true;

      players.push({
        mlId: mlId,
        nick: nick,
        role: isCaptain ? "captain" : "player",
        substitute: isSub
      });
    }

    var captains = players.filter(function(p) { return p.role === "captain"; });
    if (captains.length !== 1) return { error: "Selecciona exactamente un capitán." };

    return { players: players };
  }

  // ── Submit ──
  function onSubmit(e) {
    e.preventDefault();
    showHint(regMsg, "", false);

    var cat = currentCat();
    var cfg = CATEGORIES[cat];
    var phone = normalizePhone(captainPhoneEl && captainPhoneEl.value);

    var out = collectPlayers(cfg);
    if (out.error) { showHint(regMsg, out.error, true); return; }

    if (!isPhoneOk(phone)) { showHint(regMsg, "Teléfono del capitán: al menos 8 dígitos.", true); return; }

    var torneoId = regTorneo && regTorneo.value ? regTorneo.value.trim() : "";
    if (!torneoId) { showHint(regMsg, "Elige un torneo válido.", true); return; }

    // Add phone to captain player
    out.players.forEach(function(p) {
      if (p.role === "captain") p.phone = phone;
    });

    var teamNameVal = cfg.teamName && document.getElementById("teamName")
      ? document.getElementById("teamName").value.trim()
      : "";

    var entry = {
      torneoId: torneoId,
      category: cat,
      teamName: teamNameVal || null,
      players: out.players,
      captainPhone: phone
    };

    if (btnSubmitReg) btnSubmitReg.disabled = true;
    showHint(regMsg, "Enviando...", false);

    api.createRegistro(entry)
      .then(function() {
        showHint(regMsg, "¡Inscripción guardada correctamente!", false);
        if (captainPhoneEl) captainPhoneEl.value = "";
        if (cfg.teamName) {
          var tn = document.getElementById("teamName");
          if (tn) tn.value = "";
        }
        renderFields();
      })
      .catch(function(err) {
        showHint(regMsg, err.message || "Error al inscribirse.", true);
      })
      .finally(function() {
        if (btnSubmitReg) btnSubmitReg.disabled = false;
      });
  }

  // ── Events ──
  if (categoryEl) {
    categoryEl.addEventListener("change", function() {
      showHint(regMsg, "", false);
      populateTorneoSelect();
      renderFields();
    });
  }

  if (form) form.addEventListener("submit", onSubmit);

  // Auto-select category from URL torneo
  var urlTorneo = new URLSearchParams(window.location.search).get("torneo");
  if (urlTorneo && categoryEl) {
    api.getTorneos().then(function(all) {
      var t = all.find(function(x) { return S.getId(x) === urlTorneo; });
      if (t && t.modalidad) categoryEl.value = t.modalidad;
      populateTorneoSelect();
      renderFields();
    }).catch(function() {
      populateTorneoSelect();
      renderFields();
    });
  } else {
    populateTorneoSelect();
    renderFields();
  }
})();
