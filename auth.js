// Sistema de autenticación compartido para todas las páginas
(function() {
  "use strict";

  // Verificar si el usuario está autenticado
  function isAuthenticated() {
    return localStorage.getItem('userToken') !== null;
  }

  // Obtener información del usuario actual
  function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Redirigir al login si no está autenticado
  function requireAuth(redirectUrl = 'login.html') {
    if (!isAuthenticated()) {
      // Guardar la URL actual para redirigir después del login
      localStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  }

  // Redirigir a la página guardada después del login
  function redirectAfterLogin() {
    const redirectUrl = localStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectUrl;
    }
  }

  // Verificar si es admin
  function isAdmin() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'superadmin');
  }

  // Redirigir si no es admin
  function requireAdmin(redirectUrl = 'login.html') {
    if (!isAuthenticated()) {
      localStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = redirectUrl;
      return false;
    }
    if (!isAdmin()) {
      alert('Acceso denegado. Se requieren permisos de administrador.');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  // Mostrar información del usuario en la UI
  function displayUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    // Buscar elementos comunes para mostrar info del usuario
    const userInfoElements = document.querySelectorAll('.user-info');
    userInfoElements.forEach(el => {
      el.textContent = user.nick || user.email;
    });

    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(el => {
      el.textContent = user.role === 'admin' || user.role === 'superadmin' ? 'Administrador' : 'Jugador';
    });
  }

  // Agregar botón de logout si existe un elemento para eso
  function addLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('userToken');
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
    });
  }

  // Inicializar autenticación
  function initAuth() {
    // Verificar autenticación requerida
    const requireAuthAttr = document.body.getAttribute('data-require-auth');
    if (requireAuthAttr === 'true') {
      requireAuth();
    }

    // Verificar admin requerido
    const requireAdminAttr = document.body.getAttribute('data-require-admin');
    if (requireAdminAttr === 'true') {
      requireAdmin();
    }

    // Mostrar información del usuario
    displayUserInfo();

    // Agregar botón de logout
    addLogoutButton();
  }

  // Exportar funciones al scope global
  window.Auth = {
    isAuthenticated,
    getCurrentUser,
    requireAuth,
    redirectAfterLogin,
    isAdmin,
    requireAdmin,
    displayUserInfo,
    addLogoutButton
  };

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }

})();
