// js/foro.js - Sistema de votación y paginación corregidos

let currentPage = 1;
let isLoading = false;
let hasMorePosts = true; // ✅ NUEVA VARIABLE para controlar si hay más posts

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar autenticación
  if (!apiClient.sessionId) {
    window.location.href = "index.html";
    return;
  }

  await cargarPosts();

  // Event listener para formulario
  document
    .getElementById("form-foro")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      await publicarPost();
    });
});

async function cargarPosts() {
  if (isLoading || !hasMorePosts) {
    console.log(
      `⚠️ No se puede cargar: isLoading=${isLoading}, hasMorePosts=${hasMorePosts}`
    );
    return;
  }

  isLoading = true;
  console.log(`📄 Cargando página ${currentPage}...`);

  try {
    // ✅ OBTENER RESPUESTA CON PAGINACIÓN
    const response = await apiClient.getPosts(currentPage);

    // ✅ MANEJAR NUEVA ESTRUCTURA DE RESPUESTA
    const posts = response.posts || response; // Compatibilidad con versión antigua
    const pagination = response.pagination;

    const foroLista = document.getElementById("foro-lista");

    if (currentPage === 1) {
      foroLista.innerHTML = ""; // Limpiar solo en primera carga
    }

    if (posts.length === 0) {
      if (currentPage === 1) {
        foroLista.innerHTML =
          '<div class="text-center text-gray-500 py-8">No hay publicaciones disponibles</div>';
      }
      hasMorePosts = false;
      console.log("📭 No hay más posts para cargar");
    } else {
      posts.forEach((post) => {
        const postElement = crearPostElement(post);
        foroLista.appendChild(postElement);
      });

      currentPage++;

      // ✅ ACTUALIZAR hasMorePosts basado en la respuesta del servidor
      if (pagination) {
        hasMorePosts = pagination.hasMore;
        console.log(
          `📊 Paginación: ${pagination.currentPage}/${Math.ceil(
            pagination.totalPosts / pagination.postsPerPage
          )}, hasMore: ${hasMorePosts}`
        );
      } else {
        // Método alternativo: si devuelve menos posts del límite, no hay más
        hasMorePosts = posts.length >= 20;
      }
    }

    // ✅ MOSTRAR/OCULTAR BOTÓN "CARGAR MÁS"
    const loadMoreBtn = document.getElementById("load-more");
    if (loadMoreBtn) {
      if (hasMorePosts && posts.length > 0) {
        loadMoreBtn.style.display = "block";
      } else {
        loadMoreBtn.style.display = "none";
      }
    }

    console.log(
      `✅ Cargados ${posts.length} posts. Página actual: ${
        currentPage - 1
      }. ¿Hay más?: ${hasMorePosts}`
    );
  } catch (error) {
    console.error("❌ Error cargando posts:", error);
    alert("Error cargando posts: " + error.message);
  } finally {
    isLoading = false;
  }
}

async function publicarPost() {
  const preguntaInput = document.getElementById("pregunta");
  const imagenInput = document.getElementById("imagen");

  const titulo = preguntaInput.value.trim();
  const imagenArchivo = imagenInput.files[0];

  if (!titulo && !imagenArchivo) {
    alert("Debes escribir algo o subir una imagen");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("titulo", titulo);
    if (imagenArchivo) {
      formData.append("imagen", imagenArchivo);
    }

    await apiClient.createPost(formData);

    // Limpiar formulario
    preguntaInput.value = "";
    imagenInput.value = "";

    // ✅ RESETEAR PAGINACIÓN COMPLETAMENTE
    currentPage = 1;
    hasMorePosts = true;
    await cargarPosts();

    console.log("✅ Post publicado exitosamente");
  } catch (error) {
    alert("Error publicando: " + error.message);
  }
}

function cargarMasPosts() {
  if (!isLoading && hasMorePosts) {
    console.log("🔄 Scroll detectado, cargando más posts...");
    cargarPosts();
  } else {
    console.log(
      `⚠️ No se puede cargar más: isLoading=${isLoading}, hasMorePosts=${hasMorePosts}`
    );
  }
}

// ✅ MEJORAR EL EVENT LISTENER DE SCROLL
let scrollTimeout;
window.addEventListener("scroll", () => {
  // ✅ DEBOUNCE para evitar múltiples llamadas
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    // ✅ VERIFICAR si estamos cerca del final Y si hay más posts
    if (hasMorePosts && !isLoading) {
      const scrollPosition = window.innerHeight + window.scrollY;
      const documentHeight = document.body.offsetHeight;
      const threshold = 1000; // 1000px antes del final

      if (scrollPosition >= documentHeight - threshold) {
        console.log("📄 Cerca del final, intentando cargar más posts...");
        cargarMasPosts();
      }
    }
  }, 150); // Esperar 150ms después del último scroll
});

