(function() {
  "use strict";

  var api = window.apiClient;
  var S = window.Shared;
  if (!api || !S) return;

  // ── DOM Elements ──
  // Tabs
  var tabJoin      = document.getElementById("tabJoin");
  var tabInscribir = document.getElementById("tabInscribir");
  var panelJoin    = document.getElementById("panelJoin");
  var panelInscr   = document.getElementById("panelInscribir");

  // Join panel
  var filterCategory = document.getElementById("filterCategory");
  var equipoGrid     = document.getElementById("equipoGrid");
  var joinLoading    = document.getElementById("joinLoading");
  var joinMsg        = document.getElementById("joinMsg");

  // Inscribir panel
  var btnVerifyCaptain = document.getElementById("btnVerifyCaptain");
  var verifyErr        = document.getElementById("verifyErr");
  var captainEquipos   = document.getElementById("captainEquipos");
  var captainEquiposList = document.getElementById("captainEquiposList");
  var inscribirMsg     = document.getElementById("inscribirMsg");

  // Join modal
  var joinModal      = document.getElementById("joinModal");
  var modalTitle     = document.getElementById("modalTitle");
  var joinSub        = document.getElementById("joinSub");
  var joinSubField   = document.getElementById("joinSubField");
  var joinModalErr   = document.getElementById("joinModalErr");
  var btnJoinConfirm = document.getElementById("btnJoinConfirm");
  var btnJoinCancel  = document.getElementById("btnJoinCancel");
  var currentJoinTarget = null; // team ID

  // Inscribir modal
  var inscribirModal      = document.getElementById("inscribirModal");
  var inscribirModalTitle = document.getElementById("inscribirModalTitle");
  var inscribirModalSubtitle = document.getElementById("inscribirModalSubtitle");
  var inscribirTorneo     = document.getElementById("inscribirTorneo");
  var inscribirModalErr   = document.getElementById("inscribirModalErr");
  var btnInscribirConfirm = document.getElementById("btnInscribirConfirm");
  var btnInscribirCancel  = document.getElementById("btnInscribirCancel");
  var currentInscribirTarget = null; // team ID
  var currentInscribirCategory = null;

  var cachedTorneos = [];

  // ── Helpers ──
  function showHint(el, text, isErr) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "hint" + (isErr ? " hint--err" : text ? " hint--ok" : "");
    el.hidden = !text;
  }

  function switchTab(tab) {
    var isJoin = tab === "join";
    if (tabJoin)      { tabJoin.classList.toggle("active", isJoin);   tabJoin.setAttribute("aria-selected", String(isJoin)); }
    if (tabInscribir) { tabInscribir.classList.toggle("active", !isJoin); tabInscribir.setAttribute("aria-selected", String(!isJoin)); }
    if (panelJoin)    panelJoin.classList.toggle("active", isJoin);
    if (panelInscr)   panelInscr.classList.toggle("active", !isJoin);
  }

  // ── Load Torneos (for inscribir modal) ──
  function loadTorneos() {
    api.getTorneos({ estado: "inscripcion" }).then(function(res) {
      cachedTorneos = res || [];
    }).catch(function() {});
  }

  // ── Load Equipos (Join Panel) ──
  function loadEquiposToJoin() {
    if (joinLoading) joinLoading.hidden = false;
    showHint(joinMsg, "", false);
    if (equipoGrid) equipoGrid.innerHTML = "";

    var cat = filterCategory ? filterCategory.value : "";
    
    // Solo mostramos equipos que están formando, no los ya inscritos
    api.getEquipos({ status: "formando", category: cat }).then(function(equipos) {
      if (joinLoading) joinLoading.hidden = true;
      if (equipos.length === 0) {
        if (equipoGrid) {
          equipoGrid.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>No hay equipos formando en esta categoría.</p></div>';
        }
        return;
      }
      renderEquipoGrid(equipos);
    }).catch(function(err) {
      if (joinLoading) joinLoading.hidden = true;
      showHint(joinMsg, err.message || "Error cargando equipos.", true);
    });
  }

  function renderEquipoGrid(equipos) {
    if (!equipoGrid) return;
    equipoGrid.innerHTML = "";
    
    equipos.forEach(function(eq) {
      var card = document.createElement("div");
      card.className = "equipo-card";
      
      var slots = eq.slots || {};
      var hasSpace = slots.titularsLeft > 0 || slots.subsLeft > 0;
      var teamNameStr = eq.teamName || (eq.captain.nick + "'s Team");

      var html = '<div class="equipo-card__header">' +
        '<div class="equipo-card__name">' + teamNameStr + '</div>' +
        '<div class="equipo-card__badge">' + (S.REG_CAT_LABELS[eq.category] || eq.category) + '</div>' +
        '</div>';
      
      html += '<div class="equipo-card__captain">Capitán: <strong>' + eq.captain.nick + '</strong> <span class="muted">(ID: ' + eq.captain.mlId + ')</span></div>';
      
      if (eq.players && eq.players.length > 0) {
        html += '<ul class="equipo-card__members">';
        eq.players.forEach(function(p) {
          html += '<li>' + p.nick + ' <span class="muted">(ID: ' + p.mlId + ')</span>' + (p.substitute ? ' <span class="sub-tag">Suplente</span>' : '') + '</li>';
        });
        html += '</ul>';
      }

      html += '<div class="equipo-card__slots">';
      if (slots.maxTitulars > 0) {
        var tCls = slots.titularsLeft > 0 ? "slot-pill--open" : "slot-pill--full";
        html += '<span class="slot-pill ' + tCls + '">Titulares: ' + slots.titularsLeft + ' disp.</span>';
      }
      if (slots.maxSubs > 0) {
        var sCls = slots.subsLeft > 0 ? "slot-pill--open" : "slot-pill--full";
        html += '<span class="slot-pill ' + sCls + '">Suplentes: ' + slots.subsLeft + ' disp.</span>';
      }
      html += '</div>';

      if (hasSpace) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--primary";
        btn.style.marginTop = "auto";
        btn.textContent = "Unirme";
        btn.onclick = function() { openJoinModal(eq); };
        
        // Use a wrapper to safely append HTML and the button
        var wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        while (wrapper.firstChild) card.appendChild(wrapper.firstChild);
        card.appendChild(btn);
      } else {
        html += '<div class="muted" style="margin-top:auto; font-size:0.85rem;">Equipo lleno</div>';
        card.innerHTML = html;
      }

      equipoGrid.appendChild(card);
    });
  }

  // ── Join Modal ──
  function openJoinModal(eq) {
    currentJoinTarget = eq._id || eq.id;
    if (modalTitle) modalTitle.textContent = "Unirse a " + (eq.teamName || eq.captain.nick + "'s Team");
    showHint(joinModalErr, "", false);
    
    // Configurar checkbox de suplente
    if (joinSubField) {
      if (eq.slots.maxSubs === 0) {
        joinSubField.style.display = "none";
        if (joinSub) joinSub.checked = false;
      } else {
        joinSubField.style.display = "block";
        // Si no hay titulares, forzar suplente
        if (eq.slots.titularsLeft <= 0) {
          if (joinSub) { joinSub.checked = true; joinSub.disabled = true; }
        } else if (eq.slots.subsLeft <= 0) {
          if (joinSub) { joinSub.checked = false; joinSub.disabled = true; }
        } else {
          if (joinSub) { joinSub.checked = false; joinSub.disabled = false; }
        }
      }
    }
    
    if (joinModal) {
      joinModal.style.display = "flex";
      if (joinMlId) joinMlId.focus();
    }
  }

  function closeJoinModal() {
    if (joinModal) joinModal.style.display = "none";
    currentJoinTarget = null;
  }

  function handleJoinSubmit() {
    var isSub = joinSub ? joinSub.checked : false;

    if (!currentJoinTarget) return;

    if (btnJoinConfirm) btnJoinConfirm.disabled = true;
    showHint(joinModalErr, "Uniéndose...", false);

    api.joinEquipo(currentJoinTarget, { substitute: isSub })
      .then(function() {
        closeJoinModal();
        loadEquiposToJoin(); // refresh
      })
      .catch(function(err) {
        showHint(joinModalErr, err.message, true);
      })
      .finally(function() {
        if (btnJoinConfirm) btnJoinConfirm.disabled = false;
      });
  }

  // ── Inscribir Panel (Captain Verify) ──
  function handleVerifyCaptain() {
    if (btnVerifyCaptain) btnVerifyCaptain.disabled = true;
    showHint(verifyErr, "Buscando tus equipos...", false);

    api.getMe().then(function(user) {
      var cId = user.mlId;
      if (!cId) {
        showHint(verifyErr, "Tu cuenta no tiene un ID ML configurado. Completa tu registro.", true);
        if (btnVerifyCaptain) btnVerifyCaptain.disabled = false;
        return;
      }

      api.getEquipos().then(function(all) {
        var myTeams = all.filter(function(eq) {
          return eq.captain && eq.captain.mlId === cId;
        });

        if (myTeams.length === 0) {
          showHint(verifyErr, "No encontramos ningún equipo donde seas capitán.", true);
          if (captainEquipos) captainEquipos.hidden = true;
        } else {
          showHint(verifyErr, "", false);
          renderCaptainEquipos(myTeams, cId);
        }
      })
      .catch(function(err) {
        showHint(verifyErr, err.message || "Error buscando equipos.", true);
      })
      .finally(function() {
        if (btnVerifyCaptain) btnVerifyCaptain.disabled = false;
      });
    }).catch(function() {
      showHint(verifyErr, "Error validando sesión.", true);
      if (btnVerifyCaptain) btnVerifyCaptain.disabled = false;
    });
  }

  function renderCaptainEquipos(equipos, currentCaptainId) {
    if (captainEquipos) captainEquipos.hidden = false;
    if (captainEquiposList) captainEquiposList.innerHTML = "";

    equipos.forEach(function(eq) {
      var card = document.createElement("div");
      card.className = "equipo-inscribir-card";

      var statusBadge = eq.status === "inscrito" 
        ? '<span class="equipo-card__badge equipo-card__badge--inscrito">✅ Inscrito a ' + (eq.torneoId ? eq.torneoId.nombre : '') + '</span>'
        : '<span class="equipo-card__badge">Formando</span>';

      var teamNameStr = eq.teamName || (eq.captain.nick + "'s Team");

      var html = '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<h4>' + teamNameStr + ' <span style="font-weight:normal; font-size:0.8rem; color:var(--text-muted);">(' + (S.REG_CAT_LABELS[eq.category] || eq.category) + ')</span></h4>' +
        statusBadge +
        '</div>';

      var totalPlayers = 1 + (eq.players ? eq.players.length : 0);
      html += '<p class="muted">Integrantes: ' + totalPlayers + ' (tú + ' + (eq.players ? eq.players.length : 0) + ')</p>';

      if (eq.status !== "inscrito") {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--primary";
        btn.style.marginTop = "0.75rem";
        btn.textContent = "Inscribir a torneo";
        btn.onclick = function() { openInscribirModal(eq, currentCaptainId); };
        
        var wrap = document.createElement("div");
        wrap.innerHTML = html;
        while(wrap.firstChild) card.appendChild(wrap.firstChild);
        card.appendChild(btn);
      } else {
        card.innerHTML = html;
      }

      captainEquiposList.appendChild(card);
    });
  }

  // ── Inscribir Modal ──
  var currentCaptainMlIdForInscription = null;

  function openInscribirModal(eq, captainId) {
    currentInscribirTarget = eq._id || eq.id;
    currentInscribirCategory = eq.category;
    currentCaptainMlIdForInscription = captainId;

    if (inscribirModalTitle) inscribirModalTitle.textContent = "Inscribir " + (eq.teamName || eq.captain.nick + "'s Team");
    if (inscribirModalSubtitle) inscribirModalSubtitle.textContent = "Categoría: " + (S.REG_CAT_LABELS[eq.category] || eq.category);
    showHint(inscribirModalErr, "", false);
    
    populateTorneosForInscription(eq.category);

    if (inscribirModal) inscribirModal.style.display = "flex";
  }

  function closeInscribirModal() {
    if (inscribirModal) inscribirModal.style.display = "none";
    currentInscribirTarget = null;
    currentInscribirCategory = null;
    currentCaptainMlIdForInscription = null;
  }

  function populateTorneosForInscription(cat) {
    if (!inscribirTorneo) return;
    inscribirTorneo.innerHTML = "";
    
    var validTorneos = cachedTorneos.filter(function(t) {
      if (!t.modalidad) return true;
      return t.modalidad === cat;
    });

    if (validTorneos.length === 0) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "— No hay torneos para esta categoría —";
      inscribirTorneo.appendChild(opt);
      inscribirTorneo.disabled = true;
      if (btnInscribirConfirm) btnInscribirConfirm.disabled = true;
      return;
    }

    inscribirTorneo.disabled = false;
    if (btnInscribirConfirm) btnInscribirConfirm.disabled = false;

    var optFirst = document.createElement("option");
    optFirst.value = "";
    optFirst.textContent = "Selecciona un torneo...";
    inscribirTorneo.appendChild(optFirst);

    validTorneos.forEach(function(t) {
      var opt = document.createElement("option");
      opt.value = S.getId(t);
      opt.textContent = t.nombre + " · " + S.formatWhen(t);
      inscribirTorneo.appendChild(opt);
    });
  }

  function handleInscribirSubmit() {
    var tId = inscribirTorneo ? inscribirTorneo.value : "";
    if (!tId) { showHint(inscribirModalErr, "Selecciona un torneo válido", true); return; }
    if (!currentInscribirTarget || !currentCaptainMlIdForInscription) return;

    if (btnInscribirConfirm) btnInscribirConfirm.disabled = true;
    showHint(inscribirModalErr, "Inscribiendo...", false);

    api.inscribirEquipo(currentInscribirTarget, tId)
      .then(function() {
        closeInscribirModal();
        handleVerifyCaptain(); // Refresh list
      })
      .catch(function(err) {
        showHint(inscribirModalErr, err.message, true);
      })
      .finally(function() {
        if (btnInscribirConfirm) btnInscribirConfirm.disabled = false;
      });
  }

  // ── Listeners ──
  if (tabJoin)      tabJoin.addEventListener("click", function() { switchTab("join"); });
  if (tabInscribir) tabInscribir.addEventListener("click", function() { switchTab("inscribir"); });
  if (filterCategory) filterCategory.addEventListener("change", loadEquiposToJoin);
  
  if (btnJoinCancel)  btnJoinCancel.addEventListener("click", closeJoinModal);
  if (btnJoinConfirm) btnJoinConfirm.addEventListener("click", handleJoinSubmit);

  if (btnVerifyCaptain) btnVerifyCaptain.addEventListener("click", handleVerifyCaptain);

  if (btnInscribirCancel) btnInscribirCancel.addEventListener("click", closeInscribirModal);
  if (btnInscribirConfirm) btnInscribirConfirm.addEventListener("click", handleInscribirSubmit);

  // Close modals on overlay click
  window.addEventListener("click", function(e) {
    if (e.target === joinModal) closeJoinModal();
    if (e.target === inscribirModal) closeInscribirModal();
  });

  // ── Init ──
  loadTorneos();
  loadEquiposToJoin();

  // Load captain teams automatically if tab changes
  if (tabInscribir) {
    tabInscribir.addEventListener("click", function() {
      handleVerifyCaptain();
    });
  }

})();
