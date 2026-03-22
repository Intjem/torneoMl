(function () {
  "use strict";

  var TS = typeof TorneosStore !== "undefined" ? TorneosStore : null;
  var RS = typeof RegistryStore !== "undefined" ? RegistryStore : null;
  if (!TS || !RS) return;

  var CAT_ORDER = ["individual", "1v1", "2v2", "4v4"];
  var CAT_LABELS = {
    individual: "Individual (todos contra todos)",
    "1v1": "1v1 (un jugador por inscripción)",
    "2v2": "2v2 (dúo — 2 jugadores)",
    "4v4": "4v4 (equipos)",
  };
  var FORMATO_LABELS = {
    liga: "Liga (todos contra todos)",
    eliminatoria: "Eliminatoria",
  };

  var listView = document.getElementById("torneoListView");
  var detailView = document.getElementById("torneoDetailView");
  var torneoPublicCards = document.getElementById("torneoPublicCards");
  var torneoListEmpty = document.getElementById("torneoListEmpty");
  var detailTitle = document.getElementById("detailTitle");
  var detailWhen = document.getElementById("detailWhen");
  var detailFormatoMod = document.getElementById("detailFormatoMod");
  var clasifSections = document.getElementById("clasifSections");
  var bracketPublicWrap = document.getElementById("bracketPublicWrap");
  var bracketPublicLead = document.getElementById("bracketPublicLead");
  var bracketPublicMain = document.getElementById("bracketPublicMain");
  var bracketPublicWait = document.getElementById("bracketPublicWait");
  var detailEstado = document.getElementById("detailEstado");
  var knockoutPublicWrap = document.getElementById("knockoutPublicWrap");
  var knockoutPublicLead = document.getElementById("knockoutPublicLead");
  var knockoutPublicTree = document.getElementById("knockoutPublicTree");

  function formatWhen(t) {
    if (!t || !t.fecha) return "—";
    try {
      var iso = t.fecha + "T" + (t.hora && t.hora.length ? t.hora : "00:00");
      var d = new Date(iso);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch (e) {}
    return t.fecha + (t.hora ? " " + t.hora : "");
  }

  var IB =
    typeof IndividualBracketStore !== "undefined" ? IndividualBracketStore : null;
  var KS = typeof KnockoutStore !== "undefined" ? KnockoutStore : null;

  var ESTADO_TORNEO_LABELS = {
    inscripcion: "Inscripción abierta",
    en_curso: "En curso",
    finalizado: "Finalizado",
  };

  function torneoEstadoBadgeText(t) {
    var st = (t && t.estado) || "inscripcion";
    return ESTADO_TORNEO_LABELS[st] || st;
  }

  function entrySummary(ent) {
    var parts = [];
    if (ent.teamName) parts.push(ent.teamName);
    var names = (ent.players || []).map(function (p) {
      var s = (p.nick || "—") + " (ID " + (p.mlId || "—") + ")";
      if (p.role === "captain") s += " · Capitán";
      if (p.substitute) s += " · Suplente";
      return s;
    });
    if (names.length) parts.push(names.join(" · "));
    return parts.join(" — ") || "Inscripción";
  }

  function entryLabelMapPublic(torneoId) {
    var m = {};
    TS.registryEntriesForTorneo(torneoId).forEach(function (e) {
      if (e && e.id) m[e.id] = entrySummary(e);
    });
    return m;
  }

  function matchSideLabelPublic(id, map) {
    if (!id) return "—";
    return map[id] || "Cupos pendientes";
  }

  function renderKnockoutReadOnly(torneoId, k) {
    if (!knockoutPublicTree) return;
    knockoutPublicTree.innerHTML = "";
    if (!k || !k.rounds) return;
    var labelMap = entryLabelMapPublic(torneoId);
    k.rounds.forEach(function (round) {
      var sec = document.createElement("section");
      sec.className = "knockout-round";
      var h = document.createElement("h3");
      h.className = "knockout-round__title";
      h.textContent = round.label || "Ronda";
      sec.appendChild(h);
      round.matches.forEach(function (m) {
        var box = document.createElement("div");
        box.className = "knockout-match knockout-match--readonly";
        var la = matchSideLabelPublic(m.a, labelMap);
        var lb = matchSideLabelPublic(m.b, labelMap);
        var rowA = document.createElement("div");
        rowA.className =
          "knockout-match__side" +
          (m.winner && m.winner === m.a && m.a ? " is-winner" : "");
        rowA.textContent = la;
        var rowB = document.createElement("div");
        rowB.className =
          "knockout-match__side" +
          (m.winner && m.winner === m.b && m.b ? " is-winner" : "");
        rowB.textContent = lb;
        box.appendChild(rowA);
        box.appendChild(rowB);
        sec.appendChild(box);
      });
      knockoutPublicTree.appendChild(sec);
    });
  }

  function renderList() {
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;
    var list = TS.loadTorneos().list || [];
    list.sort(function (a, b) {
      return (
        (a.fecha || "") + (a.hora || "")
      ).localeCompare((b.fecha || "") + (b.hora || ""));
    });
    if (torneoListEmpty) torneoListEmpty.hidden = list.length > 0;
    if (torneoPublicCards) {
      torneoPublicCards.innerHTML = "";
      list.forEach(function (t) {
        var li = document.createElement("li");
        li.className = "torneo-public-card";
        var a = document.createElement("a");
        a.className = "torneo-public-card__link";
        a.href = "torneo.html?id=" + encodeURIComponent(t.id);
        var h = document.createElement("span");
        h.className = "torneo-public-card__name";
        h.textContent = t.nombre;
        a.appendChild(h);
        var w = document.createElement("span");
        w.className = "muted torneo-public-card__when";
        w.textContent = formatWhen(t);
        a.appendChild(w);
        var n = TS.registryEntriesForTorneo(t.id).length;
        var c = document.createElement("span");
        c.className = "torneo-public-card__count";
        c.textContent = n + " inscripción" + (n !== 1 ? "es" : "");
        a.appendChild(c);
        var badge = document.createElement("span");
        badge.className = "torneo-public-card__badge";
        var f =
          FORMATO_LABELS[t.tipoFormato] ||
          (t.tipoFormato ? t.tipoFormato : "");
        var m = t.modalidad ?
          CAT_LABELS[t.modalidad] || t.modalidad
        : "Modalidad libre (antiguo)";
        badge.textContent = f ? f + " · " + m : m;
        a.appendChild(badge);
        var est = document.createElement("span");
        est.className =
          "torneo-public-card__estado torneo-public-card__estado--" +
          (t.estado || "inscripcion");
        est.textContent = torneoEstadoBadgeText(t);
        a.appendChild(est);
        li.appendChild(a);
        torneoPublicCards.appendChild(li);
      });
    }
  }

  function renderDetail(id) {
    var t = TS.getTorneo(id);
    if (!t) {
      if (listView) listView.hidden = true;
      if (detailView) detailView.hidden = false;
      if (detailTitle) detailTitle.textContent = "Torneo no encontrado";
      if (detailWhen) detailWhen.textContent = "";
      if (detailFormatoMod) detailFormatoMod.textContent = "";
      if (clasifSections) {
        clasifSections.innerHTML =
          '<p class="hint hint--err">Ese enlace no coincide con ningún torneo. <a href="torneo.html">Volver al listado</a>.</p>';
      }
      if (bracketPublicWrap) bracketPublicWrap.hidden = true;
      if (knockoutPublicWrap) knockoutPublicWrap.hidden = true;
      if (detailEstado) detailEstado.innerHTML = "";
      return;
    }
    if (listView) listView.hidden = true;
    if (detailView) detailView.hidden = false;
    if (detailTitle) detailTitle.textContent = t.nombre;
    if (detailWhen) detailWhen.textContent = formatWhen(t);
    if (detailFormatoMod) {
      var fl =
        FORMATO_LABELS[t.tipoFormato] ||
        (t.tipoFormato ? t.tipoFormato : "Formato no indicado");
      var ml = t.modalidad ?
        CAT_LABELS[t.modalidad] || t.modalidad
      : "Modalidad: varias (torneo antiguo); se muestran todas las secciones.";
      detailFormatoMod.textContent = fl + " · " + ml;
    }
    if (detailEstado) {
      detailEstado.innerHTML = "";
      var sp = document.createElement("span");
      sp.className =
        "torneo-estado-pill torneo-estado-pill--" + (t.estado || "inscripcion");
      sp.textContent = torneoEstadoBadgeText(t);
      detailEstado.appendChild(sp);
      var sub = document.createElement("span");
      sub.className = "muted torneo-estado-pill__hint";
      sub.textContent =
        (t.estado || "inscripcion") === "inscripcion" ?
          " · Se aceptan nuevas inscripciones."
        : (t.estado || "") === "en_curso" ?
          " · Inscripciones cerradas."
        : " · Torneo cerrado.";
      detailEstado.appendChild(sub);
    }

    var entries = TS.registryEntriesForTorneo(id);
    if (clasifSections) clasifSections.innerHTML = "";

    var catsToShow = t.modalidad ? [t.modalidad] : CAT_ORDER;
    catsToShow.forEach(function (cat) {
      var inCat = entries.filter(function (e) {
        return e.category === cat;
      });
      var card = document.createElement("div");
      card.className = "card clasif-card";
      var h = document.createElement("h2");
      h.textContent = CAT_LABELS[cat] || cat;
      card.appendChild(h);
      var count = document.createElement("p");
      count.className = "muted clasif-card__count";
      count.textContent =
        inCat.length === 0 ?
          "Nadie inscrito en esta modalidad."
        : inCat.length + " inscripción" + (inCat.length !== 1 ? "es" : "");
      card.appendChild(count);
      if (inCat.length > 0) {
        var ul = document.createElement("ul");
        ul.className = "clasif-list";
        inCat.forEach(function (ent, idx) {
          var li = document.createElement("li");
          li.className = "clasif-list__item";
          var n = document.createElement("span");
          n.className = "clasif-list__n";
          n.textContent = "#" + (idx + 1);
          li.appendChild(n);
          var txt = document.createElement("span");
          txt.className = "clasif-list__txt";
          txt.textContent = entrySummary(ent);
          li.appendChild(txt);
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      if (clasifSections) clasifSections.appendChild(card);
    });

    if (bracketPublicWrap) bracketPublicWrap.hidden = true;
    if (knockoutPublicWrap) knockoutPublicWrap.hidden = true;
    if (IB && IB.torneoTieneModalidadPool(id)) {
      var br = IB.getResolved(id);
      if (br && bracketPublicWrap && bracketPublicMain && bracketPublicWait) {
        bracketPublicWrap.hidden = false;
        if (bracketPublicLead) {
          bracketPublicLead.textContent = br.manual ?
            "Orden ajustado por el administrador; los nuevos inscritos entran al final de la lista de espera hasta que se sincronice de nuevo."
          : "Los 8 primeros por fecha de registro están en el grupo principal; los demás en lista de espera.";
        }
        bracketPublicMain.innerHTML = "";
        br.mainEntries.forEach(function (ent, idx) {
          var li = document.createElement("li");
          li.className = "bracket-list__item";
          var s = document.createElement("span");
          s.className = "bracket-list__slot";
          s.textContent = "#" + (idx + 1);
          li.appendChild(s);
          var tx = document.createElement("span");
          tx.className = "bracket-list__txt";
          tx.textContent = entrySummary(ent);
          li.appendChild(tx);
          bracketPublicMain.appendChild(li);
        });
        bracketPublicWait.innerHTML = "";
        br.waitlistEntries.forEach(function (ent, idx) {
          var li = document.createElement("li");
          li.className = "bracket-list__item";
          var s = document.createElement("span");
          s.className = "bracket-list__slot";
          s.textContent = String(idx + 1);
          li.appendChild(s);
          var tx = document.createElement("span");
          tx.className = "bracket-list__txt";
          tx.textContent = entrySummary(ent);
          li.appendChild(tx);
          bracketPublicWait.appendChild(li);
        });
      }
    }

    if (
      KS &&
      t.tipoFormato === "eliminatoria" &&
      knockoutPublicWrap &&
      knockoutPublicTree
    ) {
      var ko = KS.get(id);
      if (ko && ko.rounds) {
        knockoutPublicWrap.hidden = false;
        if (knockoutPublicLead) {
          knockoutPublicLead.textContent =
            "Cuartos, semifinales y final. Los resultados los actualiza el administrador.";
        }
        renderKnockoutReadOnly(id, ko);
      }
    }
  }

  var q = new URLSearchParams(window.location.search);
  var id = q.get("id");

  function tickRefresh() {
    if (id && id.trim()) {
      renderDetail(id.trim());
    } else {
      renderList();
    }
  }

  if (id && id.trim()) {
    renderDetail(id.trim());
  } else {
    renderList();
  }

  setInterval(tickRefresh, 2500);
  window.addEventListener("storage", function (e) {
    if (
      !e.key ||
      [
        "MLBB_TORNEOS_V1",
        "MLBB_REGISTRY_V1",
        "MLBB_KNOCKOUT_V1",
        "MLBB_INDIVIDUAL_BRACKET_V1",
      ].indexOf(e.key) < 0
    ) {
      return;
    }
    tickRefresh();
  });
})();
