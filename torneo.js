(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  var listView         = document.getElementById("torneoListView");
  var detailView       = document.getElementById("torneoDetailView");
  var torneoPublicCards = document.getElementById("torneoPublicCards");
  var torneoListEmpty  = document.getElementById("torneoListEmpty");
  var detailTitle      = document.getElementById("detailTitle");
  var detailWhen       = document.getElementById("detailWhen");
  var detailFormatoMod = document.getElementById("detailFormatoMod");
  var detailEstado     = document.getElementById("detailEstado");
  var clasifSections   = document.getElementById("clasifSections");
  var bracketPublicWrap = document.getElementById("bracketPublicWrap");
  var bracketPublicLead = document.getElementById("bracketPublicLead");
  var bracketPublicMain = document.getElementById("bracketPublicMain");
  var bracketPublicWait = document.getElementById("bracketPublicWait");
  var knockoutPublicWrap = document.getElementById("knockoutPublicWrap");
  var knockoutPublicLead = document.getElementById("knockoutPublicLead");
  var knockoutPublicTree = document.getElementById("knockoutPublicTree");

  var CAT_ORDER = ["individual", "1v1", "2v2", "4v4"];

  // ── List view ──
  function renderList(torneos) {
    if (listView) listView.hidden = false;
    if (detailView) detailView.hidden = true;

    var sorted = torneos.slice().sort(function(a, b) {
      return ((a.fecha || "") + (a.hora || "")).localeCompare((b.fecha || "") + (b.hora || ""));
    });

    if (torneoListEmpty) torneoListEmpty.hidden = sorted.length > 0;
    if (!torneoPublicCards) return;
    torneoPublicCards.innerHTML = "";

    sorted.forEach(function(t) {
      var li = document.createElement("li");
      li.className = "torneo-public-card";

      var a = document.createElement("a");
      a.className = "torneo-public-card__link";
      a.href = "torneo.html?id=" + encodeURIComponent(S.getId(t));

      var h = document.createElement("span");
      h.className = "torneo-public-card__name";
      h.textContent = t.nombre;
      a.appendChild(h);

      var w = document.createElement("span");
      w.className = "muted torneo-public-card__when";
      w.textContent = S.formatWhen(t);
      a.appendChild(w);

      var badge = document.createElement("span");
      badge.className = "torneo-public-card__badge";
      badge.textContent = S.formatoYModalidad(t);
      a.appendChild(badge);

      var est = document.createElement("span");
      est.className = "torneo-public-card__estado torneo-public-card__estado--" + (t.estado || "inscripcion");
      est.textContent = S.ESTADO_LABELS[t.estado || "inscripcion"] || t.estado || "—";
      a.appendChild(est);

      li.appendChild(a);
      torneoPublicCards.appendChild(li);
    });
  }

  // ── Detail view ──
  function renderDetail(torneo, registros) {
    if (listView) listView.hidden = true;
    if (detailView) detailView.hidden = false;

    if (detailTitle) detailTitle.textContent = torneo.nombre;
    if (detailWhen) detailWhen.textContent = S.formatWhen(torneo);
    if (detailFormatoMod) detailFormatoMod.textContent = S.formatoYModalidad(torneo);

    if (detailEstado) {
      detailEstado.innerHTML = "";
      var sp = document.createElement("span");
      sp.className = "torneo-estado-pill torneo-estado-pill--" + (torneo.estado || "inscripcion");
      sp.textContent = S.ESTADO_LABELS[torneo.estado || "inscripcion"] || torneo.estado || "—";
      detailEstado.appendChild(sp);
    }

    // Classifications
    if (clasifSections) {
      clasifSections.innerHTML = "";
      var catsToShow = torneo.modalidad ? [torneo.modalidad] : CAT_ORDER;

      catsToShow.forEach(function(cat) {
        var inCat = registros.filter(function(e) { return e.category === cat; });
        var card = document.createElement("div");
        card.className = "card clasif-card";

        var h2 = document.createElement("h2");
        h2.textContent = S.REG_CAT_LABELS[cat] || cat;
        card.appendChild(h2);

        var count = document.createElement("p");
        count.className = "muted clasif-card__count";
        count.textContent = inCat.length === 0
          ? "Nadie inscrito en esta modalidad."
          : inCat.length + " inscripción" + (inCat.length !== 1 ? "es" : "");
        card.appendChild(count);

        if (inCat.length > 0) {
          var ul = document.createElement("ul");
          ul.className = "clasif-list";
          inCat.forEach(function(ent, idx) {
            var li = document.createElement("li");
            li.className = "clasif-list__item";
            var n = document.createElement("span");
            n.className = "clasif-list__n";
            n.textContent = "#" + (idx + 1);
            li.appendChild(n);
            var txt = document.createElement("span");
            txt.className = "clasif-list__txt";
            txt.textContent = S.entrySummary(ent);
            li.appendChild(txt);
            ul.appendChild(li);
          });
          card.appendChild(ul);
        }

        // Inscription link if open
        if ((torneo.estado || "inscripcion") === "inscripcion") {
          var linkP = document.createElement("p");
          linkP.style.marginTop = "0.5rem";
          var regLink = document.createElement("a");
          regLink.className = "btn btn--ghost";
          regLink.href = "registro-equipos.html?torneo=" + encodeURIComponent(S.getId(torneo));
          regLink.textContent = "Inscribirse a este torneo";
          linkP.appendChild(regLink);
          card.appendChild(linkP);
        }

        clasifSections.appendChild(card);
      });
    }

    // Bracket (hide for now, bracket data comes from torneo document)
    if (bracketPublicWrap) bracketPublicWrap.hidden = true;
    if (knockoutPublicWrap) knockoutPublicWrap.hidden = true;

    // Show knockout if exists
    if (torneo.knockoutBracket && torneo.knockoutBracket.rounds && torneo.knockoutBracket.rounds.length > 0) {
      renderKnockout(torneo);
    }
  }

  function renderKnockout(torneo) {
    if (!knockoutPublicWrap || !knockoutPublicTree) return;
    knockoutPublicWrap.hidden = false;
    if (knockoutPublicLead) {
      knockoutPublicLead.textContent = "Cuartos, semifinales y final. Los resultados los actualiza el administrador.";
    }

    knockoutPublicTree.innerHTML = "";
    torneo.knockoutBracket.rounds.forEach(function(round) {
      var sec = document.createElement("section");
      sec.className = "knockout-round";
      var h = document.createElement("h3");
      h.className = "knockout-round__title";
      h.textContent = round.label || "Ronda";
      sec.appendChild(h);

      round.matches.forEach(function(m) {
        var box = document.createElement("div");
        box.className = "knockout-match knockout-match--readonly";
        var rowA = document.createElement("div");
        rowA.className = "knockout-match__side" + (m.winner && m.winner === (m.player1 && m.player1._id || m.player1) ? " is-winner" : "");
        rowA.textContent = m.player1 ? (typeof m.player1 === "object" ? S.entrySummary(m.player1) : "Jugador") : "—";
        box.appendChild(rowA);
        var rowB = document.createElement("div");
        rowB.className = "knockout-match__side" + (m.winner && m.winner === (m.player2 && m.player2._id || m.player2) ? " is-winner" : "");
        rowB.textContent = m.player2 ? (typeof m.player2 === "object" ? S.entrySummary(m.player2) : "Jugador") : "—";
        box.appendChild(rowB);
        sec.appendChild(box);
      });

      knockoutPublicTree.appendChild(sec);
    });
  }

  // ── Init ──
  var q = new URLSearchParams(window.location.search);
  var id = q.get("id");

  if (id && id.trim()) {
    // Detail mode
    Promise.all([
      api.getTorneo(id.trim()),
      api.getRegistrosByTorneo(id.trim())
    ]).then(function(results) {
      renderDetail(results[0], results[1]);
    }).catch(function(err) {
      if (listView) listView.hidden = true;
      if (detailView) detailView.hidden = false;
      if (detailTitle) detailTitle.textContent = "Error";
      if (clasifSections) {
        clasifSections.innerHTML = '<p class="hint hint--err">' + (err.message || "Torneo no encontrado") +
          '. <a href="torneo.html">Volver al listado</a>.</p>';
      }
    });
  } else {
    // List mode
    api.getTorneos()
      .then(function(torneos) { renderList(torneos); })
      .catch(function(err) {
        if (torneoListEmpty) {
          torneoListEmpty.hidden = false;
          torneoListEmpty.textContent = "Error cargando torneos: " + (err.message || "Sin conexión");
        }
      });
  }

  // Auto-refresh every 15s
  setInterval(function() {
    if (id && id.trim()) {
      Promise.all([
        api.getTorneo(id.trim()),
        api.getRegistrosByTorneo(id.trim())
      ]).then(function(r) { renderDetail(r[0], r[1]); }).catch(function() {});
    } else {
      api.getTorneos().then(function(t) { renderList(t); }).catch(function() {});
    }
  }, 15000);
})();
