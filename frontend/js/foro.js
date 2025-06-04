// js/foro.js - Sistema de votación corregido y mejorado

let currentPage = 1;
let isLoading = false;

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
  if (isLoading) return;
  isLoading = true;

  try {
    const posts = await apiClient.getPosts(currentPage);
    const foroLista = document.getElementById("foro-lista");

    if (currentPage === 1) {
      foroLista.innerHTML = ""; // Limpiar en primera carga
    }

    posts.forEach((post) => {
      const postElement = crearPostElement(post);
      foroLista.appendChild(postElement);
    });

    currentPage++;
    console.log(
      `✅ Cargados ${posts.length} posts, página actual: ${currentPage - 1}`
    );
  } catch (error) {
    console.error("Error cargando posts:", error);
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

    // Recargar posts
    currentPage = 1;
    await cargarPosts();

    console.log("✅ Post publicado exitosamente");
  } catch (error) {
    alert("Error publicando: " + error.message);
  }
}

function crearPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "post";
  postDiv.setAttribute("data-post-id", post.id);
  postDiv.setAttribute("data-voting", "false"); // ✅ Estado de votación

  // ✅ COLUMNA DE VOTOS ESTILO REDDIT CORREGIDA
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

  // ✅ Aplicar estilo según voto del usuario
  if (post.voto_usuario === "positivo") {
    btnUp.classList.add("text-orange-500", "font-bold", "bg-orange-50");
    btnUp.setAttribute("title", "Quitar voto positivo");
  } else {
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
  }

  // ✅ Event listener con protección anti-spam
  btnUp.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Verificar si ya se está votando
    if (postDiv.dataset.voting === "true") {
      console.log("⚠️ Ya se está procesando un voto");
      return;
    }

    votarPost(post.id, "positivo", postDiv);
  };

  // Score/Puntuación
  const scoreDiv = document.createElement("div");
  scoreDiv.className = "score text-lg font-bold text-gray-700 py-1 text-center";
  scoreDiv.textContent = post.score || 0;
  scoreDiv.setAttribute(
    "title",
    `${post.votos_positivos || 0} votos positivos, ${
      post.votos_negativos || 0
    } votos negativos`
  );

  // Botón downvote
  const btnDown = document.createElement("button");
  btnDown.className =
    "downvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
  btnDown.textContent = "▼";
  btnDown.setAttribute("data-post-id", post.id);
  btnDown.setAttribute("data-tipo", "negativo");
  btnDown.setAttribute("title", "Votar negativo");

  // ✅ Aplicar estilo según voto del usuario
  if (post.voto_usuario === "negativo") {
    btnDown.classList.add("text-blue-500", "font-bold", "bg-blue-50");
    btnDown.setAttribute("title", "Quitar voto negativo");
  } else {
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
  }

  // ✅ Event listener con protección anti-spam
  btnDown.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Verificar si ya se está votando
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

  // ✅ Mostrar información de votos en metadata
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

// ✅ FUNCIÓN DE VOTACIÓN COMPLETAMENTE CORREGIDA
async function votarPost(postId, tipo, postElement) {
  // Prevenir múltiples votos simultáneos
  if (postElement.dataset.voting === "true") {
    console.log("⚠️ Ya se está procesando un voto, ignorando...");
    return;
  }

  try {
    console.log("🗳️ Iniciando votación:", { postId, tipo });

    // Marcar como "votando" para prevenir clics múltiples
    postElement.dataset.voting = "true";

    // Obtener elementos de la UI
    const btnUp = postElement.querySelector(".upvote");
    const btnDown = postElement.querySelector(".downvote");
    const scoreElement = postElement.querySelector(".score");

    // Deshabilitar botones y mostrar loading
    btnUp.disabled = true;
    btnDown.disabled = true;
    btnUp.style.pointerEvents = "none";
    btnDown.style.pointerEvents = "none";

    // Mostrar estado de carga
    const originalScore = scoreElement.textContent;
    scoreElement.textContent = "...";
    scoreElement.classList.add("animate-pulse");

    // ✅ Llamar a la API de votación
    const response = await apiClient.votePost(postId, tipo);

    console.log("✅ Respuesta de votación:", response);

    // ✅ Actualizar UI según respuesta
    actualizarUIVoto(postElement, response.votoUsuario, response.nuevoScore);

    // ✅ Mostrar feedback visual
    mostrarFeedbackVoto(scoreElement, originalScore, response.nuevoScore);

    // Mostrar mensaje de éxito
    mostrarMensajeVoto(response.message);
  } catch (error) {
    console.error("❌ Error al votar:", error);

    // Restaurar UI en caso de error
    restaurarUIError(postElement);

    // Mostrar error al usuario
    mostrarMensajeError("Error al votar: " + error.message);
  } finally {
    // ✅ Limpiar estado de votación después de un delay
    setTimeout(() => {
      postElement.dataset.voting = "false";

      // Rehabilitar botones
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
    }, 500); // Delay de 500ms para prevenir spam
  }
}

