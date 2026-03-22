// Adaptación de torneo.js para usar API
(function () {
  "use strict";

  // Verificar que tenemos el cliente API
  if (!window.apiClient) {
    console.error("❌ API client not found");
    return;
  }

  // Elementos del DOM
  const elements = {
    torneoRoot: document.getElementById("torneoRoot"),
    torneoListView: document.getElementById("torneoListView"),
    torneoDetailView: document.getElementById("torneoDetailView"),
    torneoListEmpty: document.getElementById("torneoListEmpty"),
    torneoPublicCards: document.getElementById("torneoPublicCards"),
    detailTitle: document.getElementById("detailTitle"),
    detailWhen: document.getElementById("detailWhen"),
    detailEstado: document.getElementById("detailEstado"),
    detailFormatoMod: document.getElementById("detailFormatoMod"),
    clasifSections: document.getElementById("clasifSections"),
    bracketPublicWrap: document.getElementById("bracketPublicWrap"),
    bracketPublicLead: document.getElementById("bracketPublicLead"),
    bracketPublicMain: document.getElementById("bracketPublicMain"),
    bracketPublicWait: document.getElementById("bracketPublicWait"),
    knockoutPublicWrap: document.getElementById("knockoutPublicWrap"),
    knockoutPublicLead: document.getElementById("knockoutPublicLead"),
    knockoutPublicTree: document.getElementById("knockoutPublicTree")
  };

  let currentTorneos = [];
  let currentTorneoId = null;

  // Cargar torneos
  async function loadTorneos() {
    try {
      console.log('🔍 Loading torneos...');
      const torneos = await window.apiClient.getTorneos();
      console.log('✅ Torneos loaded:', torneos);
      
      currentTorneos = torneos;
      renderTorneosList();
    } catch (error) {
      console.error('❌ Error loading torneos:', error);
      showError('Error cargando torneos: ' + error.message);
    }
  }

  // Renderizar lista de torneos
  function renderTorneosList() {
    if (!elements.torneoPublicCards) return;

    if (currentTorneos.length === 0) {
      elements.torneoListEmpty.hidden = false;
      elements.torneoPublicCards.innerHTML = '';
      return;
    }

    elements.torneoListEmpty.hidden = true;
    elements.torneoPublicCards.innerHTML = currentTorneos.map(torneo => `
      <li class="torneo-public-item">
        <div class="torneo-public-card" onclick="viewTorneo('${torneo._id}')">
          <div class="torneo-public-header">
            <h3 class="torneo-public-title">${torneo.nombre}</h3>
            <span class="torneo-public-estado torneo-estado--${torneo.estado}">${torneo.estado}</span>
          </div>
          <div class="torneo-public-info">
            <div class="torneo-public-datetime">
              📅 ${torneo.fecha} ⏰ ${torneo.hora}
            </div>
            <div class="torneo-public-format">
              🏆 ${torneo.tipoFormato} • 👥 ${getModalidadLabel(torneo.modalidad)}
            </div>
          </div>
        </div>
      </li>
    `).join('');
  }

  // Ver detalles de torneo
  async function viewTorneo(torneoId) {
    try {
      console.log('🔍 Loading torneo details:', torneoId);
      const torneo = await window.apiClient.getTorneo(torneoId);
      console.log('✅ Torneo details loaded:', torneo);
      
      currentTorneoId = torneoId;
      renderTorneoDetail(torneo);
      
      // Unirse a actualizaciones en tiempo real
      if (window.socketClient) {
        window.socketClient.joinTorneo(torneoId);
      }
    } catch (error) {
      console.error('❌ Error loading torneo details:', error);
      showError('Error cargando detalles del torneo: ' + error.message);
    }
  }

  // Renderizar detalles del torneo
  function renderTorneoDetail(torneo) {
    if (!elements.torneoListView || !elements.torneoDetailView) return;

    elements.torneoListView.hidden = true;
    elements.torneoDetailView.hidden = false;

    elements.detailTitle.textContent = torneo.nombre;
    elements.detailWhen.textContent = `${torneo.fecha} a las ${torneo.hora}`;
    elements.detailEstado.textContent = `Estado: ${getEstadoLabel(torneo.estado)}`;
    elements.detailFormatoMod.textContent = `Formato: ${torneo.tipoFormato} • Modalidad: ${getModalidadLabel(torneo.modalidad)}`;

    // Renderizar clasificaciones
    renderClasificaciones(torneo);
    
    // Renderizar bracket si existe
    if (torneo.bracket && (torneo.bracket.main.length > 0 || torneo.bracket.waitlist.length > 0)) {
      renderBracket(torneo.bracket);
    }
    
    // Renderizar knockout si existe
    if (torneo.knockoutBracket && torneo.knockoutBracket.rounds && torneo.knockoutBracket.rounds.length > 0) {
      renderKnockout(torneo.knockoutBracket);
    }
  }

  // Renderizar clasificaciones
  function renderClasificaciones(torneo) {
    if (!elements.clasifSections) return;

    // Agrupar registros por categoría
    const registrosPorCategoria = {};
    
    if (torneo.bracket) {
      [...torneo.bracket.main, ...torneo.bracket.waitlist].forEach(registro => {
        if (registro.registroId) {
          const category = registro.registroId.category;
          if (!registrosPorCategoria[category]) {
            registrosPorCategoria[category] = [];
          }
          registrosPorCategoria[category].push(registro.registroId);
        }
      });
    }

    elements.clasifSections.innerHTML = Object.entries(registrosPorCategoria).map(([category, registros]) => `
      <div class="card">
        <h2>${getModalidadLabel(category)}</h2>
        <div class="clasif-list">
          ${registros.map(registro => `
            <div class="clasif-item">
              <strong>${registro.teamName || 'Sin nombre'}</strong>
              <div class="clasif-players">
                ${registro.players.map(p => `${p.nick} (${p.mlId})`).join(', ')}
              </div>
              <div class="muted">
                Registrado: ${new Date(registro.registeredAt).toLocaleDateString()}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Renderizar bracket
  function renderBracket(bracket) {
    if (!elements.bracketPublicWrap) return;

    elements.bracketPublicWrap.hidden = false;
    elements.bracketPublicLead.textContent = `Grupo principal: ${bracket.main.length} participantes | Lista de espera: ${bracket.waitlist.length} participantes`;
    
    elements.bracketPublicMain.innerHTML = bracket.main.map((registro, index) => `
      <li class="bracket-item">
        <span class="bracket-position">#${index + 1}</span>
        <div class="bracket-player">
          ${registro.registroId ? (registro.registroId.teamName || registro.registroId.players[0].nick) : 'Vacante'}
        </div>
      </li>
    `).join('');

    elements.bracketPublicWait.innerHTML = bracket.waitlist.map((registro, index) => `
      <li class="bracket-item">
        <span class="bracket-position">#${index + 1}</span>
        <div class="bracket-player">
          ${registro.registroId ? (registro.registroId.teamName || registro.registroId.players[0].nick) : 'Vacante'}
        </div>
      </li>
    `).join('');
  }

  // Renderizar knockout
  function renderKnockout(knockoutBracket) {
    if (!elements.knockoutPublicWrap || !elements.knockoutPublicTree) return;

    elements.knockoutPublicWrap.hidden = false;
    elements.knockoutPublicLead.textContent = 'Cuadro de llaves eliminatorias';
    
    // Renderizar árbol de llaves (simplificado)
    elements.knockoutPublicTree.innerHTML = knockoutBracket.rounds.map((round, roundIndex) => `
      <div class="knockout-round">
        <h4>Ronda ${roundIndex + 1}</h4>
        <div class="knockout-matches">
          ${round.matches.map((match, matchIndex) => `
            <div class="knockout-match">
              <div class="knockout-players">
                <div class="knockout-player">
                  ${match.player1 ? (match.player1.teamName || match.player1.players[0].nick) : 'TBD'}
                </div>
                <div class="knockout-vs">VS</div>
                <div class="knockout-player">
                  ${match.player2 ? (match.player2.teamName || match.player2.players[0].nick) : 'TBD'}
                </div>
              </div>
              ${match.finished ? `
                <div class="knockout-score">
                  ${match.score1} - ${match.score2}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Funciones utilitarias
  function getModalidadLabel(modalidad) {
    const labels = {
      individual: "Individual (FFA)",
      "1v1": "1v1 (1 jugador)",
      "2v2": "2v2 (dúo)",
      "4v4": "4v4 (equipos)"
    };
    return labels[modalidad] || modalidad;
  }

  function getEstadoLabel(estado) {
    const labels = {
      inscripcion: "En inscripción",
      en_curso: "En curso",
      finalizado: "Finalizado"
    };
    return labels[estado] || estado;
  }

  function showError(message) {
    console.error('❌ Error:', message);
    // Podríamos mostrar un toast o alerta aquí
    if (elements.torneoRoot) {
      elements.torneoRoot.innerHTML = `
        <div class="card" style="background: var(--danger); color: white; text-align: center; padding: 2rem;">
          <h2>❌ Error</h2>
          <p>${message}</p>
          <button class="btn btn--ghost" onclick="location.reload()">Reintentar</button>
        </div>
      `;
    }
  }

  // Hacer funciones globales para onclick
  window.viewTorneo = viewTorneo;

  // Event listeners de WebSocket
  document.addEventListener('torneo-updated', function(e) {
    console.log('🏆 Torneo actualizado en tiempo real:', e.detail);
    if (currentTorneoId === e.detail._id) {
      viewTorneo(currentTorneoId);
    } else {
      loadTorneos();
    }
  });

  document.addEventListener('torneo-created', function(e) {
    console.log('🏆 Nuevo torneo creado:', e.detail);
    loadTorneos();
  });

  document.addEventListener('torneo-deleted', function(e) {
    console.log('🗑️ Torneo eliminado:', e.detail);
    loadTorneos();
  });

  // Inicialización
  console.log('🚀 Torneo API page loaded');
  loadTorneos();

})();
