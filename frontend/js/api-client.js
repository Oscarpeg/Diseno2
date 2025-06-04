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

  async getPosts(page = 1, limit = 20) {
    return await this.request(`/posts?page=${page}&limit=${limit}`);
  }

  async createPost(formData) {
    return await this.request("/posts", {
      method: "POST",
      headers: {}, // Quitar Content-Type para FormData
      body: formData,
    });
  }

  async getPost(postId) {
    return await this.request(`/posts/${postId}`);
  }

  async updatePost(postId, postData) {
    return await this.request(`/posts/${postId}`, {
      method: "PUT",
      body: JSON.stringify(postData),
    });
  }

  async deletePost(postId) {
    return await this.request(`/posts/${postId}`, {
      method: "DELETE",
    });
  }

  // ==================
  // MÉTODOS DE VOTACIÓN (NUEVOS)
  // ==================

  async votePost(postId, tipo) {
    return await this.request(`/posts/${postId}/vote`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
  }

  async getPostVotes(postId) {
    return await this.request(`/posts/${postId}/votes`);
  }

  async getMyVote(postId) {
    return await this.request(`/posts/${postId}/my-vote`);
  }

  // ==================
  // MÉTODOS DE COMENTARIOS
  // ==================

  async getComments(postId) {
    return await this.request(`/posts/${postId}/comments`);
  }

  async createComment(postId, contenido) {
    return await this.request(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ contenido }),
    });
  }

  async updateComment(commentId, contenido) {
    return await this.request(`/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ contenido }),
    });
  }

  async deleteComment(commentId) {
    return await this.request(`/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  async voteComment(commentId, tipo) {
    return await this.request(`/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    });
  }

  // ==================
  // MÉTODOS DE TICKETS (ACTUALIZADOS CON TEMA)
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

  async getTicket(ticketId) {
    return await this.request(`/tickets/${ticketId}`);
  }

  async respondTicket(ticketId, respuesta, estado = "en_proceso") {
    return await this.request(`/tickets/${ticketId}/respond`, {
      method: "POST",
      body: JSON.stringify({ respuesta, estado }),
    });
  }

  async getTicketResponses(ticketId) {
    return await this.request(`/tickets/${ticketId}/responses`);
  }

  async updateTicketStatus(ticketId, estado) {
    return await this.request(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  }

  async deleteTicket(ticketId) {
    return await this.request(`/tickets/${ticketId}`, {
      method: "DELETE",
    });
  }

  // ==================
  // MÉTODOS DE PUBLICACIONES (ACTUALIZADOS)
  // ==================

  async getPublicaciones() {
    return await this.request("/publicaciones");
  }

  async createPublicacion(publicacionData) {
    return await this.request("/publicaciones", {
      method: "POST",
      body: JSON.stringify(publicacionData),
    });
  }

  async createPublicacionConFormData(formData) {
    return await this.request("/publicaciones", {
      method: "POST",
      headers: {}, // Sin Content-Type para FormData
      body: formData,
    });
  }

  async getPublicacion(publicacionId) {
    return await this.request(`/publicaciones/${publicacionId}`);
  }

  async updatePublicacion(publicacionId, publicacionData) {
    return await this.request(`/publicaciones/${publicacionId}`, {
      method: "PUT",
      body: JSON.stringify(publicacionData),
    });
  }

  async deletePublicacion(publicacionId) {
    return await this.request(`/publicaciones/${publicacionId}`, {
      method: "DELETE",
    });
  }

  // ==================
  // MÉTODOS DE UTILIDAD
  // ==================

  isAuthenticated() {
    return !!(this.sessionId && this.getCurrentUser());
  }

  hasRole(rol) {
    const user = this.getCurrentUser();
    return user && user.rol === rol;
  }

  isAdmin() {
    return this.hasRole("admin");
  }

  isStudent() {
    const user = this.getCurrentUser();
    return user && ["estudiante", "usuario"].includes(user.rol);
  }

  isSecretary() {
    return this.hasRole("secretaria");
  }

  isAdminOrSecretary() {
    const user = this.getCurrentUser();
    return user && ["admin", "secretaria"].includes(user.rol);
  }

  getCurrentRole() {
    const user = this.getCurrentUser();
    return user ? user.rol : null;
  }

  getCurrentUsername() {
    const user = this.getCurrentUser();
    return user ? user.username : null;
  }

  getCurrentUserId() {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  }

  async validateSession() {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==================
  // MÉTODOS DE BÚSQUEDA Y FILTROS
  // ==================

  async searchPosts(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters,
    });
    return await this.request(`/posts/search?${params}`);
  }

  async getPostsByUser(userId, page = 1, limit = 20) {
    return await this.request(
      `/users/${userId}/posts?page=${page}&limit=${limit}`
    );
  }

  async getPostsByTag(tag, page = 1, limit = 20) {
    return await this.request(`/posts/tag/${tag}?page=${page}&limit=${limit}`);
  }

  async getTicketsByTema(tema) {
    return await this.request(`/tickets?tema=${tema}`);
  }

  async getTicketsByEstado(estado) {
    return await this.request(`/tickets?estado=${estado}`);
  }

  // ==================
  // MÉTODOS DE ESTADÍSTICAS (PARA ADMINS)
  // ==================

  async getStats() {
    return await this.request("/stats");
  }

  async getTicketStats() {
    return await this.request("/stats/tickets");
  }

  async getUserStats() {
    return await this.request("/stats/users");
  }

  async getPostStats() {
    return await this.request("/stats/posts");
  }

  async getVotingStats() {
    return await this.request("/stats/votes");
  }

  // ==================
  // MÉTODOS DE CONFIGURACIÓN (PARA ADMINS)
  // ==================

  async getConfig() {
    return await this.request("/config");
  }

  async updateConfig(configData) {
    return await this.request("/config", {
      method: "PUT",
      body: JSON.stringify(configData),
    });
  }

  // ==================
  // MÉTODOS DE NOTIFICACIONES
  // ==================

  async getNotifications() {
    return await this.request("/notifications");
  }

  async markNotificationAsRead(notificationId) {
    return await this.request(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }

  async markAllNotificationsAsRead() {
    return await this.request("/notifications/read-all", {
      method: "PATCH",
    });
  }

  // ==================
  // MÉTODOS DE MODERACIÓN (PARA ADMINS)
  // ==================

  async moderatePost(postId, action, reason = "") {
    return await this.request(`/posts/${postId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  }

  async moderateComment(commentId, action, reason = "") {
    return await this.request(`/comments/${commentId}/moderate`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    });
  }

  async banUser(userId, reason, duration = null) {
    return await this.request(`/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason, duration }),
    });
  }

  async unbanUser(userId) {
    return await this.request(`/users/${userId}/unban`, {
      method: "POST",
    });
  }

  // ==================
  // MÉTODOS DE ARCHIVOS Y UPLOADS
  // ==================

  async uploadImage(file, folder = "general") {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    return await this.request("/upload/image", {
      method: "POST",
      headers: {}, // Sin Content-Type para FormData
      body: formData,
    });
  }

  async deleteImage(imageUrl) {
    return await this.request("/upload/delete", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl }),
    });
  }

  // ==================
  // MÉTODOS DE REPORTES Y ANÁLISIS
  // ==================

  async reportContent(contentType, contentId, reason) {
    return await this.request("/reports", {
      method: "POST",
      body: JSON.stringify({ contentType, contentId, reason }),
    });
  }

  async getReports() {
    return await this.request("/reports");
  }

  async resolveReport(reportId, action, notes = "") {
    return await this.request(`/reports/${reportId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action, notes }),
    });
  }

  // ==================
  // MÉTODOS DE EXPORTACIÓN
  // ==================

  async exportData(type, format = "json", filters = {}) {
    const params = new URLSearchParams({
      type,
      format,
      ...filters,
    });

    const response = await fetch(`${this.baseURL}/export?${params}`, {
      headers: {
        Authorization: `Bearer ${this.sessionId}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error exportando datos");
    }

    return response.blob();
  }

  // ==================
  // MÉTODOS DE HEALTH CHECK
  // ==================

  async healthCheck() {
    try {
      const response = await fetch(
        `${this.baseURL.replace("/api", "")}/health`
      );
      return await response.json();
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  async getDatabaseStatus() {
    return await this.request("/system/database");
  }

  // ==================
  // MÉTODOS DE DEBUGGING (SOLO DESARROLLO)
  // ==================

  async getDebugInfo() {
    if (process?.env?.NODE_ENV !== "development") {
      throw new Error("Debug info solo disponible en desarrollo");
    }
    return await this.request("/debug/info");
  }

  async clearCache() {
    return await this.request("/debug/clear-cache", {
      method: "POST",
    });
  }

  // ==================
  // UTILIDADES DE FORMATO
  // ==================

  formatError(error) {
    if (error.message.includes("Failed to fetch")) {
      return "Error de conexión. Verifica tu internet.";
    } else if (error.message.includes("401")) {
      return "Sesión expirada. Inicia sesión nuevamente.";
    } else if (error.message.includes("403")) {
      return "No tienes permisos para realizar esta acción.";
    } else if (error.message.includes("404")) {
      return "El recurso solicitado no fue encontrado.";
    } else if (error.message.includes("429")) {
      return "Demasiadas peticiones. Intenta más tarde.";
    } else if (error.message.includes("500")) {
      return "Error interno del servidor. Intenta más tarde.";
    }
    return error.message;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  }
}

// Instancia global del cliente API
const apiClient = new ApiClient();

// Exportar para uso en módulos (si es necesario)
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApiClient;
}

console.log("🚀 API Client completo cargado exitosamente");
