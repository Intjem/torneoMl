(function() {
  "use strict";

  var api = window.apiClient;
  if (!api) return;

  var CATEGORY_HINTS = {
    individual: "Solo tú. Eres el único integrante.",
    "1v1":      "Solo tú. Un jugador por inscripción.",
    "2v2":      "Tú como capitán + 1 jugador titular.",
    "4v4":      "Tú como capitán + hasta 3 titulares + hasta 3 suplentes."
  };

  var form         = document.getElementById("registryForm");
  var successBox   = document.getElementById("successBox");
  var successTitle = document.getElementById("successTitle");
  var successMsg   = document.getElementById("successMsg");
  var categoryEl   = document.getElementById("regCategory");
  var categoryHint = document.getElementById("categoryHint");
  var teamNameWrap = document.getElementById("teamNameWrap");
  var captainMlId  = document.getElementById("captainMlId");
  var captainNick  = document.getElementById("captainNick");
  var captainPhone = document.getElementById("captainPhone");
  var regMsg       = document.getElementById("regMsg");
  var btnSubmit    = document.getElementById("btnSubmitReg");
  var btnAnother   = document.getElementById("btnCreateAnother");

  function normalizePhone(p) { return String(p || "").replace(/\s+/g, "").trim(); }
  function isPhoneOk(p)      { return normalizePhone(p).replace(/\D/g, "").length >= 8; }

  function showHint(el, text, isErr) {
    if (!el) return;
    el.textContent = text || "";
    el.className = "hint" + (isErr ? " hint--err" : text ? " hint--ok" : "");
    el.hidden = !text;
  }

  function onCategoryChange() {
    var cat = categoryEl ? categoryEl.value : "4v4";
    if (categoryHint) categoryHint.textContent = CATEGORY_HINTS[cat] || "";
    if (teamNameWrap) {
      teamNameWrap.hidden = (cat === "individual" || cat === "1v1");
    }
    showHint(regMsg, "", false);
  }

  function onSubmit(e) {
    e.preventDefault();
    showHint(regMsg, "", false);

    var cat   = categoryEl   ? categoryEl.value.trim()   : "4v4";
    var mlId  = captainMlId  ? captainMlId.value.trim()  : "";
    var nick  = captainNick  ? captainNick.value.trim()   : "";
    var phone = normalizePhone(captainPhone ? captainPhone.value : "");
    var tnEl  = document.getElementById("teamName");
    var teamName = tnEl && !teamNameWrap.hidden ? tnEl.value.trim() : "";

    if (!mlId)         { showHint(regMsg, "Ingresa tu ID de Mobile Legends.", true); return; }
    if (!nick)         { showHint(regMsg, "Ingresa tu nick en juego.", true); return; }
    if (!isPhoneOk(phone)) { showHint(regMsg, "Teléfono: al menos 8 dígitos.", true); return; }

    if (btnSubmit) btnSubmit.disabled = true;
    showHint(regMsg, "Creando equipo…", false);

    api.createEquipo({
      teamName:    teamName || undefined,
      category:    cat,
      captainMlId: mlId,
      captainNick: nick,
      captainPhone: phone
    })
    .then(function(res) {
      var equipo = res.equipo || res;
      if (form)       form.hidden = true;
      if (successBox) successBox.hidden = false;
      if (successTitle) successTitle.textContent = "¡Equipo \"" + (equipo.teamName || nick + "'s team") + "\" creado!";
      if (successMsg) {
        successMsg.textContent =
          "Categoría: " + cat.toUpperCase() +
          ". Ahora los jugadores pueden unirse y tú puedes inscribirlo a un torneo.";
      }
    })
    .catch(function(err) {
      showHint(regMsg, err.message || "Error creando el equipo.", true);
    })
    .finally(function() {
      if (btnSubmit) btnSubmit.disabled = false;
    });
  }

  // Reset to create another
  if (btnAnother) {
    btnAnother.addEventListener("click", function() {
      if (form)       form.hidden = false;
      if (successBox) successBox.hidden = true;
      form.reset();
      onCategoryChange();
      showHint(regMsg, "", false);
    });
  }

  if (categoryEl) categoryEl.addEventListener("change", onCategoryChange);
  if (form)       form.addEventListener("submit", onSubmit);

  // Init
  onCategoryChange();
})();
