// js/api-client.js - Cliente completo para conectar con la API

class ApiClient {
  constructor() {
    this.baseURL = "http://localhost:3000/api"; // Cambia por tu URL de producción
    this.sessionId = localStorage.getItem("sessionId");
  }

  // Método genérico para hacer peticiones
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Agregar token de sesión si existe
    if (this.sessionId) {
      config.headers.Authorization = `Bearer ${this.sessionId}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Si es error 401, cerrar sesión automáticamente
        if (response.status === 401) {
          this.logout();
          throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        }
        throw new Error(data.error || "Error en la petición");
      }

      return data;
    } catch (error) {
      console.error("Error en petición:", error);
      throw error;
    }
  }

  // ==================
  // MÉTODOS DE AUTH
  // ==================

  async register(userData) {
    return await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.sessionId) {
      this.sessionId = response.sessionId;
      localStorage.setItem("sessionId", response.sessionId);
      localStorage.setItem("user", JSON.stringify(response.user));
    }

    return response;
  }

  logout() {
    this.sessionId = null;
    localStorage.removeItem("sessionId");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }

  // ✅ FUNCIÓN CORREGIDA - YA NO ESTÁ DUPLICADA
  getCurrentUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
  }

  async getUserInfo() {
    try {
      const response = await this.request("/auth/me");
      // Actualizar localStorage con info fresca
      localStorage.setItem("user", JSON.stringify(response.user));
      return response.user;
    } catch (error) {
      console.error("Error obteniendo info del usuario:", error);
      // Si hay error de autenticación, cerrar sesión
      if (
        error.message.includes("401") ||
        error.message.includes("Sesión expirada")
      ) {
        this.logout();
      }
      throw error;
    }
  }

  async forgotPassword(email) {
    return await this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, newPassword) {
    return await this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // ==================
  // MÉTODOS DE POSTS
  // ==================

  async getPosts(page = 1, limit = 10) {
    return await this.request(`/posts?page=${page}&limit=${limit}`);
  }

  async createPost(formData) {
    return await this.request("/posts", {
      method: "POST",
      headers: {}, // Quitar Content-Type para FormData
      body: formData,
    });
  }

  async votePost(postId, tipo) {
    return await this.request(`/posts/${postId}/vote`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
  }

  async getComments(postId) {
    return await this.request(`/posts/${postId}/comments`);
  }

  async createComment(postId, contenido) {
    return await this.request(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ contenido }),
    });
  }

  // ==================
  // MÉTODOS DE TICKETS (ACTUALIZADOS)
  // ==================

  async getTickets() {
    return await this.request("/tickets");
  }

  async createTicket(ticketData) {
    return await this.request("/tickets", {
      method: "POST",
      body: JSON.stringify(ticketData),
    });
  }

  // ✅ NUEVO MÉTODO PARA RESPONDER TICKETS (para admins/secretarias)
  async respondTicket(ticketId, respuesta, estado = "en_proceso") {
    return await this.request(`/tickets/${ticketId}/respond`, {
      method: "POST",
      body: JSON.stringify({ respuesta, estado }),
    });
  }

  // ✅ NUEVO MÉTODO PARA OBTENER RESPUESTAS DE UN TICKET
  async getTicketResponses(ticketId) {
    return await this.request(`/tickets/${ticketId}/responses`);
  }

  // ✅ MÉTODO PARA ACTUALIZAR ESTADO DE TICKET (solo admins)
  async updateTicketStatus(ticketId, estado) {
    return await this.request(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  }

  // ==================
  // MÉTODOS DE PUBLICACIONES (ACTUALIZADOS)
  // ==================

  async getPublicaciones() {
    return await this.request("/publicaciones");
  }

  // ✅ NUEVO MÉTODO PARA CREAR PUBLICACIONES CON IMAGEN (solo admins)
  async createPublicacion(publicacionData) {
    return await this.request("/publicaciones", {
      method: "POST",
      body: JSON.stringify(publicacionData),
    });
  }

  // ✅ MÉTODO ESPECÍFICO PARA CREAR PUBLICACIONES CON FORMDATA (imágenes)
  async createPublicacionConFormData(formData) {
    return await this.request("/publicaciones", {
      method: "POST",
      headers: {}, // Sin Content-Type para FormData
      body: formData,
    });
  }

  // ✅ MÉTODO PARA EDITAR PUBLICACIONES (solo admins)
  async updatePublicacion(publicacionId, publicacionData) {
    return await this.request(`/publicaciones/${publicacionId}`, {
      method: "PUT",
      body: JSON.stringify(publicacionData),
    });
  }

  // ✅ MÉTODO PARA ELIMINAR PUBLICACIONES (solo admins)
  async deletePublicacion(publicacionId) {
    return await this.request(`/publicaciones/${publicacionId}`, {
      method: "DELETE",
    });
  }

  // ==================
  // MÉTODOS DE UTILIDAD
  // ==================

  // ✅ MÉTODO PARA VERIFICAR SI EL USUARIO ESTÁ AUTENTICADO
  isAuthenticated() {
    return !!(this.sessionId && this.getCurrentUser());
  }

  // ✅ MÉTODO PARA VERIFICAR ROL DEL USUARIO
  hasRole(rol) {
    const user = this.getCurrentUser();
    return user && user.rol === rol;
  }

  // ✅ MÉTODO PARA VERIFICAR SI ES ADMIN
  isAdmin() {
    return this.hasRole("admin");
  }

  // ✅ MÉTODO PARA VERIFICAR SI ES ESTUDIANTE
  isStudent() {
    return this.hasRole("estudiante");
  }

  // ✅ MÉTODO PARA VERIFICAR SI ES SECRETARIA
  isSecretary() {
    return this.hasRole("secretaria");
  }

  // ✅ MÉTODO PARA VERIFICAR SI ES ADMIN O SECRETARIA
  isAdminOrSecretary() {
    const user = this.getCurrentUser();
    return user && ["admin", "secretaria"].includes(user.rol);
  }

  // ✅ MÉTODO PARA OBTENER EL ROL ACTUAL
  getCurrentRole() {
    const user = this.getCurrentUser();
    return user ? user.rol : null;
  }

  // ✅ MÉTODO PARA OBTENER EL NOMBRE DEL USUARIO
  getCurrentUsername() {
    const user = this.getCurrentUser();
    return user ? user.username : null;
  }

  // ✅ MÉTODO PARA VERIFICAR SI LA SESIÓN ES VÁLIDA
  async validateSession() {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==================
  // MÉTODOS PARA COMENTARIOS Y VOTACIONES (FUTUROS)
  // ==================

  // ✅ MÉTODO PARA VOTAR COMENTARIOS
  async voteComment(commentId, tipo) {
    return await this.request(`/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
  }