// ✅ RESTO DEL CÓDIGO SIN CAMBIOS (crearPostElement, votarPost, etc.)
function crearPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "post";
  postDiv.setAttribute("data-post-id", post.id);
  postDiv.setAttribute("data-voting", "false");

  // Columna de votos
  const votesDiv = document.createElement("div");
  votesDiv.className = "votes";

  // Botón upvote
  const btnUp = document.createElement("button");
  btnUp.className =
    "upvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
  btnUp.textContent = "▲";
  btnUp.setAttribute("data-post-id", post.id);
  btnUp.setAttribute("data-tipo", "positivo");
  btnUp.setAttribute("title", "Votar positivo");

  if (post.voto_usuario === "positivo") {
    btnUp.classList.add("text-orange-500", "font-bold", "bg-orange-50");
    btnUp.setAttribute("title", "Quitar voto positivo");
  } else {
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
  }

  btnUp.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (postDiv.dataset.voting === "true") {
      console.log("⚠️ Ya se está procesando un voto");
      return;
    }
    votarPost(post.id, "positivo", postDiv);
  };

  // Score
  const scoreDiv = document.createElement("div");
  scoreDiv.className = "score text-lg font-bold text-gray-700 py-1 text-center";
  scoreDiv.textContent = post.score || 0;

  // Botón downvote
  const btnDown = document.createElement("button");
  btnDown.className =
    "downvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
  btnDown.textContent = "▼";
  btnDown.setAttribute("data-post-id", post.id);
  btnDown.setAttribute("data-tipo", "negativo");
  btnDown.setAttribute("title", "Votar negativo");

  if (post.voto_usuario === "negativo") {
    btnDown.classList.add("text-blue-500", "font-bold", "bg-blue-50");
    btnDown.setAttribute("title", "Quitar voto negativo");
  } else {
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
  }

  btnDown.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (postDiv.dataset.voting === "true") {
      console.log("⚠️ Ya se está procesando un voto");
      return;
    }
    votarPost(post.id, "negativo", postDiv);
  };

  votesDiv.appendChild(btnUp);
  votesDiv.appendChild(scoreDiv);
  votesDiv.appendChild(btnDown);

  // Contenido
  const contentDiv = document.createElement("div");
  contentDiv.className = "content";

  const textDiv = document.createElement("div");
  textDiv.className = "text";
  textDiv.textContent = post.titulo || post.contenido;
  contentDiv.appendChild(textDiv);

  // Imagen si existe
  if (post.imagen_url) {
    const img = document.createElement("img");
    img.src = post.imagen_url;
    img.alt = "Imagen del post";
    img.className = "max-w-full h-auto rounded-lg mt-3";
    img.style.maxHeight = "400px";
    img.style.objectFit = "contain";
    contentDiv.appendChild(img);
  }

  // Metadata
  const metaDiv = document.createElement("div");
  metaDiv.className = "meta";
  const fecha = new Date(post.fecha_creacion).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const votosInfo =
    (post.votos_positivos || 0) + (post.votos_negativos || 0) > 0
      ? ` • ▲ ${post.votos_positivos || 0} ▼ ${post.votos_negativos || 0}`
      : "";

  metaDiv.innerHTML = `
    <span>📝 Publicado por <strong>${post.username}</strong></span>
    <span> • 📅 ${fecha}</span>
    <span> • 💬 ${post.comentarios_count || 0} comentarios</span>
    ${votosInfo ? `<span>${votosInfo}</span>` : ""}
  `;
  contentDiv.appendChild(metaDiv);

  // Sección de comentarios
  const comentariosDiv = document.createElement("div");
  comentariosDiv.className = "comentarios mt-4";
  comentariosDiv.innerHTML = `
    <button onclick="toggleComentarios(${
      post.id
    })" class="text-blue-600 text-sm mb-2 hover:text-blue-800 transition-colors">
      💬 Ver comentarios (${post.comentarios_count || 0})
    </button>
    <div id="comentarios-${post.id}" class="hidden">
      <div class="lista-comentarios mb-3"></div>
      <form onsubmit="agregarComentario(event, ${post.id})" class="flex gap-2">
        <input 
          type="text" 
          placeholder="Escribe un comentario..." 
          class="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500" 
          required
          maxlength="500"
        >
        <button 
          type="submit" 
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Comentar
        </button>
      </form>
    </div>
  `;
  contentDiv.appendChild(comentariosDiv);

  postDiv.appendChild(votesDiv);
  postDiv.appendChild(contentDiv);

  return postDiv;
}

