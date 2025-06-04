// js/foro.js - Foro con sistema de votación estilo Reddit COMPLETO

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

  // ✅ COLUMNA DE VOTOS ESTILO REDDIT
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
  } else {
    btnUp.classList.add("text-gray-400", "hover:text-orange-500");
  }

  btnUp.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
  } else {
    btnDown.classList.add("text-gray-400", "hover:text-blue-500");
  }

  btnDown.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

// ✅ FUNCIÓN DE VOTACIÓN MEJORADA ESTILO REDDIT
async function votarPost(postId, tipo, postElement) {
  try {
    console.log("🗳️ Votando:", { postId, tipo });

    // Obtener elementos
    const btnUp = postElement.querySelector(".upvote");
    const btnDown = postElement.querySelector(".downvote");
    const scoreElement = postElement.querySelector(".score");

    // Deshabilitar botones temporalmente
    btnUp.disabled = true;
    btnDown.disabled = true;

    // Mostrar estado de carga
    const originalScore = scoreElement.textContent;
    scoreElement.textContent = "...";

    // Llamar a la API
    const response = await apiClient.votePost(postId, tipo);

    console.log("✅ Respuesta del voto:", response);

    // ✅ ACTUALIZAR UI SEGÚN RESPUESTA
    // Limpiar estilos anteriores
    btnUp.className =
      "upvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";
    btnDown.className =
      "downvote text-2xl transition-colors duration-200 p-1 rounded hover:bg-gray-100";

    // Aplicar nuevos estilos según el voto actual
    if (response.votoUsuario === "positivo") {
      btnUp.classList.add("text-orange-500", "font-bold", "bg-orange-50");
      btnDown.classList.add("text-gray-400", "hover:text-blue-500");
    } else if (response.votoUsuario === "negativo") {
      btnUp.classList.add("text-gray-400", "hover:text-orange-500");
      btnDown.classList.add("text-blue-500", "font-bold", "bg-blue-50");
    } else {
      // No hay voto
      btnUp.classList.add("text-gray-400", "hover:text-orange-500");
      btnDown.classList.add("text-gray-400", "hover:text-blue-500");
    }

    // Actualizar score con animación
    scoreElement.textContent = response.nuevoScore;

    // ✅ ANIMACIÓN DE FEEDBACK
    scoreElement.classList.add("scale-110");
    if (response.nuevoScore > parseInt(originalScore)) {
      scoreElement.classList.add("text-green-600");
    } else if (response.nuevoScore < parseInt(originalScore)) {
      scoreElement.classList.add("text-red-600");
    }

    setTimeout(() => {
      scoreElement.classList.remove(
        "scale-110",
        "text-green-600",
        "text-red-600"
      );
    }, 500);

    // Habilitar botones nuevamente
    btnUp.disabled = false;
    btnDown.disabled = false;

    // Mostrar mensaje temporal
    mostrarMensajeVoto(response.message, postElement);
  } catch (error) {
    console.error("❌ Error al votar:", error);

    // Restaurar score original en caso de error
    const scoreElement = postElement.querySelector(".score");
    if (scoreElement.textContent === "...") {
      scoreElement.textContent = "?";
    }

    // Habilitar botones en caso de error
    const btnUp = postElement.querySelector(".upvote");
    const btnDown = postElement.querySelector(".downvote");
    btnUp.disabled = false;
    btnDown.disabled = false;

    // Mostrar error
    mostrarMensajeError("Error al votar: " + error.message);
  }
}

// ✅ FUNCIÓN PARA MOSTRAR MENSAJE DE VOTO TEMPORAL
function mostrarMensajeVoto(mensaje, postElement) {
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

  // Animación de entrada
  setTimeout(() => msgDiv.classList.add("transform", "translate-x-0"), 10);

  // Eliminar después de 2 segundos
  setTimeout(() => {
    msgDiv.style.opacity = "0";
    msgDiv.style.transform = "translateX(100%)";
    setTimeout(() => msgDiv.remove(), 300);
  }, 2000);
}

// ✅ FUNCIÓN PARA MOSTRAR ERRORES
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
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    const metaDiv = postElement.querySelector(".meta");
    const comentariosButton = postElement.querySelector(
      `button[onclick="toggleComentarios(${postId})"]`
    );

    // Obtener posts actualizados para tener el contador correcto
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

// ✅ FUNCIONES DE UTILIDAD ADICIONALES

// Función para manejar errores de red
function handleNetworkError(error) {
  if (error.message.includes("Failed to fetch")) {
    mostrarMensajeError("Error de conexión. Verifica tu internet.");
  } else if (error.message.includes("401")) {
    mostrarMensajeError("Sesión expirada. Redirigiendo...");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } else {
    mostrarMensajeError(error.message);
  }
}

// Función para formatear números grandes
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
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

console.log(
  "🚀 Foro con sistema de votación estilo Reddit cargado exitosamente"
);
