(function () {
  "use strict";

  var TS = typeof TournamentStore !== "undefined" ? TournamentStore : null;
  if (!TS) return;

  var loginBox = document.getElementById("loginBox");
  var panel = document.getElementById("adminPanel");
  var pwdInput = document.getElementById("adminPwd");
  var pwdErr = document.getElementById("pwdErr");
  var btnLogin = document.getElementById("btnLogin");
  var btnLogout = document.getElementById("btnLogout");

  var newPwd = document.getElementById("newPwd");
  var btnSavePwd = document.getElementById("btnSavePwd");
  var pwdMsg = document.getElementById("pwdMsg");
  var registryList = document.getElementById("registryList");
  var registryEmpty = document.getElementById("registryEmpty");
  var registryFilterTorneo = document.getElementById("registryFilterTorneo");

  var torneoNombre = document.getElementById("torneoNombre");
  var torneoFecha = document.getElementById("torneoFecha");
  var torneoHora = document.getElementById("torneoHora");
  var torneoTipoFormato = document.getElementById("torneoTipoFormato");
  var torneoModalidad = document.getElementById("torneoModalidad");
  var btnAddTorneo = document.getElementById("btnAddTorneo");
  var torneoMsg = document.getElementById("torneoMsg");
  var torneoList = document.getElementById("torneoList");

  var bracketIndividualCard = document.getElementById("bracketIndividualCard");
  var bracketModeHint = document.getElementById("bracketModeHint");
  var bracketMainList = document.getElementById("bracketMainList");
  var bracketWaitList = document.getElementById("bracketWaitList");
  var bracketMainEmpty = document.getElementById("bracketMainEmpty");
  var bracketWaitEmpty = document.getElementById("bracketWaitEmpty");
  var btnBracketSync = document.getElementById("btnBracketSync");

  var knockoutAdminCard = document.getElementById("knockoutAdminCard");
  var knockoutAdminLead = document.getElementById("knockoutAdminLead");
  var knockoutAdminMsg = document.getElementById("knockoutAdminMsg");
  var knockoutAdminTree = document.getElementById("knockoutAdminTree");
  var btnKnockoutGenerate = document.getElementById("btnKnockoutGenerate");
  var btnKnockoutDelete = document.getElementById("btnKnockoutDelete");
  var btnKnockoutClearResults = document.getElementById("btnKnockoutClearResults");

  var REG_CAT_LABELS = {
    individual: "Individual (FFA)",
    "1v1": "1v1 (1 jugador / inscripción)",
    "2v2": "2v2 (dúo, 2 jugadores)",
    "4v4": "4v4 (equipos)",
  };

  var FORMATO_LABELS = {
    liga: "Liga",
    eliminatoria: "Eliminatoria",
  };

  var ESTADO_TORNEO_LABELS = {
    inscripcion: "Inscripción abierta",
    en_curso: "En curso",
    finalizado: "Finalizado",
  };

  function formatoYModalidadLine(t) {
    if (!t) return "";
    var f = FORMATO_LABELS[t.tipoFormato] || t.tipoFormato || "—";
    var m =
      t.modalidad ? REG_CAT_LABELS[t.modalidad] || t.modalidad : "Cualquier modalidad (antiguo)";
    return f + " · " + m;
  }

  function registryEntryPlayerLine(ent) {
    var p = (ent.players || [])[0];
    if (!p) return "Inscripción " + (ent.id || "").slice(0, 8);
    return (p.nick || "—") + " (ID " + (p.mlId || "—") + ")";
  }

  function registryEntryBracketLine(ent) {
    if (!ent) return "—";
    if (ent.teamName) {
      return ent.teamName + " · " + registryEntryPlayerLine(ent);
    }
    return registryEntryPlayerLine(ent);
  }

  function entryLabelMap(torneoId) {
    var m = {};
    if (typeof TorneosStore === "undefined") return m;
    TorneosStore.registryEntriesForTorneo(torneoId).forEach(function (e) {
      if (e && e.id) m[e.id] = registryEntryBracketLine(e);
    });
    return m;
  }

  function matchSideLabel(id, map) {
    if (!id) return "—";
    return map[id] || "(Inscripción " + String(id).slice(0, 8) + "…)";
  }

  function shortBracketName(s) {
    if (!s || s.length <= 28) return s || "—";
    return s.slice(0, 26) + "…";
  }

  function refreshIndividualBracketPanel() {
    if (!bracketIndividualCard || typeof IndividualBracketStore === "undefined") {
      if (bracketIndividualCard) bracketIndividualCard.hidden = true;
      return;
    }
    var tid =
      registryFilterTorneo && registryFilterTorneo.value ?
        registryFilterTorneo.value
      : "";
    if (!tid || tid === "__none__") {
      bracketIndividualCard.hidden = true;
      return;
    }
    var tor = typeof TorneosStore !== "undefined" ? TorneosStore.getTorneo(tid) : null;
    if (!tor || !IndividualBracketStore.torneoTieneModalidadPool(tid)) {
      bracketIndividualCard.hidden = true;
      return;
    }
    var b = IndividualBracketStore.getResolved(tid);
    if (!b) {
      bracketIndividualCard.hidden = true;
      return;
    }
    bracketIndividualCard.hidden = false;
    bracketIndividualCard.setAttribute("data-bracket-torneo", tid);

    if (bracketModeHint) {
      if (b.manual) {
        bracketModeHint.textContent =
          "Modo manual: al inscribirse, los nuevos van al final de la lista de espera. Usa «Sincronizar» para volver al orden puro de registro (primeros 8 al grupo).";
        bracketModeHint.className = "hint hint--ok";
      } else {
        bracketModeHint.textContent =
          "Automático: el grupo principal son siempre los 8 primeros por fecha de registro; el resto en lista de espera.";
        bracketModeHint.className = "hint";
      }
    }

    var mainFull = b.mainIds.length >= IndividualBracketStore.MAIN_MAX;

    if (bracketMainList) {
      bracketMainList.innerHTML = "";
      b.mainEntries.forEach(function (ent, idx) {
        var li = document.createElement("li");
        li.className = "bracket-list__item";
        var slot = document.createElement("span");
        slot.className = "bracket-list__slot";
        slot.textContent = "#" + (idx + 1);
        li.appendChild(slot);
        var txt = document.createElement("span");
        txt.className = "bracket-list__txt";
        txt.textContent = registryEntryBracketLine(ent);
        li.appendChild(txt);
        var dem = document.createElement("button");
        dem.type = "button";
        dem.className = "btn btn--ghost bracket-list__btn";
        dem.textContent = "A lista de espera";
        dem.setAttribute("data-bracket-act", "demote");
        dem.setAttribute("data-entry-id", ent.id);
        li.appendChild(dem);
        bracketMainList.appendChild(li);
      });
    }
    if (bracketMainEmpty) bracketMainEmpty.hidden = b.mainEntries.length > 0;

    if (bracketWaitList) {
      bracketWaitList.innerHTML = "";
      b.waitlistEntries.forEach(function (ent, idx) {
        var li = document.createElement("li");
        li.className = "bracket-list__item";
        var slot = document.createElement("span");
        slot.className = "bracket-list__slot";
        slot.textContent = "Esp." + (idx + 1);
        li.appendChild(slot);
        var txt = document.createElement("span");
        txt.className = "bracket-list__txt";
        txt.textContent = registryEntryBracketLine(ent);
        li.appendChild(txt);
        var pr = document.createElement("button");
        pr.type = "button";
        pr.className = "btn btn--ghost bracket-list__btn";
        pr.textContent = "Subir al principal";
        pr.setAttribute("data-bracket-act", "promote");
        pr.setAttribute("data-entry-id", ent.id);
        if (mainFull) {
          pr.disabled = true;
          pr.title = "El grupo principal está lleno (8). Primero pasa alguien a lista de espera.";
        }
        li.appendChild(pr);
        bracketWaitList.appendChild(li);
      });
    }
    if (bracketWaitEmpty) bracketWaitEmpty.hidden = b.waitlistEntries.length > 0;
  }

  function refreshKnockoutAdminPanel() {
    if (!knockoutAdminCard || typeof KnockoutStore === "undefined") {
      if (knockoutAdminCard) knockoutAdminCard.hidden = true;
      return;
    }
    var tid =
      registryFilterTorneo && registryFilterTorneo.value ?
        registryFilterTorneo.value
      : "";
    if (!tid || tid === "__none__") {
      knockoutAdminCard.hidden = true;
      return;
    }
    var tor = typeof TorneosStore !== "undefined" ? TorneosStore.getTorneo(tid) : null;
    if (!tor || tor.tipoFormato !== "eliminatoria") {
      knockoutAdminCard.hidden = true;
      return;
    }
    knockoutAdminCard.hidden = false;
    knockoutAdminCard.setAttribute("data-knockout-torneo", tid);
    if (knockoutAdminMsg) {
      knockoutAdminMsg.textContent = "";
      knockoutAdminMsg.className = "hint";
    }

    var IB = typeof IndividualBracketStore !== "undefined" ? IndividualBracketStore : null;
    var b = IB ? IB.getResolved(tid) : null;
    var k = KnockoutStore.get(tid);

    if (knockoutAdminLead) {
      if (!b || b.mainIds.length !== 8) {
        knockoutAdminLead.textContent =
          "Para generar llaves hace falta exactamente 8 inscripciones en el grupo principal (panel de arriba). Ahora hay " +
          (b ? b.mainIds.length : 0) +
          ".";
      } else {
        knockoutAdminLead.textContent =
          "El cuadro toma el orden #1–#8 del grupo principal. Registra el ganador de cada partido.";
      }
    }

    var hasKo = !!(k && k.rounds);
    if (btnKnockoutGenerate) {
      btnKnockoutGenerate.disabled = hasKo || !b || b.mainIds.length !== 8;
      btnKnockoutGenerate.title = hasKo ?
        "Ya hay llaves; bórralas para generar de nuevo."
      : !b || b.mainIds.length !== 8 ?
        "Requieren 8 en el grupo principal."
      : "";
    }
    if (btnKnockoutDelete) {
      btnKnockoutDelete.disabled = !hasKo;
    }
    if (btnKnockoutClearResults) {
      btnKnockoutClearResults.disabled = !hasKo;
    }

    if (!knockoutAdminTree) return;
    knockoutAdminTree.innerHTML = "";
    if (!hasKo) return;

    var labelMap = entryLabelMap(tid);
    k.rounds.forEach(function (round, ri) {
      var sec = document.createElement("section");
      sec.className = "knockout-round";
      var h = document.createElement("h3");
      h.className = "knockout-round__title";
      h.textContent = round.label || "Ronda " + (ri + 1);
      sec.appendChild(h);
      round.matches.forEach(function (m, mi) {
        var box = document.createElement("div");
        box.className = "knockout-match";
        var la = matchSideLabel(m.a, labelMap);
        var lb = matchSideLabel(m.b, labelMap);
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
        var acts = document.createElement("div");
        acts.className = "knockout-match__actions";
        if (m.a && m.b && !m.winner) {
          var ba = document.createElement("button");
          ba.type = "button";
          ba.className = "btn btn--ghost btn--xs";
          ba.textContent = "Gana: " + shortBracketName(la);
          ba.setAttribute("data-ko-win", m.a);
          ba.setAttribute("data-ko-r", String(ri));
          ba.setAttribute("data-ko-m", String(mi));
          var bb = document.createElement("button");
          bb.type = "button";
          bb.className = "btn btn--ghost btn--xs";
          bb.textContent = "Gana: " + shortBracketName(lb);
          bb.setAttribute("data-ko-win", m.b);
          bb.setAttribute("data-ko-r", String(ri));
          bb.setAttribute("data-ko-m", String(mi));
          acts.appendChild(ba);
          acts.appendChild(bb);
        } else if (m.winner) {
          var clr = document.createElement("button");
          clr.type = "button";
          clr.className = "btn btn--ghost btn--xs";
          clr.textContent = "Anular resultado";
          clr.setAttribute("data-ko-clear", "1");
          clr.setAttribute("data-ko-r", String(ri));
          clr.setAttribute("data-ko-m", String(mi));
          acts.appendChild(clr);
        }
        box.appendChild(acts);
        sec.appendChild(box);
      });
      knockoutAdminTree.appendChild(sec);
    });
  }

  function showLogin() {
    if (loginBox) loginBox.hidden = false;
    if (panel) panel.hidden = true;
    if (btnLogout) btnLogout.hidden = true;
  }

  function showPanel() {
    if (loginBox) loginBox.hidden = true;
    if (panel) panel.hidden = false;
    if (btnLogout) btnLogout.hidden = false;
    refresh();
  }

  function formatTorneoWhen(t) {
    if (!t || !t.fecha) return "—";
    try {
      var iso = t.fecha + "T" + (t.hora && t.hora.length ? t.hora : "00:00");
      var d = new Date(iso);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch (e) {}
    return t.fecha + (t.hora ? " " + t.hora : "");
  }

  function refreshTorneoFilterOptions() {
    if (!registryFilterTorneo || typeof TorneosStore === "undefined") return;
    var sel = registryFilterTorneo.value;
    var tor = TorneosStore.loadTorneos().list || [];
    registryFilterTorneo.innerHTML =
      '<option value="">Todos</option>' +
      '<option value="__none__">Sin torneo asignado</option>';
    tor
      .slice()
      .sort(function (a, b) {
        var af = (a.fecha || "") + (a.hora || "");
        var bf = (b.fecha || "") + (b.hora || "");
        return af.localeCompare(bf);
      })
      .forEach(function (t) {
        var opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent =
          t.nombre + " · " + formatTorneoWhen(t) + " · " + formatoYModalidadLine(t);
        registryFilterTorneo.appendChild(opt);
      });
    if ([].slice.call(registryFilterTorneo.options).some(function (o) { return o.value === sel; })) {
      registryFilterTorneo.value = sel;
    }
  }

  function refreshTorneoAdminList() {
    if (!torneoList || typeof TorneosStore === "undefined") return;
    torneoList.innerHTML = "";
    var tor = TorneosStore.loadTorneos().list || [];
    if (tor.length === 0) {
      var empty = document.createElement("li");
      empty.className = "muted";
      empty.textContent = "No hay torneos. Añade uno con fecha y hora.";
      torneoList.appendChild(empty);
      return;
    }
    tor
      .slice()
      .sort(function (a, b) {
        var af = (a.fecha || "") + (a.hora || "");
        var bf = (b.fecha || "") + (b.hora || "");
        return af.localeCompare(bf);
      })
      .forEach(function (t) {
        var li = document.createElement("li");
        li.className = "torneo-admin-item";
        var title = document.createElement("div");
        title.className = "torneo-admin-item__title";
        title.textContent = t.nombre;
        li.appendChild(title);
        var when = document.createElement("div");
        when.className = "muted torneo-admin-item__when";
        when.textContent = formatTorneoWhen(t);
        li.appendChild(when);
        var fmt = document.createElement("div");
        fmt.className = "torneo-admin-item__fmt muted";
        fmt.textContent = formatoYModalidadLine(t);
        li.appendChild(fmt);
        var est = document.createElement("div");
        est.className =
          "torneo-admin-item__estado torneo-admin-item__estado--" +
          (t.estado || "inscripcion");
        est.textContent =
          ESTADO_TORNEO_LABELS[t.estado || "inscripcion"] ||
          (t.estado || "—");
        li.appendChild(est);
        var actions = document.createElement("div");
        actions.className = "torneo-admin-item__actions";
        if (typeof TorneosStore !== "undefined" && TorneosStore.updateTorneo) {
          var st = t.estado || "inscripcion";
          if (st === "inscripcion") {
            var bStart = document.createElement("button");
            bStart.type = "button";
            bStart.className = "btn btn--primary";
            bStart.textContent = "Iniciar torneo";
            bStart.addEventListener("click", function () {
              if (
                !confirm(
                  "Se cerrarán las inscripciones en línea para este torneo. ¿Continuar?"
                )
              ) {
                return;
              }
              TorneosStore.updateTorneo(t.id, { estado: "en_curso" });
              if (torneoMsg) {
                torneoMsg.textContent =
                  "Estado: en curso. El registro ya no ofrecerá este torneo.";
                torneoMsg.className = "hint hint--ok";
              }
              refresh();
            });
            actions.appendChild(bStart);
          }
          if (st === "en_curso") {
            var bFin = document.createElement("button");
            bFin.type = "button";
            bFin.className = "btn btn--ghost";
            bFin.textContent = "Finalizar";
            bFin.addEventListener("click", function () {
              TorneosStore.updateTorneo(t.id, { estado: "finalizado" });
              if (torneoMsg) {
                torneoMsg.textContent = "Torneo marcado como finalizado.";
                torneoMsg.className = "hint hint--ok";
              }
              refresh();
            });
            var bReab = document.createElement("button");
            bReab.type = "button";
            bReab.className = "btn btn--ghost";
            bReab.textContent = "Reabrir inscripciones";
            bReab.addEventListener("click", function () {
              if (!confirm("¿Volver a abrir inscripciones para este torneo?")) {
                return;
              }
              TorneosStore.updateTorneo(t.id, { estado: "inscripcion" });
              if (torneoMsg) {
                torneoMsg.textContent = "Inscripciones abiertas de nuevo.";
                torneoMsg.className = "hint hint--ok";
              }
              refresh();
            });
            actions.appendChild(bFin);
            actions.appendChild(bReab);
          }
          if (st === "finalizado") {
            var bReab2 = document.createElement("button");
            bReab2.type = "button";
            bReab2.className = "btn btn--ghost";
            bReab2.textContent = "Reabrir inscripciones";
            bReab2.addEventListener("click", function () {
              if (!confirm("¿Volver a abrir inscripciones para este torneo?")) {
                return;
              }
              TorneosStore.updateTorneo(t.id, { estado: "inscripcion" });
              if (torneoMsg) {
                torneoMsg.textContent = "Inscripciones abiertas de nuevo.";
                torneoMsg.className = "hint hint--ok";
              }
              refresh();
            });
            actions.appendChild(bReab2);
          }
        }
        var link = document.createElement("a");
        link.className = "btn btn--ghost";
        link.href = "torneo.html?id=" + encodeURIComponent(t.id);
        link.textContent = "Vista pública";
        actions.appendChild(link);
        var del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn--ghost";
        del.textContent = "Eliminar";
        del.addEventListener("click", function () {
          if (!confirm("¿Eliminar este torneo del calendario? Las inscripciones ya guardadas seguirán ligadas a su ID."))
            return;
          TorneosStore.removeTorneo(t.id);
          if (torneoMsg) {
            torneoMsg.textContent = "Torneo eliminado.";
            torneoMsg.className = "hint hint--ok";
          }
          refresh();
        });
        actions.appendChild(del);
        li.appendChild(actions);
        torneoList.appendChild(li);
      });
  }

  function refresh() {
    refreshTorneoFilterOptions();
    refreshTorneoAdminList();

    if (typeof RegistryStore !== "undefined") {
      var reg = RegistryStore.loadRegistry();
      var entries = reg.entries || [];
      var filterVal =
        registryFilterTorneo && registryFilterTorneo.value !== undefined ?
          registryFilterTorneo.value
        : "";
      var filtered = entries.filter(function (ent) {
        if (!filterVal) return true;
        if (filterVal === "__none__") return !ent.torneoId;
        return ent.torneoId === filterVal;
      });
      if (registryEmpty) {
        if (entries.length === 0) {
          registryEmpty.hidden = false;
          registryEmpty.textContent = "No hay inscripciones guardadas.";
        } else if (filtered.length === 0) {
          registryEmpty.hidden = false;
          registryEmpty.textContent =
            "Ninguna inscripción coincide con el torneo seleccionado.";
        } else {
          registryEmpty.hidden = true;
        }
      }
      if (registryList) {
        registryList.innerHTML = "";
        filtered
          .slice()
          .reverse()
          .forEach(function (ent) {
            var li = document.createElement("li");
            li.className = "registry-card";
            var cat =
              REG_CAT_LABELS[ent.category] || ent.category || "—";
            var title = document.createElement("div");
            title.className = "registry-card__head";
            var strong = document.createElement("strong");
            strong.textContent = cat;
            title.appendChild(strong);
            if (ent.teamName) {
              title.appendChild(document.createTextNode(" · "));
              var teamSpan = document.createElement("span");
              teamSpan.className = "registry-card__team";
              teamSpan.textContent = ent.teamName;
              title.appendChild(teamSpan);
            }
            li.appendChild(title);
            var meta = document.createElement("p");
            meta.className = "muted registry-card__meta";
            var metaParts = [];
            if (ent.registeredAt) {
              metaParts.push("Registro: " + new Date(ent.registeredAt).toLocaleString());
            }
            if (ent.torneoId && typeof TorneosStore !== "undefined") {
              var tor = TorneosStore.getTorneo(ent.torneoId);
              if (tor) {
                metaParts.push(
                  "Torneo: " +
                    tor.nombre +
                    " (" +
                    formatTorneoWhen(tor) +
                    " · " +
                    formatoYModalidadLine(tor) +
                    ")"
                );
              } else {
                metaParts.push("Torneo: (eliminado del calendario)");
              }
            } else if (!ent.torneoId) {
              metaParts.push("Torneo: sin asignar");
            }
            meta.textContent = metaParts.join(" · ");
            li.appendChild(meta);
            var ul = document.createElement("ul");
            ul.className = "registry-players";
            (ent.players || []).forEach(function (p) {
              var pli = document.createElement("li");
              var parts = [
                p.nick || "—",
                " (ID: " + (p.mlId || "—") + ")",
              ];
              if (p.role === "captain") parts.push(" · Capitán");
              if (p.substitute) parts.push(" · Suplente");
              if (p.role === "captain" && p.phone) {
                parts.push(" · Tel: " + p.phone);
              }
              pli.textContent = parts.join("");
              ul.appendChild(pli);
            });
            li.appendChild(ul);
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn btn--ghost registry-card__del";
            btn.textContent = "Eliminar inscripción";
            btn.setAttribute("data-registry-id", ent.id);
            btn.addEventListener("click", function () {
              if (!confirm("¿Eliminar esta inscripción?")) return;
              RegistryStore.removeRegistryEntry(ent.id);
              refresh();
            });
            li.appendChild(btn);
            registryList.appendChild(li);
          });
      }
    }

    refreshIndividualBracketPanel();
    refreshKnockoutAdminPanel();
  }

  if (registryFilterTorneo) {
    registryFilterTorneo.addEventListener("change", function () {
      refresh();
    });
  }

  if (btnBracketSync) {
    btnBracketSync.addEventListener("click", function () {
      var tid =
        bracketIndividualCard &&
        bracketIndividualCard.getAttribute("data-bracket-torneo");
      if (!tid || typeof IndividualBracketStore === "undefined") return;
      if (!confirm("¿Reordenar según fecha de registro? Los 8 primeros irán al grupo principal."))
        return;
      IndividualBracketStore.syncToRegistry(tid);
      refresh();
    });
  }

  if (bracketIndividualCard) {
    bracketIndividualCard.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-bracket-act]");
      if (!btn || typeof IndividualBracketStore === "undefined") return;
      var act = btn.getAttribute("data-bracket-act");
      var eid = btn.getAttribute("data-entry-id");
      var tid = bracketIndividualCard.getAttribute("data-bracket-torneo");
      if (!tid || !eid) return;
      if (act === "demote") {
        IndividualBracketStore.demote(tid, eid);
        refresh();
      } else if (act === "promote") {
        if (btn.disabled) return;
        IndividualBracketStore.promote(tid, eid);
        refresh();
      }
    });
  }

  if (knockoutAdminCard) {
    knockoutAdminCard.addEventListener("click", function (e) {
      var winBtn = e.target.closest("[data-ko-win]");
      var clrBtn = e.target.closest("[data-ko-clear]");
      var tid = knockoutAdminCard.getAttribute("data-knockout-torneo");
      if (!tid || typeof KnockoutStore === "undefined") return;
      if (winBtn) {
        var wid = winBtn.getAttribute("data-ko-win");
        var r = parseInt(winBtn.getAttribute("data-ko-r"), 10);
        var mi = parseInt(winBtn.getAttribute("data-ko-m"), 10);
        KnockoutStore.setWinner(tid, r, mi, wid);
        refresh();
        return;
      }
      if (clrBtn) {
        var r2 = parseInt(clrBtn.getAttribute("data-ko-r"), 10);
        var mi2 = parseInt(clrBtn.getAttribute("data-ko-m"), 10);
        KnockoutStore.clearMatch(tid, r2, mi2);
        refresh();
      }
    });
  }

  if (btnKnockoutGenerate && knockoutAdminCard) {
    btnKnockoutGenerate.addEventListener("click", function () {
      var tid = knockoutAdminCard.getAttribute("data-knockout-torneo");
      if (
        !tid ||
        typeof KnockoutStore === "undefined" ||
        typeof IndividualBracketStore === "undefined"
      ) {
        return;
      }
      if (KnockoutStore.get(tid)) {
        if (knockoutAdminMsg) {
          knockoutAdminMsg.textContent =
            "Ya existe un cuadro. Bórralo antes de generar otro.";
          knockoutAdminMsg.className = "hint hint--err";
        }
        return;
      }
      var b = IndividualBracketStore.getResolved(tid);
      if (!b || b.mainIds.length !== 8) {
        if (knockoutAdminMsg) {
          knockoutAdminMsg.textContent =
            "El grupo principal debe tener exactamente 8 inscripciones.";
          knockoutAdminMsg.className = "hint hint--err";
        }
        return;
      }
      if (
        !confirm(
          "¿Generar eliminatoria de 8 con el orden actual del grupo principal?"
        )
      ) {
        return;
      }
      KnockoutStore.generateElim8(tid, b.mainIds);
      refresh();
    });
  }

  if (btnKnockoutDelete && knockoutAdminCard) {
    btnKnockoutDelete.addEventListener("click", function () {
      var tid = knockoutAdminCard.getAttribute("data-knockout-torneo");
      if (!tid || typeof KnockoutStore === "undefined") return;
      if (!KnockoutStore.get(tid)) return;
      if (!confirm("¿Borrar por completo las llaves de este torneo?")) return;
      KnockoutStore.deleteForTorneo(tid);
      refresh();
    });
  }

  if (btnKnockoutClearResults && knockoutAdminCard) {
    btnKnockoutClearResults.addEventListener("click", function () {
      var tid = knockoutAdminCard.getAttribute("data-knockout-torneo");
      if (!tid || typeof KnockoutStore === "undefined") return;
      if (!KnockoutStore.get(tid)) return;
      if (!confirm("¿Quitar todos los ganadores registrados?")) return;
      KnockoutStore.clearFromRound(tid, 0, 0);
      refresh();
    });
  }

  if (btnAddTorneo && torneoNombre && torneoFecha) {
    btnAddTorneo.addEventListener("click", function () {
      if (torneoMsg) {
        torneoMsg.textContent = "";
        torneoMsg.className = "hint";
      }
      var nom = torneoNombre.value.trim();
      var fe = torneoFecha.value;
      var ho = torneoHora ? torneoHora.value : "";
      if (!nom) {
        if (torneoMsg) {
          torneoMsg.textContent = "Indica el nombre del torneo.";
          torneoMsg.className = "hint hint--err";
        }
        return;
      }
      if (!fe) {
        if (torneoMsg) {
          torneoMsg.textContent = "Indica la fecha.";
          torneoMsg.className = "hint hint--err";
        }
        return;
      }
      var tipoF = torneoTipoFormato ? torneoTipoFormato.value : "eliminatoria";
      var mod = torneoModalidad ? torneoModalidad.value : "";
      if (!mod) {
        if (torneoMsg) {
          torneoMsg.textContent = "Elige la modalidad de inscripción del torneo.";
          torneoMsg.className = "hint hint--err";
        }
        return;
      }
      if (typeof TorneosStore !== "undefined") {
        TorneosStore.addTorneo(nom, fe, ho, tipoF, mod);
        torneoNombre.value = "";
        torneoFecha.value = "";
        if (torneoHora) torneoHora.value = "";
        if (torneoModalidad) torneoModalidad.selectedIndex = 0;
        if (torneoMsg) {
          torneoMsg.textContent = "Torneo añadido.";
          torneoMsg.className = "hint hint--ok";
        }
        refresh();
      }
    });
  }

  if (TS.isAdminSession()) {
    showPanel();
  } else {
    showLogin();
  }

  if (btnLogin && pwdInput) {
    btnLogin.addEventListener("click", function () {
      if (pwdErr) pwdErr.textContent = "";
      if (pwdInput.value === TS.getAdminPassword()) {
        TS.setAdminSession(true);
        pwdInput.value = "";
        showPanel();
      } else if (pwdErr) {
        pwdErr.textContent = "Contraseña incorrecta.";
      }
    });
    pwdInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") btnLogin.click();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      TS.setAdminSession(false);
      showLogin();
    });
  }

  if (btnSavePwd && newPwd) {
    btnSavePwd.addEventListener("click", function () {
      if (TS.setAdminPassword(newPwd.value)) {
        newPwd.value = "";
        if (pwdMsg) {
          pwdMsg.textContent = "Contraseña actualizada.";
          pwdMsg.className = "hint hint--ok";
        }
      } else {
        if (pwdMsg) {
          pwdMsg.textContent = "Mínimo 4 caracteres.";
          pwdMsg.className = "hint hint--err";
        }
      }
    });
  }
})();