// ✅ FUNCIÓN DE VOTACIÓN (sin cambios)
async function votarPost(postId, tipo, postElement) {
  if (postElement.dataset.voting === "true") {
    console.log("⚠️ Ya se está procesando un voto, ignorando...");
    return;
  }

  try {
    console.log("🗳️ Iniciando votación:", { postId, tipo });
    postElement.dataset.voting = "true";

    const btnUp = postElement.querySelector(".upvote");
    const btnDown = postElement.querySelector(".downvote");
    const scoreElement = postElement.querySelector(".score");

    btnUp.disabled = true;
    btnDown.disabled = true;
    btnUp.style.pointerEvents = "none";
    btnDown.style.pointerEvents = "none";

    const originalScore = scoreElement.textContent;
    scoreElement.textContent = "...";
    scoreElement.classList.add("animate-pulse");

    const response = await apiClient.votePost(postId, tipo);
    console.log("✅ Respuesta de votación:", response);

    actualizarUIVoto(postElement, response.votoUsuario, response.nuevoScore);
    mostrarFeedbackVoto(scoreElement, originalScore, response.nuevoScore);
    mostrarMensajeVoto(response.message);
  } catch (error) {
    console.error("❌ Error al votar:", error);
    restaurarUIError(postElement);
    mostrarMensajeError("Error al votar: " + error.message);
  } finally {
    setTimeout(() => {
      postElement.dataset.voting = "false";
      const btnUp = postElement.querySelector(".upvote");
      const btnDown = postElement.querySelector(".downvote");
      const scoreElement = postElement.querySelector(".score");

      if (btnUp && btnDown && scoreElement) {
        btnUp.disabled = false;
        btnDown.disabled = false;
        btnUp.style.pointerEvents = "auto";
        btnDown.style.pointerEvents = "auto";
        scoreElement.classList.remove("animate-pulse");
      }
    }, 500);
  }
}

// ✅ FUNCIONES AUXILIARES (sin cambios significativos)
function actualizarUIVoto(postElement, votoUsuario, nuevoScore) {
  const btnUp = postElement.querySelector(".upvote");
  const btnDown = postElement.querySelector(".downvote");
  const scoreElement = postElement.querySelector(".score");

  btnUp.className =
    "upvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
  btnDown.className =
    "downvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";

  if (votoUsuario === "positivo") {
    btnUp.classList.add("text-orange-500", "font-bold", "bg-orange-50");
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
    btnUp.setAttribute("title", "Quitar voto positivo");
    btnDown.setAttribute("title", "Votar negativo");
  } else if (votoUsuario === "negativo") {
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
    btnDown.classList.add("text-blue-500", "font-bold", "bg-blue-50");
    btnUp.setAttribute("title", "Votar positivo");
    btnDown.setAttribute("title", "Quitar voto negativo");
  } else {
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
    btnUp.setAttribute("title", "Votar positivo");
    btnDown.setAttribute("title", "Votar negativo");
  }

  scoreElement.textContent = nuevoScore;
}

function mostrarFeedbackVoto(scoreElement, scoreAnterior, scoreNuevo) {
  const scoreNumAnterior = parseInt(scoreAnterior) || 0;
  const scoreNumNuevo = parseInt(scoreNuevo) || 0;

  scoreElement.classList.add(
    "scale-110",
    "transition-transform",
    "duration-300"
  );

  if (scoreNumNuevo > scoreNumAnterior) {
    scoreElement.classList.add("text-green-600");
  } else if (scoreNumNuevo < scoreNumAnterior) {
    scoreElement.classList.add("text-red-600");
  } else {
    scoreElement.classList.add("text-blue-600");
  }

  setTimeout(() => {
    scoreElement.classList.remove(
      "scale-110",
      "text-green-600",
      "text-red-600",
      "text-blue-600",
      "transition-transform",
      "duration-300"
    );
  }, 500);
}

function restaurarUIError(postElement) {
  const scoreElement = postElement.querySelector(".score");
  const btnUp = postElement.querySelector(".upvote");
  const btnDown = postElement.querySelector(".downvote");

  if (scoreElement.textContent === "...") {
    scoreElement.textContent = "?";
    scoreElement.classList.add("text-red-500");
    setTimeout(() => {
      scoreElement.classList.remove("text-red-500");
    }, 2000);
  }

  scoreElement.classList.remove("animate-pulse");
  btnUp.style.pointerEvents = "auto";
  btnDown.style.pointerEvents = "auto";
}

