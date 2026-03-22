(function () {
  "use strict";

  var RS = typeof RegistryStore !== "undefined" ? RegistryStore : null;
  var Tor = typeof TorneosStore !== "undefined" ? TorneosStore : null;
  if (!RS || !Tor) return;

  var CATEGORIES = {
    individual: {
      hint: "Un solo jugador; actúa como capitán.",
      titular: 1,
      subs: 0,
      captainTitularOnly: true,
      teamName: false,
      titularLegend: "Jugador",
    },
    "1v1": {
      hint: "Un solo jugador por inscripción (bracket 1v1); actúa como capitán y aporta el celular.",
      titular: 1,
      subs: 0,
      captainTitularOnly: true,
      teamName: false,
      titularLegend: "Jugador",
    },
    "2v2": {
      hint: "Solo dos jugadores del dúo; uno es capitán (contacto) y el otro jugador normal. Puedes añadir nombre del dúo (opcional).",
      titular: 2,
      subs: 0,
      captainTitularOnly: false,
      teamName: true,
      titularLegend: "Integrantes del dúo",
    },
    "4v4": {
      hint: "Cuatro titulares obligatorios; hasta tres suplentes opcionales. El capitán debe ser titular.",
      titular: 4,
      subs: 3,
      captainTitularOnly: true,
      teamName: true,
      titularLegend: "Titulares",
    },
  };

  var form = document.getElementById("registryForm");
  var regTorneo = document.getElementById("regTorneo");
  var regTorneosHint = document.getElementById("regTorneosHint");
  var categoryEl = document.getElementById("regCategory");
  var categoryHint = document.getElementById("categoryHint");
  var teamNameWrap = document.getElementById("teamNameWrap");
  var playerFields = document.getElementById("playerFields");
  var titularLegend = document.getElementById("titularLegend");
  var captainPhone = document.getElementById("captainPhone");
  var regMsg = document.getElementById("regMsg");
  var btnSubmitReg = document.getElementById("btnSubmitReg");

  function currentCat() {
    return categoryEl && categoryEl.value ? categoryEl.value : "individual";
  }

  function normalizePhone(p) {
    return String(p || "").replace(/\s+/g, "").trim();
  }

  function isPhoneOk(p) {
    var d = normalizePhone(p).replace(/\D/g, "");
    return d.length >= 8;
  }

  var FORMATO_SHORT = {
    liga: "Liga",
    eliminatoria: "Eliminatoria",
  };

  var MODALIDAD_SHORT = {
    individual: "Individual",
    "1v1": "1v1",
    "2v2": "2v2",
    "4v4": "4v4",
  };

  function formatTorneoOption(t) {
    var whenStr = "—";
    if (t && t.fecha) {
      try {
        var iso = t.fecha + "T" + (t.hora && t.hora.length ? t.hora : "00:00");
        var d = new Date(iso);
        if (!isNaN(d.getTime())) whenStr = d.toLocaleString();
        else whenStr = t.fecha + (t.hora ? " " + t.hora : "");
      } catch (e) {
        whenStr = t.fecha + (t.hora ? " " + t.hora : "");
      }
    }
    var fmt = FORMATO_SHORT[t.tipoFormato] || t.tipoFormato || "";
    var mod = t.modalidad ?
      MODALIDAD_SHORT[t.modalidad] || t.modalidad
    : "Cualquier cat.";
    return t.nombre + " · " + whenStr + " · " + (fmt ? fmt + " · " : "") + mod;
  }

  function setRegTorneosHint(show, isErr, text) {
    if (!regTorneosHint) return;
    if (!show) {
      regTorneosHint.hidden = true;
      regTorneosHint.textContent = "";
      return;
    }
    regTorneosHint.hidden = false;
    regTorneosHint.textContent = text;
    regTorneosHint.className = "hint" + (isErr ? " hint--err" : "");
  }

  function populateTorneoSelect() {
    if (!regTorneo) return;
    var cat = currentCat();
    var all = Tor.loadTorneos().list || [];
    var fromUrl = new URLSearchParams(window.location.search).get("torneo");
    var prev = regTorneo.value;
    regTorneo.innerHTML = "";

    if (all.length === 0) {
      var opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "— No hay torneos —";
      regTorneo.appendChild(opt0);
      regTorneo.disabled = true;
      regTorneo.required = false;
      if (btnSubmitReg) btnSubmitReg.disabled = true;
      setRegTorneosHint(
        true,
        true,
        "El administrador debe crear torneos en el panel Admin (con fecha, tipo Liga/Eliminatoria y modalidad)."
      );
      return;
    }

    var filtered = all.filter(function (t) {
      return (
        Tor.torneoAceptaModalidad(t, cat) &&
        Tor.torneoInscripcionesAbiertas(t)
      );
    });

    filtered.sort(function (a, b) {
      return (
        (a.fecha || "") + (a.hora || "")
      ).localeCompare((b.fecha || "") + (b.hora || ""));
    });

    if (filtered.length === 0) {
      var optN = document.createElement("option");
      optN.value = "";
      optN.textContent = "— Ningún torneo para esta categoría —";
      regTorneo.appendChild(optN);
      regTorneo.disabled = true;
      regTorneo.required = false;
      if (btnSubmitReg) btnSubmitReg.disabled = true;
      setRegTorneosHint(
        true,
        true,
        "No hay torneos con inscripción abierta para esta categoría (o están en curso / finalizados). Cambia la categoría o consulta con el administrador."
      );
      return;
    }

    regTorneo.disabled = false;
    regTorneo.required = true;
    if (btnSubmitReg) btnSubmitReg.disabled = false;
    setRegTorneosHint(false);

    var o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "Selecciona un torneo…";
    regTorneo.appendChild(o0);
    filtered.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = formatTorneoOption(t);
      regTorneo.appendChild(opt);
    });

    var pick =
      fromUrl &&
      filtered.some(function (t) {
        return t.id === fromUrl;
      }) ?
        fromUrl
      : prev &&
          filtered.some(function (t) {
            return t.id === prev;
          }) ?
        prev
      : "";
    if (pick) regTorneo.value = pick;
  }

  function renderFields() {
    var cat = currentCat();
    var cfg = CATEGORIES[cat];
    if (!cfg || !playerFields) return;

    if (categoryHint) categoryHint.textContent = cfg.hint || "";
    if (teamNameWrap) teamNameWrap.hidden = !cfg.teamName;
    if (titularLegend) titularLegend.textContent = cfg.titularLegend;

    var html = "";
    var i;
    var totalTitular = cfg.titular;

    for (i = 0; i < totalTitular; i++) {
      html += playerRowHtml(i, false, cfg, totalTitular);
    }

    if (cfg.subs > 0) {
      html +=
        '<p class="reg-subtitle">Suplentes <span class="muted">(opcional, máx. ' +
        cfg.subs +
        ")</span></p>";
      for (i = 0; i < cfg.subs; i++) {
        html += playerRowHtml(totalTitular + i, true, cfg, totalTitular);
      }
    }

    playerFields.innerHTML = html;
  }

  function playerRowHtml(index, isSub, cfg, titularCount) {
    var showRadio =
      !isSub && (!cfg.captainTitularOnly || index < titularCount);

    var radio =
      showRadio ?
        '<label class="reg-cap"><input type="radio" name="captainPick" value="' +
        index +
        '" class="reg-cap__input" ' +
        (index === 0 ? "checked" : "") +
        ' /><span>Cap.</span></label>'
      : '<span class="reg-cap reg-cap--na" aria-hidden="true">—</span>';

    var label = isSub ? "Suplente " + (index - titularCount + 1) : "Jugador " + (index + 1);

    return (
      '<div class="reg-player-row" data-index="' +
      index +
      '" data-sub="' +
      (isSub ? "1" : "0") +
      '">' +
      radio +
      '<div class="reg-player-row__fields">' +
      '<span class="reg-player-row__label">' +
      label +
      "</span>" +
      '<div class="field field--inline">' +
      '<label class="sr-only" for="mlId_' +
      index +
      '">ID ML</label>' +
      '<input type="text" id="mlId_' +
      index +
      '" name="mlId_' +
      index +
      '" maxlength="32" placeholder="ID ML" inputmode="numeric" />' +
      "</div>" +
      '<div class="field field--inline">' +
      '<label class="sr-only" for="nick_' +
      index +
      '">Nick</label>' +
      '<input type="text" id="nick_' +
      index +
      '" name="nick_' +
      index +
      '" maxlength="80" placeholder="Nick en juego" />' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function getSelectedCaptainIndex(cfg) {
    var picked = form.querySelector('input[name="captainPick"]:checked');
    if (picked) return parseInt(picked.value, 10);
    if (cfg.titular === 1) return 0;
    return -1;
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
        if (!mlId || !nick) {
          return { error: "Completa ID y nick de cada suplente que agregues." };
        }
      } else {
        if (!mlId || !nick) {
          return { error: "Todos los titulares deben tener ID ML y nick." };
        }
      }

      var isCaptain = !isSub && idx === captainIdx;
      if (cfg.titular === 1) isCaptain = true;

      players.push({
        mlId: mlId,
        nick: nick,
        role: isCaptain ? "captain" : "player",
        substitute: isSub,
      });
    }

    var captains = players.filter(function (p) {
      return p.role === "captain";
    });
    if (captains.length !== 1) {
      return { error: "Selecciona exactamente un capitán (radio Cap.)." };
    }

    return { players: players };
  }

  function onSubmit(e) {
    e.preventDefault();
    if (regMsg) {
      regMsg.textContent = "";
      regMsg.className = "hint";
    }

    var cat = currentCat();
    var cfg = CATEGORIES[cat];
    var phone = normalizePhone(captainPhone && captainPhone.value);

    var out = collectPlayers(cfg);
    if (out.error) {
      if (regMsg) {
        regMsg.textContent = out.error;
        regMsg.className = "hint hint--err";
      }
      return;
    }

    if (!isPhoneOk(phone)) {
      if (regMsg) {
        regMsg.textContent = "Teléfono del capitán: al menos 8 dígitos.";
        regMsg.className = "hint hint--err";
      }
      return;
    }

    var torneoId = regTorneo && regTorneo.value ? regTorneo.value.trim() : "";
    var tObj = torneoId ? Tor.getTorneo(torneoId) : null;
    if (!torneoId || !tObj) {
      if (regMsg) {
        regMsg.textContent = "Elige un torneo válido de la lista.";
        regMsg.className = "hint hint--err";
      }
      return;
    }
    if (!Tor.torneoAceptaModalidad(tObj, cat)) {
      if (regMsg) {
        regMsg.textContent =
          "Ese torneo no acepta la categoría seleccionada. Elige otro torneo o cambia la categoría.";
        regMsg.className = "hint hint--err";
      }
      return;
    }
    if (!Tor.torneoInscripcionesAbiertas(tObj)) {
      if (regMsg) {
        regMsg.textContent =
          "Este torneo ya no acepta inscripciones (en curso o finalizado).";
        regMsg.className = "hint hint--err";
      }
      return;
    }

    var titularCount = cfg.titular;
    var subs = out.players.filter(function (p) {
      return p.substitute;
    });
    var titu = out.players.filter(function (p) {
      return !p.substitute;
    });

    if (cat === "4v4" && titu.length !== 4) {
      if (regMsg) {
        regMsg.textContent = "En 4v4 se requieren exactamente 4 titulares.";
        regMsg.className = "hint hint--err";
      }
      return;
    }
    if (subs.length > 3) {
      if (regMsg) {
        regMsg.textContent = "Máximo 3 suplentes.";
        regMsg.className = "hint hint--err";
      }
      return;
    }

    var cap = out.players.filter(function (p) {
      return p.role === "captain";
    })[0];
    if (cap.substitute) {
      if (regMsg) {
        regMsg.textContent = "El capitán no puede ser suplente.";
        regMsg.className = "hint hint--err";
      }
      return;
    }

    out.players.forEach(function (p) {
      if (p.role === "captain") p.phone = phone;
    });

    var teamNameVal =
      cfg.teamName && document.getElementById("teamName") ?
        document.getElementById("teamName").value.trim()
      : "";

    var entry = {
      torneoId: torneoId,
      category: cat,
      teamName: teamNameVal || null,
      players: out.players,
    };

    RS.addRegistryEntry(entry);

    if (regMsg) {
      regMsg.textContent = "Inscripción guardada correctamente.";
      regMsg.className = "hint hint--ok";
    }
    if (captainPhone) captainPhone.value = "";
    if (cfg.teamName) {
      var tn = document.getElementById("teamName");
      if (tn) tn.value = "";
    }
    renderFields();
  }

  if (categoryEl) {
    categoryEl.addEventListener("change", function () {
      if (regMsg) {
        regMsg.textContent = "";
        regMsg.className = "hint";
      }
      populateTorneoSelect();
      renderFields();
    });
  }

  if (form) form.addEventListener("submit", onSubmit);

  var urlTorneo = new URLSearchParams(window.location.search).get("torneo");
  if (urlTorneo) {
    var tUrl = Tor.getTorneo(urlTorneo);
    if (tUrl && tUrl.modalidad && categoryEl) {
      categoryEl.value = tUrl.modalidad;
    }
  }
  populateTorneoSelect();
  if (urlTorneo && regTorneo) {
    var okOpt = [].some.call(regTorneo.options, function (o) {
      return o.value === urlTorneo;
    });
    if (okOpt) regTorneo.value = urlTorneo;
  }
  renderFields();
})();
