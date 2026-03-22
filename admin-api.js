// Adaptación de admin.js para usar API
(function () {
  "use strict";

  // Verificar que tenemos el cliente API
  if (!window.apiClient) {
    console.error("API client not found");
    return;
  }

  // Elementos del DOM
  const elements = {
    loginBox: document.getElementById("loginBox"),
    setupBox: document.getElementById("setupBox"),
    panel: document.getElementById("adminPanel"),
    adminEmail: document.getElementById("adminEmail"),
    adminPwd: document.getElementById("adminPwd"),
    pwdErr: document.getElementById("pwdErr"),
    btnLogin: document.getElementById("btnLogin"),
    btnLogout: document.getElementById("btnLogout"),
    btnShowSetup: document.getElementById("btnShowSetup"),
    btnShowLogin: document.getElementById("btnShowLogin"),
    setupEmail: document.getElementById("setupEmail"),
    setupPwd: document.getElementById("setupPwd"),
    setupErr: document.getElementById("setupErr"),
    btnCreateAdmin: document.getElementById("btnCreateAdmin"),
    connectionStatus: document.getElementById("connectionStatus"),
    torneoNombre: document.getElementById("torneoNombre"),
    torneoFecha: document.getElementById("torneoFecha"),
    torneoHora: document.getElementById("torneoHora"),
    torneoTipoFormato: document.getElementById("torneoTipoFormato"),
    torneoModalidad: document.getElementById("torneoModalidad"),
    btnAddTorneo: document.getElementById("btnAddTorneo"),
    torneoMsg: document.getElementById("torneoMsg"),
    torneoList: document.getElementById("torneoList"),
    registryList: document.getElementById("registryList"),
    registryEmpty: document.getElementById("registryEmpty"),
    registryFilterTorneo: document.getElementById("registryFilterTorneo"),
    bracketIndividualCard: document.getElementById("bracketIndividualCard"),
    bracketModeHint: document.getElementById("bracketModeHint"),
    bracketMainList: document.getElementById("bracketMainList"),
    bracketWaitList: document.getElementById("bracketWaitList"),
    bracketMainEmpty: document.getElementById("bracketMainEmpty"),
    bracketWaitEmpty: document.getElementById("bracketWaitEmpty"),
    btnBracketSync: document.getElementById("btnBracketSync"),
    knockoutAdminCard: document.getElementById("knockoutAdminCard"),
    knockoutAdminLead: document.getElementById("knockoutAdminLead"),
    knockoutAdminMsg: document.getElementById("knockoutAdminMsg"),
    knockoutAdminTree: document.getElementById("knockoutAdminTree"),
    btnKnockoutGenerate: document.getElementById("btnKnockoutGenerate"),
    btnKnockoutDelete: document.getElementById("btnKnockoutDelete"),
    btnKnockoutClearResults: document.getElementById("btnKnockoutClearResults"),
    currentPwd: document.getElementById("currentPwd"),
    newPwd: document.getElementById("newPwd"),
    btnSavePwd: document.getElementById("btnSavePwd"),
    pwdMsg: document.getElementById("pwdMsg")
  };

  const REG_CAT_LABELS = {
    individual: "Individual (FFA)",
    "1v1": "1v1 (1 jugador / inscripción)",
    "2v2": "2v2 (dúo, 2 jugadores)",
    "4v4": "4v4 (equipos)"
  };

  let currentTorneos = [];
  let currentRegistros = [];
  let selectedTorneoId = null;

  // Estado de la aplicación
  function updateUIState() {
    const isLoggedIn = window.apiClient.isAuthenticated();
    console.log('🔐 updateUIState - isLoggedIn:', isLoggedIn);
    console.log('🔐 updateUIState - token:', window.apiClient.token);
    
    elements.loginBox.hidden = isLoggedIn;
    elements.setupBox.hidden = true; // Siempre oculto al inicio
    elements.panel.hidden = !isLoggedIn;
    elements.btnLogout.hidden = !isLoggedIn;
    
    if (isLoggedIn) {
      console.log('🔐 User is logged in, loading admin data...');
      loadAdminData();
    } else {
      console.log('🔐 User not logged in, showing login');
    }
  }

  // Login
  async function handleLogin() {
    const email = elements.adminEmail.value.trim();
    const password = elements.adminPwd.value;

    if (!email || !password) {
      elements.pwdErr.textContent = "Email y contraseña son requeridos";
      return;
    }

    try {
      elements.btnLogin.disabled = true;
      elements.pwdErr.textContent = "";

      const response = await window.apiClient.login(email, password);
      
      setAdminSession(true);
      updateUIState();
      
      elements.pwdErr.textContent = "";
      elements.pwdErr.style.color = "var(--success)";
      elements.pwdErr.textContent = "✅ Login exitoso";
      
      setTimeout(() => {
        elements.pwdErr.textContent = "";
      }, 3000);
      
    } catch (error) {
      elements.pwdErr.textContent = error.message || "Error en el login";
      elements.pwdErr.style.color = "var(--danger)";
    } finally {
      elements.btnLogin.disabled = false;
    }
  }

  // Setup inicial
  async function handleSetup() {
    console.log('🔧 Creating admin...');
    const email = elements.setupEmail.value.trim();
    const password = elements.setupPwd.value;

    console.log('🔧 Setup data:', { email, passwordLength: password?.length });

    if (!email || !password) {
      elements.setupErr.textContent = "Email y contraseña son requeridos";
      return;
    }

    if (password.length < 4) {
      elements.setupErr.textContent = "La contraseña debe tener al menos 4 caracteres";
      return;
    }

    try {
      elements.btnCreateAdmin.disabled = true;
      elements.setupErr.textContent = "";

      console.log('🔧 Calling API setup...');
      await window.apiClient.setupAdmin(email, password);
      
      console.log('✅ Admin created successfully');
      elements.setupErr.textContent = "";
      elements.setupErr.style.color = "var(--success)";
      elements.setupErr.textContent = "✅ Administrador creado. Ahora puedes hacer login.";
      
      setTimeout(() => {
        showLogin();
        elements.setupErr.textContent = "";
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      elements.setupErr.textContent = error.message || "Error creando administrador";
      elements.setupErr.style.color = "var(--danger)";
    } finally {
      elements.btnCreateAdmin.disabled = false;
    }
  }

  // Logout
  async function handleLogout() {
    try {
      await window.apiClient.logout();
      setAdminSession(false);
      updateUIState();
    } catch (error) {
      console.error("Logout error:", error);
      // Forzar logout incluso si hay error
      setAdminSession(false);
      updateUIState();
    }
  }

  // Cambiar contraseña
  async function handleChangePassword() {
    const currentPassword = elements.currentPwd.value;
    const newPassword = elements.newPwd.value;

    if (!currentPassword || !newPassword) {
      elements.pwdMsg.textContent = "Ambas contraseñas son requeridas";
      elements.pwdMsg.style.color = "var(--danger)";
      return;
    }

    if (newPassword.length < 4) {
      elements.pwdMsg.textContent = "La nueva contraseña debe tener al menos 4 caracteres";
      elements.pwdMsg.style.color = "var(--danger)";
      return;
    }

    try {
      elements.btnSavePwd.disabled = true;
      elements.pwdMsg.textContent = "";

      await window.apiClient.changePassword(currentPassword, newPassword);
      
      elements.pwdMsg.textContent = "✅ Contraseña cambiada exitosamente";
      elements.pwdMsg.style.color = "var(--success)";
      
      elements.currentPwd.value = "";
      elements.newPwd.value = "";
      
      setTimeout(() => {
        elements.pwdMsg.textContent = "";
      }, 3000);
      
    } catch (error) {
      elements.pwdMsg.textContent = error.message || "Error cambiando contraseña";
      elements.pwdMsg.style.color = "var(--danger)";
    } finally {
      elements.btnSavePwd.disabled = false;
    }
  }

  // Cargar datos del administrador
  async function loadAdminData() {
    try {
      // Cargar torneos
      const torneosResponse = await window.apiClient.getTorneos();
      currentTorneos = torneosResponse;
      
      // Cargar registros
      const registrosResponse = await window.apiClient.getRegistros();
      currentRegistros = registrosResponse;
      
      updateTorneosList();
      updateRegistrosList();
      updateTorneoFilter();
      updateConnectionStatus();
      
    } catch (error) {
      console.error("Error loading admin data:", error);
      elements.connectionStatus.textContent = "❌ Error cargando datos";
    }
  }

  // Actualizar lista de torneos
  function updateTorneosList() {
    if (!elements.torneoList) return;

    if (currentTorneos.length === 0) {
      elements.torneoList.innerHTML = '<li class="muted">No hay torneos creados aún.</li>';
      return;
    }

    elements.torneoList.innerHTML = currentTorneos.map(torneo => `
      <li class="torneo-admin-item">
        <div class="torneo-admin-info">
          <strong>${torneo.nombre}</strong>
          <div class="muted">
            ${torneo.fecha} ${torneo.hora} • ${torneo.tipoFormato} • ${REG_CAT_LABELS[torneo.modalidad]} • 
            <span class="torneo-estado torneo-estado--${torneo.estado}">${torneo.estado}</span>
          </div>
        </div>
        <div class="torneo-admin-actions">
          <button class="btn btn--ghost btn--small" onclick="editTorneo('${torneo._id}')">Editar</button>
          <button class="btn btn--ghost btn--small btn--danger" onclick="deleteTorneo('${torneo._id}')">Eliminar</button>
        </div>
      </li>
    `).join('');
  }

  // Actualizar lista de registros
  function updateRegistrosList() {
    if (!elements.registryList) return;

    let registrosFiltrados = currentRegistros;
    
    if (selectedTorneoId) {
      registrosFiltrados = currentRegistros.filter(r => r.torneoId._id === selectedTorneoId);
    }

    if (registrosFiltrados.length === 0) {
      elements.registryEmpty.hidden = false;
      elements.registryList.innerHTML = '';
      return;
    }

    elements.registryEmpty.hidden = true;
    elements.registryList.innerHTML = registrosFiltrados.map(registro => `
      <li class="registry-item">
        <div class="registry-info">
          <strong>${registro.teamName || 'Sin nombre'}</strong>
          <div class="muted">
            ${REG_CAT_LABELS[registro.category]} • 
            ${registro.torneoId.nombre} • 
            Registrado: ${new Date(registro.registeredAt).toLocaleDateString()}
          </div>
          <div class="registry-players">
            ${registro.players.map(p => `${p.nick} (${p.mlId})`).join(', ')}
          </div>
        </div>
        <div class="registry-actions">
          <button class="btn btn--ghost btn--small btn--danger" onclick="deleteRegistro('${registro._id}')">Eliminar</button>
        </div>
      </li>
    `).join('');
  }

  // Actualizar filtro de torneos
  function updateTorneoFilter() {
    if (!elements.registryFilterTorneo) return;

    const currentValue = elements.registryFilterTorneo.value;
    
    elements.registryFilterTorneo.innerHTML = '<option value="">Todos</option>' +
      currentTorneos.map(torneo => 
        `<option value="${torneo._id}" ${currentValue === torneo._id ? 'selected' : ''}>${torneo.nombre}</option>`
      ).join('');
  }

  // Actualizar estado de conexión
  function updateConnectionStatus() {
    if (!elements.connectionStatus) return;

    const status = window.socketClient.connected ? 'Conectado' : 'Desconectado';
    const icon = window.socketClient.connected ? '🟢' : '🔴';
    
    elements.connectionStatus.innerHTML = `${icon} WebSocket: ${status} | API: Activa`;
  }

  // Crear torneo
  async function handleAddTorneo() {
    const nombre = elements.torneoNombre.value.trim();
    const fecha = elements.torneoFecha.value;
    const hora = elements.torneoHora.value;
    const tipoFormato = elements.torneoTipoFormato.value;
    const modalidad = elements.torneoModalidad.value;

    if (!nombre || !fecha || !hora || !modalidad) {
      elements.torneoMsg.textContent = "Todos los campos son requeridos";
      elements.torneoMsg.style.color = "var(--danger)";
      return;
    }

    try {
      elements.btnAddTorneo.disabled = true;
      elements.torneoMsg.textContent = "";

      const torneo = await window.apiClient.createTorneo({
        nombre,
        fecha,
        hora,
        tipoFormato,
        modalidad
      });

      elements.torneoMsg.textContent = "✅ Torneo creado exitosamente";
      elements.torneoMsg.style.color = "var(--success)";
      
      // Limpiar formulario
      elements.torneoNombre.value = "";
      elements.torneoFecha.value = "";
      elements.torneoHora.value = "";
      elements.torneoModalidad.value = "";
      
      // Recargar datos
      await loadAdminData();
      
      setTimeout(() => {
        elements.torneoMsg.textContent = "";
      }, 3000);
      
    } catch (error) {
      elements.torneoMsg.textContent = error.message || "Error creando torneo";
      elements.torneoMsg.style.color = "var(--danger)";
    } finally {
      elements.btnAddTorneo.disabled = false;
    }
  }

  // Funciones globales para los botones de acción
  window.editTorneo = async function(torneoId) {
    const torneo = currentTorneos.find(t => t._id === torneoId);
    if (!torneo) return;

    const nuevoNombre = prompt("Nuevo nombre del torneo:", torneo.nombre);
    if (!nuevoNombre) return;

    try {
      await window.apiClient.updateTorneo(torneoId, { nombre: nuevoNombre.trim() });
      await loadAdminData();
    } catch (error) {
      alert("Error actualizando torneo: " + error.message);
    }
  };

  window.deleteTorneo = async function(torneoId) {
    if (!confirm("¿Estás seguro de eliminar este torneo? También se eliminarán todos los registros asociados.")) {
      return;
    }

    try {
      await window.apiClient.deleteTorneo(torneoId);
      await loadAdminData();
    } catch (error) {
      alert("Error eliminando torneo: " + error.message);
    }
  };

  window.deleteRegistro = async function(registroId) {
    if (!confirm("¿Estás seguro de eliminar esta inscripción?")) {
      return;
    }

    try {
      await window.apiClient.deleteRegistro(registroId);
      await loadAdminData();
    } catch (error) {
      alert("Error eliminando registro: " + error.message);
    }
  };

  // UI helpers
  function showSetup() {
    elements.loginBox.hidden = true;
    elements.setupBox.hidden = false;
  }

  function showLogin() {
    elements.loginBox.hidden = false;
    elements.setupBox.hidden = true;
  }

  function setAdminSession(active) {
    if (typeof setAdminSession === 'function') {
      setAdminSession(active);
    }
  }

  // Event listeners
  if (elements.btnLogin) elements.btnLogin.addEventListener("click", handleLogin);
  if (elements.btnLogout) elements.btnLogout.addEventListener("click", handleLogout);
  if (elements.btnShowSetup) elements.btnShowSetup.addEventListener("click", showSetup);
  if (elements.btnShowLogin) elements.btnShowLogin.addEventListener("click", showLogin);
  if (elements.btnCreateAdmin) elements.btnCreateAdmin.addEventListener("click", handleSetup);
  if (elements.btnAddTorneo) elements.btnAddTorneo.addEventListener("click", handleAddTorneo);
  if (elements.btnSavePwd) elements.btnSavePwd.addEventListener("click", handleChangePassword);

  // Filtro de torneos
  if (elements.registryFilterTorneo) {
    elements.registryFilterTorneo.addEventListener("change", function() {
      selectedTorneoId = this.value;
      updateRegistrosList();
    });
  }

  // Enter key para login
  if (elements.adminPwd) {
    elements.adminPwd.addEventListener("keypress", function(e) {
      if (e.key === "Enter") handleLogin();
    });
  }

  // Event listeners de WebSocket
  document.addEventListener('torneo-created', function(e) {
    console.log('🏆 Torneo creado en tiempo real:', e.detail);
    loadAdminData();
  });

  document.addEventListener('torneo-updated', function(e) {
    console.log('🏆 Torneo actualizado en tiempo real:', e.detail);
    loadAdminData();
  });

  document.addEventListener('torneo-deleted', function(e) {
    console.log('🏆 Torneo eliminado en tiempo real:', e.detail);
    loadAdminData();
  });

  document.addEventListener('registro-created', function(e) {
    console.log('📝 Registro creado en tiempo real:', e.detail);
    loadAdminData();
  });

  document.addEventListener('registro-deleted', function(e) {
    console.log('📝 Registro eliminado en tiempo real:', e.detail);
    loadAdminData();
  });

  // Inicialización
  updateUIState();
  updateConnectionStatus();

  // Actualizar estado de conexión periódicamente
  setInterval(updateConnectionStatus, 10000);

})();
