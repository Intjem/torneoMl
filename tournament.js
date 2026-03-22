(function (global) {
  "use strict";

  var ROLE_KEY = "MLBB_ROLE";
  var PWD_KEY = "MLBB_ADMIN_PWD";
  var ADMIN_SESSION_KEY = "MLBB_ADMIN_OK";

  function getRole() {
    try {
      return sessionStorage.getItem(ROLE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setRole(role) {
    if (role === "admin" || role === "user") {
      sessionStorage.setItem(ROLE_KEY, role);
    } else {
      sessionStorage.removeItem(ROLE_KEY);
    }
  }

  function clearRole() {
    sessionStorage.removeItem(ROLE_KEY);
  }

  function getAdminPassword() {
    return localStorage.getItem(PWD_KEY) || "admin123";
  }

  function setAdminPassword(pw) {
    if (typeof pw === "string" && pw.length >= 4) {
      localStorage.setItem(PWD_KEY, pw);
      return true;
    }
    return false;
  }

  /** Sesión del panel admin (solo página admin.html, no es seguridad real). */
  function isAdminSession() {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setAdminSession(active) {
    try {
      if (active) sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      else sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch (e) {}
  }

  global.TournamentStore = {
    getRole: getRole,
    setRole: setRole,
    clearRole: clearRole,
    getAdminPassword: getAdminPassword,
    setAdminPassword: setAdminPassword,
    isAdminSession: isAdminSession,
    setAdminSession: setAdminSession,
  };

  /* —— Registro de equipos / jugadores (localStorage aparte del bracket) —— */
  var REGISTRY_KEY = "MLBB_REGISTRY_V1";

  function registryUuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "r-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  }

  function defaultRegistry() {
    return { entries: [], updatedAt: null };
  }

  function loadRegistry() {
    try {
      var raw = localStorage.getItem(REGISTRY_KEY);
      if (!raw) return defaultRegistry();
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.entries)) return defaultRegistry();
      return {
        entries: data.entries,
        updatedAt: data.updatedAt || null,
      };
    } catch (e) {
      return defaultRegistry();
    }
  }

  function saveRegistry(reg) {
    reg.updatedAt = new Date().toISOString();
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(reg));
  }

  function addRegistryEntry(entry) {
    var r = loadRegistry();
    if (!entry || typeof entry !== "object") return null;
    entry.id = entry.id || registryUuid();
    entry.registeredAt =
      typeof entry.registeredAt === "string"
        ? entry.registeredAt
        : new Date().toISOString();
    r.entries.push(entry);
    saveRegistry(r);
    return entry;
  }

  function removeRegistryEntry(id) {
    var r = loadRegistry();
    var victim = null;
    for (var i = 0; i < r.entries.length; i++) {
      if (r.entries[i] && r.entries[i].id === id) {
        victim = r.entries[i];
        break;
      }
    }
    r.entries = r.entries.filter(function (e) {
      return e && e.id !== id;
    });
    saveRegistry(r);
    if (victim && victim.torneoId && typeof poolBracketOnEntryRemoved === "function") {
      poolBracketOnEntryRemoved(victim.torneoId, id);
    }
  }

  global.RegistryStore = {
    loadRegistry: loadRegistry,
    saveRegistry: saveRegistry,
    addRegistryEntry: addRegistryEntry,
    removeRegistryEntry: removeRegistryEntry,
    defaultRegistry: defaultRegistry,
  };

  /* —— Torneos programados (nombre + fecha + hora) —— */
  var TORNEOS_KEY = "MLBB_TORNEOS_V1";

  function defaultTorneos() {
    return { list: [], updatedAt: null };
  }

  var ESTADOS_TORNEO = ["inscripcion", "en_curso", "finalizado"];

  function normalizeTorneoItem(x) {
    if (!x || typeof x !== "object") return x;
    if (ESTADOS_TORNEO.indexOf(x.estado) < 0) x.estado = "inscripcion";
    return x;
  }

  function loadTorneos() {
    try {
      var raw = localStorage.getItem(TORNEOS_KEY);
      if (!raw) return defaultTorneos();
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.list)) return defaultTorneos();
      data.list = data.list.map(normalizeTorneoItem);
      return { list: data.list, updatedAt: data.updatedAt || null };
    } catch (e) {
      return defaultTorneos();
    }
  }

  function saveTorneos(t) {
    t.updatedAt = new Date().toISOString();
    localStorage.setItem(TORNEOS_KEY, JSON.stringify(t));
  }

  var MODALIDADES_VALIDAS = ["individual", "1v1", "2v2", "4v4"];

  /** Torneos sin modalidad (datos antiguos) aceptan cualquier categoría al inscribirse. */
  function torneoAceptaModalidad(torneo, modalidad) {
    if (!torneo || !modalidad) return false;
    var m = torneo.modalidad;
    if (m === undefined || m === null || m === "") return true;
    return m === modalidad;
  }

  function addTorneo(nombre, fecha, hora, tipoFormato, modalidad) {
    var t = loadTorneos();
    var id = registryUuid();
    var tf = tipoFormato === "liga" ? "liga" : "eliminatoria";
    var mod =
      MODALIDADES_VALIDAS.indexOf(modalidad) >= 0 ? modalidad : null;
    t.list.push(
      normalizeTorneoItem({
        id: id,
        nombre: String(nombre || "").trim(),
        fecha: String(fecha || "").trim(),
        hora: String(hora || "").trim(),
        tipoFormato: tf,
        modalidad: mod,
        estado: "inscripcion",
        createdAt: new Date().toISOString(),
      })
    );
    saveTorneos(t);
    return t.list[t.list.length - 1];
  }

  function removeTorneo(id) {
    var t = loadTorneos();
    t.list = t.list.filter(function (x) {
      return x && x.id !== id;
    });
    saveTorneos(t);
    try {
      var db = loadBracketIndivDB();
      if (db.byTorneoId[id]) {
        delete db.byTorneoId[id];
        saveBracketIndivDB(db);
      }
    } catch (e) {}
    try {
      knockoutDeleteTorneo(id);
    } catch (e2) {}
  }

  function updateTorneo(id, patch) {
    var t = loadTorneos();
    for (var i = 0; i < t.list.length; i++) {
      if (t.list[i].id === id) {
        var cur = t.list[i];
        if (patch && typeof patch === "object") {
          Object.keys(patch).forEach(function (k) {
            cur[k] = patch[k];
          });
        }
        normalizeTorneoItem(cur);
        saveTorneos(t);
        return cur;
      }
    }
    return null;
  }

  function torneoInscripcionesAbiertas(tor) {
    if (!tor) return false;
    return (tor.estado || "inscripcion") === "inscripcion";
  }

  function getTorneo(id) {
    var t = loadTorneos();
    for (var i = 0; i < t.list.length; i++) {
      if (t.list[i].id === id) return t.list[i];
    }
    return null;
  }

  /** Inscripciones de un torneo (por torneoId). */
  function registryEntriesForTorneo(torneoId) {
    var r = loadRegistry();
    return (r.entries || []).filter(function (e) {
      return e && e.torneoId === torneoId;
    });
  }

  global.TorneosStore = {
    loadTorneos: loadTorneos,
    saveTorneos: saveTorneos,
    addTorneo: addTorneo,
    removeTorneo: removeTorneo,
    getTorneo: getTorneo,
    updateTorneo: updateTorneo,
    registryEntriesForTorneo: registryEntriesForTorneo,
    torneoAceptaModalidad: torneoAceptaModalidad,
    torneoInscripcionesAbiertas: torneoInscripcionesAbiertas,
    defaultTorneos: defaultTorneos,
  };

  /* —— Pool por torneo: máx. 8 inscripciones en grupo principal (por modalidad del torneo) —— */
  var BRACKET_INDIV_KEY = "MLBB_INDIVIDUAL_BRACKET_V1";
  var BRACKET_MAIN_MAX = 8;

  function loadBracketIndivDB() {
    try {
      var raw = localStorage.getItem(BRACKET_INDIV_KEY);
      if (!raw) return { byTorneoId: {}, updatedAt: null };
      var data = JSON.parse(raw);
      if (!data || typeof data.byTorneoId !== "object") {
        return { byTorneoId: {}, updatedAt: null };
      }
      return { byTorneoId: data.byTorneoId, updatedAt: data.updatedAt || null };
    } catch (e) {
      return { byTorneoId: {}, updatedAt: null };
    }
  }

  function saveBracketIndivDB(db) {
    db.updatedAt = new Date().toISOString();
    localStorage.setItem(BRACKET_INDIV_KEY, JSON.stringify(db));
  }

  function getBracketIndivRaw(torneoId) {
    var db = loadBracketIndivDB();
    var c = db.byTorneoId[torneoId];
    if (!c || typeof c !== "object") {
      return { manual: false, mainIds: [], waitlistIds: [] };
    }
    return {
      manual: c.manual === true,
      mainIds: Array.isArray(c.mainIds) ? c.mainIds.slice() : [],
      waitlistIds: Array.isArray(c.waitlistIds) ? c.waitlistIds.slice() : [],
    };
  }

  function setBracketIndivRaw(torneoId, cfg) {
    var db = loadBracketIndivDB();
    db.byTorneoId[torneoId] = {
      manual: cfg.manual === true,
      mainIds: Array.isArray(cfg.mainIds) ? cfg.mainIds.slice() : [],
      waitlistIds: Array.isArray(cfg.waitlistIds) ? cfg.waitlistIds.slice() : [],
    };
    saveBracketIndivDB(db);
  }

  function poolEntriesSorted(torneoId) {
    var tor = getTorneo(torneoId);
    var cat = tor && tor.modalidad;
    if (!cat) return [];
    return registryEntriesForTorneo(torneoId)
      .filter(function (e) {
        return e && e.category === cat;
      })
      .sort(function (a, b) {
        return String(a.registeredAt || "").localeCompare(
          String(b.registeredAt || "")
        );
      });
  }

  function torneoTieneModalidadPool(torneoId) {
    var tor = getTorneo(torneoId);
    return tor && MODALIDADES_VALIDAS.indexOf(tor.modalidad) >= 0;
  }

  function getResolvedPoolBracket(torneoId) {
    if (!torneoTieneModalidadPool(torneoId)) return null;
    var ents = poolEntriesSorted(torneoId);
    var byId = {};
    ents.forEach(function (e) {
      byId[e.id] = e;
    });
    var cfg = getBracketIndivRaw(torneoId);

    if (!cfg.manual) {
      var mainIds = ents.slice(0, BRACKET_MAIN_MAX).map(function (e) {
        return e.id;
      });
      var waitIds = ents.slice(BRACKET_MAIN_MAX).map(function (e) {
        return e.id;
      });
      return {
        manual: false,
        mainIds: mainIds,
        waitlistIds: waitIds,
        mainEntries: mainIds.map(function (id) {
          return byId[id];
        }).filter(Boolean),
        waitlistEntries: waitIds.map(function (id) {
          return byId[id];
        }).filter(Boolean),
      };
    }

    var mainIds = cfg.mainIds.filter(function (id) {
      return byId[id];
    });
    var waitIds = cfg.waitlistIds.filter(function (id) {
      return byId[id];
    });
    var seen = {};
    mainIds.forEach(function (id) {
      seen[id] = 1;
    });
    waitIds.forEach(function (id) {
      seen[id] = 1;
    });
    ents.forEach(function (e) {
      if (!seen[e.id]) {
        waitIds.push(e.id);
        seen[e.id] = 1;
      }
    });
    while (mainIds.length > BRACKET_MAIN_MAX) {
      waitIds.unshift(mainIds.pop());
    }
    return {
      manual: true,
      mainIds: mainIds,
      waitlistIds: waitIds,
      mainEntries: mainIds.map(function (id) {
        return byId[id];
      }).filter(Boolean),
      waitlistEntries: waitIds.map(function (id) {
        return byId[id];
      }).filter(Boolean),
    };
  }

  function poolBracketSyncToRegistry(torneoId) {
    if (!torneoTieneModalidadPool(torneoId)) return;
    setBracketIndivRaw(torneoId, {
      manual: false,
      mainIds: [],
      waitlistIds: [],
    });
  }

  function poolBracketDemote(torneoId, entryId) {
    if (!torneoTieneModalidadPool(torneoId)) return;
    var snap = getResolvedPoolBracket(torneoId);
    if (!snap) return;
    var main = snap.mainIds.slice();
    var wait = snap.waitlistIds.slice();
    var ix = main.indexOf(entryId);
    if (ix < 0) return;
    main.splice(ix, 1);
    wait.unshift(entryId);
    setBracketIndivRaw(torneoId, {
      manual: true,
      mainIds: main,
      waitlistIds: wait,
    });
  }

  function poolBracketPromote(torneoId, entryId) {
    if (!torneoTieneModalidadPool(torneoId)) return;
    var snap = getResolvedPoolBracket(torneoId);
    if (!snap) return;
    if (snap.mainIds.length >= BRACKET_MAIN_MAX) return;
    var main = snap.mainIds.slice();
    var wait = snap.waitlistIds.slice();
    var ix = wait.indexOf(entryId);
    if (ix < 0) return;
    wait.splice(ix, 1);
    main.push(entryId);
    setBracketIndivRaw(torneoId, {
      manual: true,
      mainIds: main,
      waitlistIds: wait,
    });
  }

  function poolBracketOnEntryRemoved(torneoId, entryId) {
    var cfg = getBracketIndivRaw(torneoId);
    if (!cfg.manual) return;
    cfg.mainIds = cfg.mainIds.filter(function (id) {
      return id !== entryId;
    });
    cfg.waitlistIds = cfg.waitlistIds.filter(function (id) {
      return id !== entryId;
    });
    setBracketIndivRaw(torneoId, cfg);
  }

  var TorneoPoolStore = {
    MAIN_MAX: BRACKET_MAIN_MAX,
    getResolved: getResolvedPoolBracket,
    syncToRegistry: poolBracketSyncToRegistry,
    demote: poolBracketDemote,
    promote: poolBracketPromote,
    torneoTieneModalidadPool: torneoTieneModalidadPool,
    torneoEsIndividualFFA: function (tid) {
      var t = getTorneo(tid);
      return t && t.modalidad === "individual";
    },
  };

  global.TorneoPoolStore = TorneoPoolStore;
  global.IndividualBracketStore = TorneoPoolStore;

  /* —— Llaves eliminatorias (8 participantes = inscripciones del grupo principal) —— */
  var KNOCKOUT_KEY = "MLBB_KNOCKOUT_V1";

  function loadKnockoutDB() {
    try {
      var raw = localStorage.getItem(KNOCKOUT_KEY);
      if (!raw) return { byTorneoId: {}, updatedAt: null };
      var data = JSON.parse(raw);
      if (!data || typeof data.byTorneoId !== "object") {
        return { byTorneoId: {}, updatedAt: null };
      }
      return { byTorneoId: data.byTorneoId, updatedAt: data.updatedAt || null };
    } catch (e) {
      return { byTorneoId: {}, updatedAt: null };
    }
  }

  function saveKnockoutDB(db) {
    db.updatedAt = new Date().toISOString();
    localStorage.setItem(KNOCKOUT_KEY, JSON.stringify(db));
  }

  function knockoutGet(torneoId) {
    var db = loadKnockoutDB();
    return db.byTorneoId[torneoId] || null;
  }

  function knockoutSave(torneoId, data) {
    var db = loadKnockoutDB();
    db.byTorneoId[torneoId] = data;
    saveKnockoutDB(db);
  }

  function knockoutDeleteTorneo(torneoId) {
    var db = loadKnockoutDB();
    if (db.byTorneoId[torneoId]) {
      delete db.byTorneoId[torneoId];
      saveKnockoutDB(db);
    }
  }

  /** mainIds: exactamente 8 ids en orden de cabeza de serie (#1…#8) */
  function knockoutGenerateElim8(torneoId, mainIdsOrdered) {
    if (!mainIdsOrdered || mainIdsOrdered.length !== 8) return false;
    var s = mainIdsOrdered.slice();
    var rounds = [
      {
        key: "q",
        label: "Cuartos de final",
        matches: [
          { a: s[0], b: s[7], winner: null },
          { a: s[3], b: s[4], winner: null },
          { a: s[2], b: s[5], winner: null },
          { a: s[1], b: s[6], winner: null },
        ],
      },
      {
        key: "s",
        label: "Semifinales",
        matches: [
          { a: null, b: null, winner: null },
          { a: null, b: null, winner: null },
        ],
      },
      {
        key: "f",
        label: "Final",
        matches: [{ a: null, b: null, winner: null }],
      },
    ];
    knockoutSave(torneoId, { rounds: rounds, createdAt: new Date().toISOString() });
    return true;
  }

  function knockoutPropagateFromRound0(k) {
    var r0 = k.rounds[0].matches;
    var r1 = k.rounds[1].matches;
    r1[0].a = r0[0].winner || null;
    r1[0].b = r0[1].winner || null;
    r1[1].a = r0[2].winner || null;
    r1[1].b = r0[3].winner || null;
    var r2 = k.rounds[2].matches[0];
    r2.a = r1[0].winner || null;
    r2.b = r1[1].winner || null;
  }

  function knockoutSetWinner(torneoId, roundIndex, matchIndex, winnerEntryId) {
    var k = knockoutGet(torneoId);
    if (!k || !k.rounds[roundIndex] || !k.rounds[roundIndex].matches[matchIndex]) {
      return false;
    }
    var m = k.rounds[roundIndex].matches[matchIndex];
    if (winnerEntryId !== m.a && winnerEntryId !== m.b) return false;
    m.winner = winnerEntryId;
    knockoutPropagateFromRound0(k);
    knockoutSave(torneoId, k);
    return true;
  }

  function knockoutClearWinner(torneoId, roundIndex, matchIndex) {
    var k = knockoutGet(torneoId);
    if (!k || !k.rounds[roundIndex]) return false;
    for (var r = roundIndex; r < k.rounds.length; r++) {
      k.rounds[r].matches.forEach(function (mx) {
        mx.winner = null;
      });
    }
    knockoutPropagateFromRound0(k);
    knockoutSave(torneoId, k);
    return true;
  }

  /** Anula el ganador de un partido y los de rondas posteriores; vuelve a rellenar cruces desde cuartos. */
  function knockoutClearSingleMatch(torneoId, roundIndex, matchIndex) {
    var k = knockoutGet(torneoId);
    if (
      !k ||
      !k.rounds[roundIndex] ||
      !k.rounds[roundIndex].matches[matchIndex]
    ) {
      return false;
    }
    k.rounds[roundIndex].matches[matchIndex].winner = null;
    for (var r = roundIndex + 1; r < k.rounds.length; r++) {
      k.rounds[r].matches.forEach(function (mx) {
        mx.winner = null;
      });
    }
    knockoutPropagateFromRound0(k);
    knockoutSave(torneoId, k);
    return true;
  }

  global.KnockoutStore = {
    get: knockoutGet,
    generateElim8: knockoutGenerateElim8,
    setWinner: knockoutSetWinner,
    clearFromRound: knockoutClearWinner,
    clearMatch: knockoutClearSingleMatch,
    deleteForTorneo: knockoutDeleteTorneo,
  };
})(typeof window !== "undefined" ? window : this);
