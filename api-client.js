// Cliente API para comunicación con el backend
class ApiClient {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://torneoml.onrender.com' 
      : 'http://localhost:3001';
    this.token = localStorage.getItem('adminToken');
  }

  // Métodos HTTP genéricos
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Agregar token si existe
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos específicos
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Autenticación
  async login(email, password) {
    const response = await this.post('/auth/login', { email, password });
    this.token = response.token;
    localStorage.setItem('adminToken', this.token);
    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.token = null;
      localStorage.removeItem('adminToken');
    }
  }

  async getCurrentAdmin() {
    return this.get('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.put('/auth/change-password', { currentPassword, newPassword });
  }

  async setupAdmin(email, password) {
    return this.post('/auth/setup', { email, password });
  }

  // Torneos
  async getTorneos(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/torneos?${params}`);
  }

  async getTorneo(id) {
    return this.get(`/torneos/${id}`);
  }

  async createTorneo(torneoData) {
    return this.post('/torneos', torneoData);
  }

  async updateTorneo(id, torneoData) {
    return this.put(`/torneos/${id}`, torneoData);
  }

  async deleteTorneo(id) {
    return this.delete(`/torneos/${id}`);
  }

  async updateBracket(id, bracket) {
    return this.put(`/torneos/${id}/bracket`, { bracket });
  }

  async generateKnockout(id) {
    return this.post(`/torneos/${id}/knockout`);
  }

  async updateKnockoutResults(id, knockoutBracket) {
    return this.put(`/torneos/${id}/knockout/results`, { knockoutBracket });
  }

  // Registros
  async getRegistros(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.get(`/registros?${params}`);
  }

  async getRegistro(id) {
    return this.get(`/registros/${id}`);
  }

  async createRegistro(registroData) {
    return this.post('/registros', registroData);
  }

  async updateRegistro(id, registroData) {
    return this.put(`/registros/${id}`, registroData);
  }

  async deleteRegistro(id) {
    return this.delete(`/registros/${id}`);
  }

  async getRegistrosByTorneo(torneoId, category) {
    const params = category ? `?category=${category}` : '';
    return this.get(`/registros/torneo/${torneoId}${params}`);
  }

  async getRegistroStats() {
    return this.get('/registros/stats/overview');
  }

  // Verificar si está autenticado
  isAuthenticated() {
    return !!this.token;
  }

  // Limpiar token
  clearToken() {
    this.token = null;
    localStorage.removeItem('adminToken');
  }
}

// Instancia global
window.apiClient = new ApiClient();

// WebSocket para actualizaciones en tiempo real
class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
  }

  connect() {
    if (this.socket) return;

    const baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://torneoml.onrender.com' 
      : 'http://localhost:3001';

    this.socket = io(baseURL);

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.connected = false;
    });

    // Eventos genéricos
    this.socket.on('torneo-created', (data) => {
      this.emit('torneo-created', data);
    });

    this.socket.on('torneo-updated', (data) => {
      this.emit('torneo-updated', data);
    });

    this.socket.on('torneo-deleted', (data) => {
      this.emit('torneo-deleted', data);
    });

    this.socket.on('registro-created', (data) => {
      this.emit('registro-created', data);
    });

    this.socket.on('registro-updated', (data) => {
      this.emit('registro-updated', data);
    });

    this.socket.on('registro-deleted', (data) => {
      this.emit('registro-deleted', data);
    });

    this.socket.on('new-registration', (data) => {
      this.emit('new-registration', data);
    });

    this.socket.on('registration-deleted', (data) => {
      this.emit('registration-deleted', data);
    });

    this.socket.on('bracket-updated', (data) => {
      this.emit('bracket-updated', data);
    });

    this.socket.on('knockout-updated', (data) => {
      this.emit('knockout-updated', data);
    });

    this.socket.on('knockout-results-updated', (data) => {
      this.emit('knockout-results-updated', data);
    });
  }

  joinTorneo(torneoId) {
    if (this.socket && this.connected) {
      this.socket.emit('join-torneo', torneoId);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Instancia global
window.socketClient = new SocketClient();
