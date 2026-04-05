// Shared constants and labels used across pages
(function(global) {
  "use strict";

  var REG_CAT_LABELS = {
    individual: "Individual (FFA)",
    "1v1": "1v1 (1 jugador / inscripción)",
    "2v2": "2v2 (dúo, 2 jugadores)",
    "4v4": "4v4 (equipos)"
  };

  var FORMATO_LABELS = {
    liga: "Liga",
    eliminatoria: "Eliminatoria"
  };

  var ESTADO_LABELS = {
    inscripcion: "Inscripción abierta",
    en_curso: "En curso",
    finalizado: "Finalizado"
  };

  function formatWhen(t) {
    if (!t || !t.fecha) return "—";
    try {
      var iso = t.fecha + "T" + (t.hora && t.hora.length ? t.hora : "00:00");
      var d = new Date(iso);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch(e) {}
    return t.fecha + (t.hora ? " " + t.hora : "");
  }

  function formatoYModalidad(t) {
    if (!t) return "";
    var f = FORMATO_LABELS[t.tipoFormato] || t.tipoFormato || "—";
    var m = t.modalidad ? (REG_CAT_LABELS[t.modalidad] || t.modalidad) : "—";
    return f + " · " + m;
  }

  function entrySummary(ent) {
    var parts = [];
    if (ent.teamName) parts.push(ent.teamName);
    var names = (ent.players || []).map(function(p) {
      var s = (p.nick || "—") + " (ID " + (p.mlId || "—") + ")";
      if (p.role === "captain") s += " · Capitán";
      if (p.substitute) s += " · Suplente";
      return s;
    });
    if (names.length) parts.push(names.join(" · "));
    return parts.join(" — ") || "Inscripción";
  }

  // Get the right ID field (_id from MongoDB or id from localStorage)
  function getId(obj) {
    return obj._id || obj.id || "";
  }

  global.Shared = {
    REG_CAT_LABELS: REG_CAT_LABELS,
    FORMATO_LABELS: FORMATO_LABELS,
    ESTADO_LABELS: ESTADO_LABELS,
    formatWhen: formatWhen,
    formatoYModalidad: formatoYModalidad,
    entrySummary: entrySummary,
    getId: getId
  };
})(typeof window !== "undefined" ? window : this);