function mostrarMensajeVoto(mensaje) {
  const existingMsg = document.querySelector(".vote-message");
  if (existingMsg) existingMsg.remove();

  const msgDiv = document.createElement("div");
  msgDiv.className =
    "vote-message fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300";
  msgDiv.innerHTML = `
    <div class="flex items-center gap-2">
      <span>✅</span>
      <span>${mensaje}</span>
    </div>
  `;

  document.body.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.style.opacity = "0";
    msgDiv.style.transform = "translateX(100%)";
    setTimeout(() => msgDiv.remove(), 300);
  }, 2000);
}

function mostrarMensajeError(mensaje) {
  const existingMsg = document.querySelector(".error-message");
  if (existingMsg) existingMsg.remove();

  const msgDiv = document.createElement("div");
  msgDiv.className =
    "error-message fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300";
  msgDiv.innerHTML = `
    <div class="flex items-center gap-2">
      <span>❌</span>
      <span>${mensaje}</span>
    </div>
  `;

  document.body.appendChild(msgDiv);

  setTimeout(() => {
    msgDiv.style.opacity = "0";
    setTimeout(() => msgDiv.remove(), 300);
  }, 3000);
}

// ✅ FUNCIONES DE COMENTARIOS (sin cambios)
async function toggleComentarios(postId) {
  const comentariosDiv = document.getElementById(`comentarios-${postId}`);

  if (comentariosDiv.classList.contains("hidden")) {
    try {
      const listaDiv = comentariosDiv.querySelector(".lista-comentarios");
      listaDiv.innerHTML =
        '<div class="text-center text-gray-500 py-2">Cargando comentarios...</div>';

      comentariosDiv.classList.remove("hidden");

      const comentarios = await apiClient.getComments(postId);

      listaDiv.innerHTML = "";

      if (comentarios.length === 0) {
        listaDiv.innerHTML =
          '<div class="text-center text-gray-500 py-2 text-sm">No hay comentarios aún. ¡Sé el primero en comentar!</div>';
      } else {
        comentarios.forEach((comentario) => {
          const comentarioDiv = document.createElement("div");
          comentarioDiv.className =
            "comentario text-sm p-3 bg-gray-50 rounded-lg mb-2 border-l-3 border-blue-300";

          const fecha = new Date(comentario.fecha_creacion).toLocaleDateString(
            "es-ES",
            {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

          comentarioDiv.innerHTML = `
            <div class="flex justify-between items-start mb-1">
              <strong class="text-blue-700">👤 ${comentario.username}</strong>
              <span class="text-gray-500 text-xs">${fecha}</span>
            </div>
            <p class="text-gray-800">${comentario.contenido}</p>
          `;

          listaDiv.appendChild(comentarioDiv);
        });
      }

      console.log(
        `✅ Cargados ${comentarios.length} comentarios para post ${postId}`
      );
    } catch (error) {
      console.error("Error cargando comentarios:", error);
      const listaDiv = comentariosDiv.querySelector(".lista-comentarios");
      listaDiv.innerHTML =
        '<div class="text-center text-red-500 py-2 text-sm">Error cargando comentarios</div>';
    }
  } else {
    comentariosDiv.classList.add("hidden");
  }
}

async function agregarComentario(event, postId) {
  event.preventDefault();

  const input = event.target.querySelector("input");
  const contenido = input.value.trim();

  if (!contenido) return;

  if (contenido.length > 500) {
    alert("El comentario no puede exceder 500 caracteres");
    return;
  }

  try {
    input.disabled = true;
    const submitBtn = event.target.querySelector("button");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Enviando...";
    submitBtn.disabled = true;

    await apiClient.createComment(postId, contenido);

    input.value = "";

    const comentariosDiv = document.getElementById(`comentarios-${postId}`);
    comentariosDiv.classList.add("hidden");
    await toggleComentarios(postId);

    setTimeout(async () => {
      try {
        currentPage = 1;
        hasMorePosts = true;
        await cargarPosts();
      } catch (error) {
        console.error("Error actualizando posts:", error);
      }
    }, 500);

    console.log("✅ Comentario agregado exitosamente");
  } catch (error) {
    console.error("Error agregando comentario:", error);
    alert("Error agregando comentario: " + error.message);
  } finally {
    input.disabled = false;
    const submitBtn = event.target.querySelector("button");
    submitBtn.textContent = "Comentar";
    submitBtn.disabled = false;
  }
}

function cerrarSesion() {
  apiClient.logout();
}

console.log("🚀 Sistema de foro con paginación corregida cargado exitosamente");
console.log("📄 Scroll infinito controlado: ✅");
console.log("🗳️ Sistema de votaciones: ✅");