  // ✅ MÉTODO PARA EDITAR COMENTARIOS
  async updateComment(commentId, contenido) {
    return await this.request(`/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ contenido }),
    });
  }

  // ✅ MÉTODO PARA ELIMINAR COMENTARIOS
  async deleteComment(commentId) {
    return await this.request(`/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  // ==================
  // MÉTODOS DE ESTADÍSTICAS (PARA ADMINS)
  // ==================

  // ✅ MÉTODO PARA OBTENER ESTADÍSTICAS GENERALES
  async getStats() {
    return await this.request("/stats");
  }

  // ✅ MÉTODO PARA OBTENER ESTADÍSTICAS DE TICKETS
  async getTicketStats() {
    return await this.request("/stats/tickets");
  }

  // ✅ MÉTODO PARA OBTENER ESTADÍSTICAS DE USUARIOS
  async getUserStats() {
    return await this.request("/stats/users");
  }

  // ==================
  // MÉTODOS DE CONFIGURACIÓN (PARA ADMINS)
  // ==================

  // ✅ MÉTODO PARA OBTENER CONFIGURACIÓN
  async getConfig() {
    return await this.request("/config");
  }

  // ✅ MÉTODO PARA ACTUALIZAR CONFIGURACIÓN
  async updateConfig(configData) {
    return await this.request("/config", {
      method: "PUT",
      body: JSON.stringify(configData),
    });
  }
}

// Instancia global del cliente API
const apiClient = new ApiClient();
