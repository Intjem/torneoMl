// Adaptación de tournament.js para usar API en lugar de localStorage
(function (global) {
  "use strict";

  // Referencias al cliente API
  const api = window.apiClient;
  const socket = window.socketClient;

  // Conectar WebSocket cuando se carga la página
  if (socket) {
    socket.connect();
  }

  // Funciones de autenticación
  function getRole() {
    try {
      return sessionStorage.getItem("MLBB_ROLE");
    } catch (e) {
      return null;
    }
  }

  function setRole(role) {
    if (role === "admin" || role === "user") {
      sessionStorage.setItem("MLBB_ROLE", role);
    } else {
      sessionStorage.removeItem("MLBB_ROLE");
    }
  }

  function clearRole() {
    sessionStorage.removeItem("MLBB_ROLE");
  }

  function isAdminSession() {
    try {
      return api.isAuthenticated();
    } catch (e) {
      return false;
    }
  }

  function setAdminSession(active) {
    if (active) {
      setRole("admin");
    } else {
      clearRole();
      api.clearToken();
    }
  }

  // Store de Registros (ahora usa API)
  const RegistryStore = {
    loadRegistry: async function() {
      try {
        const registros = await api.getRegistros();
        return {
          entries: registros,
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error("Error loading registry:", error);
        return { entries: [], updatedAt: null };
      }
    },

    saveRegistry: async function(registry) {
      // Esta función ya no se necesita directamente, 
      // las operaciones individuales manejan el guardado
      console.log("Registry save handled by individual operations");
    },

    addRegistryEntry: async function(entry) {
      try {
        const registro = await api.createRegistro(entry);
        return registro;
      } catch (error) {
        console.error("Error adding registry entry:", error);
        throw error;
      }
    },

    removeRegistryEntry: async function(id) {
      try {
        await api.deleteRegistro(id);
        return true;
      } catch (error) {
        console.error("Error removing registry entry:", error);
        throw error;
      }
    },

    defaultRegistry: function() {
      return { entries: [], updatedAt: null };
    }
  };

  // Store de Torneos (ahora usa API)
  const TournamentStore = {
    loadTorneos: async function() {
      try {
        const torneos = await api.getTorneos();
        return {
          list: torneos,
          updatedAt: new Date().toISOString()
        };
      } catch (error) {
        console.error("Error loading torneos:", error);
        return { list: [], updatedAt: null };
      }
    },

    saveTorneos: async function(torneos) {
      // Manejado por operaciones individuales
      console.log("Torneos save handled by individual operations");
    },

    addTorneo: async function(nombre, fecha, hora, tipoFormato, modalidad) {
      try {
        const torneo = await api.createTorneo({
          nombre,
          fecha,
          hora,
          tipoFormato,
          modalidad
        });
        return torneo;
      } catch (error) {
        console.error("Error adding torneo:", error);
        throw error;
      }
    },

    removeTorneo: async function(id) {
      try {
        await api.deleteTorneo(id);
        return true;
      } catch (error) {
        console.error("Error removing torneo:", error);
        throw error;
      }
    },

    updateTorneo: async function(id, updates) {
      try {
        const torneo = await api.updateTorneo(id, updates);
        return torneo;
      } catch (error) {
        console.error("Error updating torneo:", error);
        throw error;
      }
    },

    defaultTorneos: function() {
      return { list: [], updatedAt: null };
    },

    torneoAceptaModalidad: function(torneo, modalidad) {
      if (!torneo || !modalidad) return false;
      var m = torneo.modalidad;
      if (m === undefined || m === null || m === "") return true;
      return m === modalidad;
    }
  };

  // Store de Knockout (ahora usa API)
  const KnockoutStore = {
    loadKnockout: async function(torneoId) {
      try {
        const torneo = await api.getTorneo(torneoId);
        return torneo.knockoutBracket || { rounds: [] };
      } catch (error) {
        console.error("Error loading knockout:", error);
        return { rounds: [] };
      }
    },

    saveKnockout: async function(torneoId, knockoutData) {
      try {
        await api.updateKnockoutResults(torneoId, knockoutData);
        return true;
      } catch (error) {
        console.error("Error saving knockout:", error);
        throw error;
      }
    },

    defaultKnockout: function() {
      return { rounds: [] };
    }
  };

  // Store de Bracket (ahora usa API)
  const BracketStore = {
    loadBracket: async function(torneoId) {
      try {
        const torneo = await api.getTorneo(torneoId);
        return torneo.bracket || { main: [], waitlist: [] };
      } catch (error) {
        console.error("Error loading bracket:", error);
        return { main: [], waitlist: [] };
      }
    },

    saveBracket: async function(torneoId, bracketData) {
      try {
        await api.updateBracket(torneoId, bracketData);
        return true;
      } catch (error) {
        console.error("Error saving bracket:", error);
        throw error;
      }
    },

    generateKnockout: async function(torneoId) {
      try {
        const torneo = await api.generateKnockout(torneoId);
        return torneo.knockoutBracket;
      } catch (error) {
        console.error("Error generating knockout:", error);
        throw error;
      }
    },

    defaultBracket: function() {
      return { main: [], waitlist: [] };
    }
  };

  // Funciones de utilidad
  function registryUuid() {
    return "reg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  function torneoUuid() {
    return "tor_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Constantes
  var ESTADOS_TORNEO = ["inscripcion", "en_curso", "finalizado"];
  var MODALIDADES_VALIDAS = ["individual", "1v1", "2v2", "4v4"];

  // Event listeners para actualizaciones en tiempo real
  if (socket) {
    // Torneos
    socket.on('torneo-created', function(data) {
      console.log('🏆 Nuevo torneo creado:', data);
      // Disparar evento personalizado para que las páginas lo escuchen
      document.dispatchEvent(new CustomEvent('torneo-created', { detail: data }));
    });

    socket.on('torneo-updated', function(data) {
      console.log('🏆 Torneo actualizado:', data);
      document.dispatchEvent(new CustomEvent('torneo-updated', { detail: data }));
    });

    socket.on('torneo-deleted', function(data) {
      console.log('🏆 Torneo eliminado:', data);
      document.dispatchEvent(new CustomEvent('torneo-deleted', { detail: data }));
    });

    // Registros
    socket.on('registro-created', function(data) {
      console.log('📝 Nuevo registro:', data);
      document.dispatchEvent(new CustomEvent('registro-created', { detail: data }));
    });

    socket.on('registro-updated', function(data) {
      console.log('📝 Registro actualizado:', data);
      document.dispatchEvent(new CustomEvent('registro-updated', { detail: data }));
    });

    socket.on('registro-deleted', function(data) {
      console.log('📝 Registro eliminado:', data);
      document.dispatchEvent(new CustomEvent('registro-deleted', { detail: data }));
    });

    // Bracket
    socket.on('bracket-updated', function(data) {
      console.log('🎯 Bracket actualizado:', data);
      document.dispatchEvent(new CustomEvent('bracket-updated', { detail: data }));
    });

    socket.on('knockout-updated', function(data) {
      console.log('🏁 Llaves actualizadas:', data);
      document.dispatchEvent(new CustomEvent('knockout-updated', { detail: data }));
    });
  }

  // Exportar stores y funciones
  global.RegistryStore = RegistryStore;
  global.TournamentStore = TournamentStore;
  global.KnockoutStore = KnockoutStore;
  global.BracketStore = BracketStore;

  // Funciones de autenticación
  global.getRole = getRole;
  global.setRole = setRole;
  global.clearRole = clearRole;
  global.isAdminSession = isAdminSession;
  global.setAdminSession = setAdminSession;

  // Utilidades
  global.registryUuid = registryUuid;
  global.torneoUuid = torneoUuid;
  global.ESTADOS_TORNEO = ESTADOS_TORNEO;
  global.MODALIDADES_VALIDAS = MODALIDADES_VALIDAS;

  // Para compatibilidad con código existente
  global.getAdminPassword = function() {
    return ""; // Ya no se usa, manejado por API
  };

  global.setAdminPassword = function(pw) {
    console.log("Password change handled by API");
    return true;
  };

})(typeof window !== "undefined" ? window : this);