// ✅ FUNCIÓN: Actualizar UI según el voto
function actualizarUIVoto(postElement, votoUsuario, nuevoScore) {
  const btnUp = postElement.querySelector(".upvote");
  const btnDown = postElement.querySelector(".downvote");
  const scoreElement = postElement.querySelector(".score");

  // Limpiar estilos anteriores
  btnUp.className =
    "upvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
  btnDown.className =
    "downvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";

  // Aplicar nuevos estilos según el voto actual
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
    // No hay voto
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
    btnUp.setAttribute("title", "Votar positivo");
    btnDown.setAttribute("title", "Votar negativo");
  }

  // Actualizar score
  scoreElement.textContent = nuevoScore;
}

// ✅ FUNCIÓN: Mostrar feedback visual del voto
function mostrarFeedbackVoto(scoreElement, scoreAnterior, scoreNuevo) {
  const scoreNumAnterior = parseInt(scoreAnterior) || 0;
  const scoreNumNuevo = parseInt(scoreNuevo) || 0;

  // Animación según el cambio
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

// ✅ FUNCIÓN: Restaurar UI en caso de error
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

// ✅ FUNCIÓN: Mostrar mensaje de éxito
function mostrarMensajeVoto(mensaje) {
  // Eliminar mensaje anterior si existe
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

  // Eliminar después de 2 segundos
  setTimeout(() => {
    msgDiv.style.opacity = "0";
    msgDiv.style.transform = "translateX(100%)";
    setTimeout(() => msgDiv.remove(), 300);
  }, 2000);
}

// ✅ FUNCIÓN: Mostrar mensaje de error
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

// ==================
// FUNCIONES DE COMENTARIOS (sin cambios)
// ==================

async function toggleComentarios(postId) {
  const comentariosDiv = document.getElementById(`comentarios-${postId}`);

  if (comentariosDiv.classList.contains("hidden")) {
    try {
      // Mostrar loading
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
    // Deshabilitar input temporalmente
    input.disabled = true;
    const submitBtn = event.target.querySelector("button");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Enviando...";
    submitBtn.disabled = true;

    await apiClient.createComment(postId, contenido);

    // Limpiar input
    input.value = "";

    // Recargar comentarios
    const comentariosDiv = document.getElementById(`comentarios-${postId}`);
    comentariosDiv.classList.add("hidden");
    await toggleComentarios(postId);

    // Actualizar contador de comentarios en el post
    setTimeout(async () => {
      try {
        currentPage = 1;
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
    // Rehabilitar input
    input.disabled = false;
    const submitBtn = event.target.querySelector("button");
    submitBtn.textContent = "Comentar";
    submitBtn.disabled = false;
  }
}

function cargarMasPosts() {
  if (!isLoading) {
    cargarPosts();
  }
}

function cerrarSesion() {
  apiClient.logout();
}

// Evento para detectar scroll y cargar más posts
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 1000
  ) {
    cargarMasPosts();
  }
});

console.log("🚀 Sistema de foro con votaciones corregido cargado exitosamente");
console.log("🗳️ Protección anti-spam: ✅");
console.log("🎨 UI de votaciones mejorada: ✅");
