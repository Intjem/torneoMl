(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  var CATEGORY_HINTS = {
    individual: "Un solo jugador que actúa como capitán.",
    "1v1":      "Un jugador por inscripción (bracket 1v1).",
    "2v2":      "Registras el dúo. Nombre del dúo es opcional.",
    "4v4":      "Registras el equipo de 4 jugadores + suplentes opcionales."
  };

  var form            = document.getElementById("registryForm");
  var regTorneo       = document.getElementById("regTorneo");
  var regTorneosHint  = document.getElementById("regTorneosHint");
  var categoryEl      = document.getElementById("regCategory");
  var categoryHint    = document.getElementById("categoryHint");
  var teamNameWrap    = document.getElementById("teamNameWrap");
  var captainMlId     = document.getElementById("captainMlId");
  var captainNick     = document.getElementById("captainNick");
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
    el.hidden = !text;
  }

  // ── Populate torneo select from API ──
  function populateTorneoSelect() {
    if (!regTorneo) return;
    var cat = currentCat();

    // Show/hide team name field
    if (teamNameWrap) {
      teamNameWrap.hidden = (cat === "individual" || cat === "1v1");
    }
    if (categoryHint) {
      categoryHint.textContent = CATEGORY_HINTS[cat] || "";
    }

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

  // ── Submit ──
  function onSubmit(e) {
    e.preventDefault();
    showHint(regMsg, "", false);

    var cat    = currentCat();
    var mlId   = captainMlId ? captainMlId.value.trim() : "";
    var nick   = captainNick ? captainNick.value.trim() : "";
    var phone  = normalizePhone(captainPhoneEl && captainPhoneEl.value);

    if (!mlId)        { showHint(regMsg, "Ingresa tu ID ML de Mobile Legends.", true); return; }
    if (!nick)        { showHint(regMsg, "Ingresa tu nick en juego.", true); return; }
    if (!isPhoneOk(phone)) { showHint(regMsg, "Teléfono del capitán: al menos 8 dígitos.", true); return; }

    var torneoId = regTorneo && regTorneo.value ? regTorneo.value.trim() : "";
    if (!torneoId) { showHint(regMsg, "Elige un torneo válido.", true); return; }

    var teamNameVal = "";
    var tnEl = document.getElementById("teamName");
    if (tnEl && !teamNameWrap.hidden) teamNameVal = tnEl.value.trim();

    var entry = {
      torneoId: torneoId,
      category: cat,
      teamName: teamNameVal || null,
      captainPhone: phone,
      players: [{
        mlId: mlId,
        nick: nick,
        role: "captain",
        substitute: false,
        phone: phone
      }]
    };

    if (btnSubmitReg) btnSubmitReg.disabled = true;
    showHint(regMsg, "Enviando...", false);

    api.createRegistro(entry)
      .then(function() {
        showHint(regMsg, "¡Inscripción guardada correctamente!", false);
        if (captainMlId)  captainMlId.value  = "";
        if (captainNick)  captainNick.value   = "";
        if (captainPhoneEl) captainPhoneEl.value = "";
        if (tnEl) tnEl.value = "";
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
    }).catch(function() {
      populateTorneoSelect();
    });
  } else {
    populateTorneoSelect();
  }
})();
