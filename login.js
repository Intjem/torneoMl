(function() {
  "use strict";

  var api = window.apiClient;
  if (!api) return;

  // ── DOM ──
  var tabLogin    = document.getElementById("tabLogin");
  var tabRegister = document.getElementById("tabRegister");
  var panelLogin  = document.getElementById("panelLogin");
  var panelReg    = document.getElementById("panelRegister");

  // Login
  var loginFormBox = document.getElementById("loginFormBox");
  var welcomeBox   = document.getElementById("welcomeBox");
  var loginEmail   = document.getElementById("loginEmail");
  var loginPwd     = document.getElementById("loginPwd");
  var loginErr     = document.getElementById("loginErr");
  var btnLogin     = document.getElementById("btnLogin");
  var welcomeName  = document.getElementById("welcomeName");
  var welcomeInfo  = document.getElementById("welcomeInfo");
  var welcomeGoTorneos = document.getElementById("welcomeGoTorneos");
  var btnWelcomeLogout = document.getElementById("btnWelcomeLogout");

  // Register
  var registerFormBox     = document.getElementById("registerFormBox");
  var registerSuccessBox  = document.getElementById("registerSuccessBox");
  var regEmail            = document.getElementById("regEmail");
  var regPwd              = document.getElementById("regPwd");
  var regMlId             = document.getElementById("regMlId");
  var regNick             = document.getElementById("regNick");
  var registerErr         = document.getElementById("registerErr");
  var btnRegister         = document.getElementById("btnRegister");

  // Admin setup
  var setupCard     = document.getElementById("setupCard");
  var setupEmail    = document.getElementById("setupEmail");
  var setupPwd      = document.getElementById("setupPwd");
  var setupErr      = document.getElementById("setupErr");
  var btnCreateAdmin = document.getElementById("btnCreateAdmin");

  // Navigation helpers
  var goToRegister  = document.getElementById("goToRegister");
  var goToLogin     = document.getElementById("goToLogin");

  // ── Tab switching ──
  function switchTab(tab) {
    var isLogin = tab === "login";
    if (tabLogin)    { tabLogin.classList.toggle("active", isLogin);  tabLogin.setAttribute("aria-selected", String(isLogin)); }
    if (tabRegister) { tabRegister.classList.toggle("active", !isLogin); tabRegister.setAttribute("aria-selected", String(!isLogin)); }
    if (panelLogin)  panelLogin.classList.toggle("active", isLogin);
    if (panelReg)    panelReg.classList.toggle("active", !isLogin);
  }

  if (tabLogin)    tabLogin.addEventListener("click", function() { switchTab("login"); });
  if (tabRegister) tabRegister.addEventListener("click", function() { switchTab("register"); });
  if (goToRegister) goToRegister.addEventListener("click", function() { switchTab("register"); });
  if (goToLogin)    goToLogin.addEventListener("click",    function() { switchTab("login"); });

  // ── Hint helper ──
  function showErr(el, text) {
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }

  // ── Check current session ──
  function checkCurrentSession() {
    if (!api.isAuthenticated()) {
      // Check if admin needs to be created
      api.checkSetupStatus && api.checkSetupStatus().then(function(res) {
        if (setupCard) setupCard.hidden = res.hasAdmin;
      }).catch(function() {});
      return;
    }

    // Already logged in — show welcome
    api.getMe && api.getMe()
      .then(function(res) {
        var user = res.user;
        if (!user) { api.clearToken(); return; }
        showWelcome(user);
      })
      .catch(function() {
        api.clearToken();
      });
  }

  // ── Show welcome state ──
  function showWelcome(user) {
    var isAdmin = user.role === "admin" || user.role === "superadmin";

    if (isAdmin) {
      // Redirect admin immediately to admin panel
      window.location.href = "admin.html";
      return;
    }

    // Player — show welcome box
    if (loginFormBox) loginFormBox.hidden = true;
    if (welcomeBox)   welcomeBox.hidden = false;

    if (welcomeName) {
      welcomeName.textContent = "¡Bienvenido, " + (user.nick || user.email) + "!";
    }
    if (welcomeInfo) {
      welcomeInfo.innerHTML =
        "ID ML: <strong>" + (user.mlId || "—") + "</strong>" +
        " · Nick: <strong>" + (user.nick || "—") + "</strong>";
    }
  }

  // ── Login ──
  function handleLogin() {
    showErr(loginErr, "");
    var email = loginEmail ? loginEmail.value.trim() : "";
    var pwd   = loginPwd  ? loginPwd.value           : "";
    if (!email || !pwd) { showErr(loginErr, "Email y contraseña requeridos."); return; }

    if (btnLogin) btnLogin.disabled = true;

    api.login(email, pwd)
      .then(function(res) {
        var user = res.user || res.admin;
        if (!user) throw new Error("Respuesta inesperada del servidor.");
        showWelcome(user);
      })
      .catch(function(err) {
        showErr(loginErr, err.message || "Error de inicio de sesión.");
      })
      .finally(function() {
        if (btnLogin) btnLogin.disabled = false;
      });
  }

  if (btnLogin) btnLogin.addEventListener("click", handleLogin);
  if (loginPwd) loginPwd.addEventListener("keydown", function(e) {
    if (e.key === "Enter") handleLogin();
  });

  // ── Logout ──
  if (btnWelcomeLogout) {
    btnWelcomeLogout.addEventListener("click", function() {
      api.logout().then(function() {
        if (loginFormBox) loginFormBox.hidden = false;
        if (welcomeBox)   welcomeBox.hidden = true;
        if (loginEmail) loginEmail.value = "";
        if (loginPwd)   loginPwd.value = "";
        // Check setup status again
        api.checkSetupStatus && api.checkSetupStatus().then(function(res) {
          if (setupCard) setupCard.hidden = res.hasAdmin;
        }).catch(function() {});
      }).catch(function() {});
    });
  }

  // ── Register player ──
  function handleRegister() {
    showErr(registerErr, "");
    var email = regEmail ? regEmail.value.trim() : "";
    var pwd   = regPwd   ? regPwd.value           : "";
    var mlId  = regMlId  ? regMlId.value.trim()   : "";
    var nick  = regNick  ? regNick.value.trim()    : "";

    if (!email)        { showErr(registerErr, "El email es requerido."); return; }
    if (!pwd || pwd.length < 4) { showErr(registerErr, "La contraseña debe tener al menos 4 caracteres."); return; }
    if (!mlId)         { showErr(registerErr, "El ID de Mobile Legends es requerido."); return; }
    if (!nick)         { showErr(registerErr, "El nick en juego es requerido."); return; }

    if (btnRegister) btnRegister.disabled = true;

    api.registerPlayer(email, pwd, mlId, nick)
      .then(function(res) {
        // Show success
        if (registerFormBox)    registerFormBox.hidden = true;
        if (registerSuccessBox) registerSuccessBox.hidden = false;
        var msgEl = document.getElementById("registerSuccessMsg");
        if (msgEl) {
          msgEl.innerHTML =
            "Cuenta creada para <strong>" + (res.user && res.user.nick ? res.user.nick : email) + "</strong>." +
            "<br>ID ML: <strong>" + mlId + "</strong>";
        }
      })
      .catch(function(err) {
        showErr(registerErr, err.message || "Error al crear la cuenta.");
      })
      .finally(function() {
        if (btnRegister) btnRegister.disabled = false;
      });
  }

  if (btnRegister) btnRegister.addEventListener("click", handleRegister);
  if (regNick) regNick.addEventListener("keydown", function(e) {
    if (e.key === "Enter") handleRegister();
  });

  // ── Admin setup ──
  function handleSetup() {
    showErr(setupErr, "");
    var email = setupEmail ? setupEmail.value.trim() : "";
    var pwd   = setupPwd   ? setupPwd.value           : "";
    if (!email || !pwd) { showErr(setupErr, "Email y contraseña requeridos."); return; }
    if (pwd.length < 4) { showErr(setupErr, "Mínimo 4 caracteres."); return; }

    if (btnCreateAdmin) btnCreateAdmin.disabled = true;

    api.setupAdmin(email, pwd)
      .then(function() {
        if (setupErr) {
          setupErr.textContent = "✅ Administrador creado. Ahora inicia sesión.";
          setupErr.className = "hint hint--ok";
          setupErr.hidden = false;
        }
        if (setupCard) setTimeout(function() { setupCard.hidden = true; }, 2500);
      })
      .catch(function(err) {
        showErr(setupErr, err.message || "Error al crear el administrador.");
        if (btnCreateAdmin) btnCreateAdmin.disabled = false;
      });
  }

  if (btnCreateAdmin) btnCreateAdmin.addEventListener("click", handleSetup);

  // ── Init ──
  checkCurrentSession();
})();
