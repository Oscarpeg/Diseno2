// js/api-client.js - Cliente API corregido para votaciones

class ApiClient {
  constructor() {
    this.baseURL = "http://localhost:3000/api";
    this.sessionId = localStorage.getItem("sessionId");
    this.pendingRequests = new Map(); // Para manejar requests duplicados

    console.log("🚀 ApiClient inicializado");
    console.log("🔗 Base URL:", this.baseURL);
    console.log(
      "🎫 Session ID:",
      this.sessionId ? "Presente" : "No encontrado"
    );
  }

  // Método genérico para hacer peticiones (con protección anti-duplicados)
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

    // ✅ EXCLUIR VOTACIONES del sistema anti-duplicados
    const isVoteRequest = endpoint.includes("/vote");
    const requestKey = !isVoteRequest
      ? `${config.method || "GET"}-${url}-${JSON.stringify(config.body || {})}`
      : null;

    // Solo aplicar anti-duplicados a requests que NO sean de votación
    if (!isVoteRequest && requestKey && this.pendingRequests.has(requestKey)) {
      console.log("⚠️ Request duplicado detectado, usando request existente");
      return this.pendingRequests.get(requestKey);
    }

    const requestPromise = this._executeRequest(url, config);

    // Solo cachear requests que NO sean de votación
    if (!isVoteRequest && requestKey) {
      this.pendingRequests.set(requestKey, requestPromise);

      // Limpiar el caché después de que termine la request
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }

    return requestPromise;
  }

  // Método privado para ejecutar la request
  async _executeRequest(url, config) {
    console.log(`📡 Request: ${config.method || "GET"} ${url}`);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        }
        throw new Error(data.error || "Error en la petición");
      }

      console.log("✅ Request exitosa:", data);
      return data;
    } catch (error) {
      console.error("❌ Error en petición:", error);
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
      localStorage.setItem("user", JSON.stringify(response.user));
      return response.user;
    } catch (error) {
      console.error("Error obteniendo info del usuario:", error);
      if (
        error.message.includes("401") ||
        error.message.includes("Sesión expirada")
      ) {
        this.logout();
      }
      throw error;
    }
  }

  // ==================
  // MÉTODOS DE POSTS
  // ==================

  // ✅ MÉTODO getPosts ACTUALIZADO en api-client.js
  // Reemplaza la función getPosts existente en tu archivo api-client.js

  async getPosts(page = 1, limit = 20) {
    console.log(`📡 Solicitando posts - Página: ${page}, Límite: ${limit}`);

    try {
      const response = await this.request(`/posts?page=${page}&limit=${limit}`);

      // ✅ COMPATIBILIDAD: Si el servidor devuelve el formato nuevo, usarlo
      if (response.posts && response.pagination) {
        console.log(
          `✅ Formato nuevo recibido: ${response.posts.length} posts, hasMore: ${response.pagination.hasMore}`
        );
        return response;
      }

      // ✅ COMPATIBILIDAD: Si el servidor devuelve el formato anterior (array directo)
      if (Array.isArray(response)) {
        console.log(`⚠️ Formato anterior detectado: ${response.length} posts`);
        return {
          posts: response,
          pagination: {
            currentPage: page,
            totalPosts: response.length,
            hasMore: response.length >= limit, // Asumir que hay más si devuelve el límite completo
            postsPerPage: limit,
          },
        };
      }

      // ✅ FALLBACK: Si no es ninguno de los anteriores
      console.warn("⚠️ Formato de respuesta no reconocido:", response);
      return {
        posts: [],
        pagination: {
          currentPage: page,
          totalPosts: 0,
          hasMore: false,
          postsPerPage: limit,
        },
      };
    } catch (error) {
      console.error("❌ Error en getPosts:", error);
      throw error;
    }
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

  // ==================
  // ✅ MÉTODOS DE VOTACIÓN CORREGIDOS
  // ==================

  async votePost(postId, tipo) {
    // Crear URL única para cada votación (evitar caché)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const url = `${this.baseURL}/posts/${postId}/vote?_t=${timestamp}&_r=${randomId}`;

    const config = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionId}`,
      },
      body: JSON.stringify({ tipo }),
    };

    console.log("🗳️ Enviando voto directo (sin caché):", { postId, tipo });

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          throw new Error("Sesión expirada. Inicia sesión nuevamente.");
        }
        throw new Error(data.error || "Error en la petición");
      }

      console.log("✅ Voto procesado exitosamente:", data);
      return data;
    } catch (error) {
      console.error("❌ Error en voto:", error);
      throw error;
    }
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

  // ✅ AGREGAR ESTE MÉTODO AL API CLIENT (frontend/js/api-client.js)
  // Agregar en la sección "MÉTODOS DE TICKETS"

  async getTicketsWithFilters(filtros = {}, page = 1, limit = 50) {
    const params = new URLSearchParams();

    // Agregar filtros solo si no son "todos"
    if (filtros.estado && filtros.estado !== "todos") {
      params.append("estado", filtros.estado);
    }
    if (filtros.tema && filtros.tema !== "todos") {
      params.append("tema", filtros.tema);
    }
    if (filtros.prioridad && filtros.prioridad !== "todos") {
      params.append("prioridad", filtros.prioridad);
    }

    // Agregar paginación
    params.append("page", page);
    params.append("limit", limit);

    const endpoint = `/tickets?${params.toString()}`;

    console.log("🔍 Solicitando tickets con filtros:", filtros);
    console.log("📡 Endpoint:", endpoint);

    try {
      const response = await this.request(endpoint);

      console.log("✅ Respuesta recibida:", {
        tickets: response.tickets?.length || 0,
        filtros: response.filtros_aplicados,
        estadisticas: response.estadisticas ? "Incluidas" : "No incluidas",
      });

      return response;
    } catch (error) {
      console.error("❌ Error obteniendo tickets con filtros:", error);
      throw error;
    }
  }
  // ==================
  // MÉTODOS DE PUBLICACIONES
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

console.log("🚀 API Client corregido cargado exitosamente");
console.log("🛡️ Sistema de votaciones: SIN CACHÉ ✅");
