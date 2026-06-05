// API Client for torneos-mlbb backend
(function(global) {
  "use strict";

  // Detect base URL — same origin when served from Express
  var baseURL = window.location.origin;

  var token = null;
  // Use a shared key so players and admins both persist their session
  try { token = localStorage.getItem("authToken") || localStorage.getItem("adminToken"); } catch(e) {}

  function request(endpoint, options) {
    var url = baseURL + "/api" + endpoint;
    var config = Object.assign({
      headers: { "Content-Type": "application/json" }
    }, options || {});

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = "Bearer " + token;
    }

    return fetch(url, config)
      .then(function(response) {
        return response.json().then(function(data) {
          if (!response.ok) {
            var err = new Error(data.error || "Error del servidor");
            err.status = response.status;
            throw err;
          }
          return data;
        });
      });
  }

  function get(endpoint) {
    return request(endpoint);
  }

  function post(endpoint, data) {
    return request(endpoint, { method: "POST", body: JSON.stringify(data) });
  }

  function put(endpoint, data) {
    return request(endpoint, { method: "PUT", body: JSON.stringify(data) });
  }

  function del(endpoint) {
    return request(endpoint, { method: "DELETE" });
  }

  // Auth
  function login(email, password) {
    return post("/auth/login", { email: email, password: password })
      .then(function(res) {
        token = res.token;
        try {
          localStorage.setItem("authToken", token);
          localStorage.setItem("adminToken", token); // backwards compat
        } catch(e) {}
        return res;
      });
  }

  function registerPlayer(email, password, mlId, nick) {
    return post("/auth/register", { email: email, password: password, mlId: mlId, nick: nick })
      .then(function(res) {
        // Auto-login after register
        if (res.token) {
          token = res.token;
          try {
            localStorage.setItem("authToken", token);
            localStorage.setItem("adminToken", token);
          } catch(e) {}
        }
        return res;
      });
  }

  function getMe() {
    return get("/auth/me");
  }

  function logout() {
    return post("/auth/logout").catch(function() {}).then(function() {
      token = null;
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminToken");
      } catch(e) {}
    });
  }

  function checkSetupStatus() {
    return get("/auth/status");
  }

  function setupAdmin(email, password) {
    return post("/auth/setup", { email: email, password: password });
  }

  function changePassword(currentPassword, newPassword) {
    return put("/auth/change-password", {
      currentPassword: currentPassword,
      newPassword: newPassword
    });
  }

  function isAuthenticated() { return !!token; }

  function clearToken() {
    token = null;
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
    } catch(e) {}
  }

  // Torneos
  function getTorneos(filters) {
    var params = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return get("/torneos" + params);
  }

  function getTorneo(id) { return get("/torneos/" + id); }

  function createTorneo(data) { return post("/torneos", data); }

  function updateTorneo(id, data) { return put("/torneos/" + id, data); }

  function deleteTorneo(id) { return del("/torneos/" + id); }

  function updateBracket(id, bracket) {
    return put("/torneos/" + id + "/bracket", { bracket: bracket });
  }

  function generateKnockout(id) { return post("/torneos/" + id + "/knockout"); }

  function updateKnockoutResults(id, knockoutBracket) {
    return put("/torneos/" + id + "/knockout/results", { knockoutBracket: knockoutBracket });
  }

  // Registros
  function getRegistros(filters) {
    var params = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return get("/registros" + params);
  }

  function createRegistro(data) { return post("/registros", data); }

  function deleteRegistro(id) { return del("/registros/" + id); }

  function getRegistrosByTorneo(torneoId) {
    return get("/registros/torneo/" + torneoId);
  }

  // Equipos
  function getEquipos(filters) {
    var params = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return get("/equipos" + params);
  }

  function getEquipo(id) {
    return get("/equipos/" + id);
  }

  function createEquipo(data) {
    return post("/equipos", data);
  }

  function joinEquipo(id, data) {
    return post("/equipos/" + id + "/join", data);
  }

  function inscribirEquipo(id, torneoId, captainMlId) {
    return post("/equipos/" + id + "/inscribir", { torneoId: torneoId, captainMlId: captainMlId });
  }

  // Players
  function getPlayers() {
    return get("/auth/players");
  }

  // Export
  global.apiClient = {
    baseURL: baseURL,
    isAuthenticated: isAuthenticated,
    clearToken: clearToken,
    login: login,
    logout: logout,
    registerPlayer: registerPlayer,
    getMe: getMe,
    checkSetupStatus: checkSetupStatus,
    setupAdmin: setupAdmin,
    changePassword: changePassword,
    getTorneos: getTorneos,
    getTorneo: getTorneo,
    createTorneo: createTorneo,
    updateTorneo: updateTorneo,
    deleteTorneo: deleteTorneo,
    updateBracket: updateBracket,
    generateKnockout: generateKnockout,
    updateKnockoutResults: updateKnockoutResults,
    getRegistros: getRegistros,
    createRegistro: createRegistro,
    deleteRegistro: deleteRegistro,
    getRegistrosByTorneo: getRegistrosByTorneo,
    getPlayers: getPlayers,
    getEquipos: getEquipos,
    getEquipo: getEquipo,
    createEquipo: createEquipo,
    joinEquipo: joinEquipo,
    inscribirEquipo: inscribirEquipo
  };

})(typeof window !== "undefined" ? window : this);
