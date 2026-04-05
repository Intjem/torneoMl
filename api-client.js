// API Client for torneos-mlbb backend
(function(global) {
  "use strict";

  // Detect base URL — same origin when served from Express
  var baseURL = window.location.origin;

  var token = null;
  try { token = localStorage.getItem("adminToken"); } catch(e) {}

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
        try { localStorage.setItem("adminToken", token); } catch(e) {}
        return res;
      });
  }

  function logout() {
    return post("/auth/logout").catch(function() {}).then(function() {
      token = null;
      try { localStorage.removeItem("adminToken"); } catch(e) {}
    });
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
    try { localStorage.removeItem("adminToken"); } catch(e) {}
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

  // Export
  global.apiClient = {
    baseURL: baseURL,
    isAuthenticated: isAuthenticated,
    clearToken: clearToken,
    login: login,
    logout: logout,
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
    getRegistrosByTorneo: getRegistrosByTorneo
  };

})(typeof window !== "undefined" ? window : this);
