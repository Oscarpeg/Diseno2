// js/api-client.js - Cliente para conectar con la API

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
      if (error.message.includes("401") || error.message.includes("inválida")) {
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
  // MÉTODOS DE TICKETS
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

  // ==================
  // MÉTODOS DE PUBLICACIONES
  // ==================

  async getPublicaciones() {
    return await this.request("/publicaciones");
  }
}

// Instancia global del cliente API
const apiClient = new ApiClient();
