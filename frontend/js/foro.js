// js/foro.js - Foro actualizado para API

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
  } catch (error) {
    alert("Error publicando: " + error.message);
  }
}

function crearPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.className = "post";
  postDiv.setAttribute("data-post-id", post.id);

  // Columna de votos
  const votesDiv = document.createElement("div");
  votesDiv.className = "votes";

  const btnUp = document.createElement("button");
  btnUp.className = "upvote";
  btnUp.textContent = "▲";
  btnUp.onclick = () => votarPost(post.id, "positivo", postDiv);

  const scoreDiv = document.createElement("div");
  scoreDiv.className = "score";
  scoreDiv.textContent = post.score || 0;

  const btnDown = document.createElement("button");
  btnDown.className = "downvote";
  btnDown.textContent = "▼";
  btnDown.onclick = () => votarPost(post.id, "negativo", postDiv);

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
    contentDiv.appendChild(img);
  }

  // Metadata
  const metaDiv = document.createElement("div");
  metaDiv.className = "meta";
  const fecha = new Date(post.fecha_creacion).toLocaleDateString();
  metaDiv.textContent = `Publicado por ${post.username} • ${fecha} • ${
    post.comentarios_count || 0
  } comentarios`;
  contentDiv.appendChild(metaDiv);

  // Sección de comentarios
  const comentariosDiv = document.createElement("div");
  comentariosDiv.className = "comentarios mt-4";
  comentariosDiv.innerHTML = `
    <button onclick="toggleComentarios(${
      post.id
    })" class="text-blue-600 text-sm mb-2">
      Ver comentarios (${post.comentarios_count || 0})
    </button>
    <div id="comentarios-${post.id}" class="hidden">
      <div class="lista-comentarios mb-2"></div>
      <form onsubmit="agregarComentario(event, ${post.id})" class="flex gap-2">
        <input type="text" placeholder="Escribe un comentario" class="flex-1 border rounded px-2 py-1" required>
        <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded">Comentar</button>
      </form>
    </div>
  `;
  contentDiv.appendChild(comentariosDiv);

  postDiv.appendChild(votesDiv);
  postDiv.appendChild(contentDiv);

  return postDiv;
}

async function votarPost(postId, tipo, postElement) {
  try {
    await apiClient.votePost(postId, tipo);

    // Actualizar score visualmente (podrías hacer una petición para obtener el score actual)
    const scoreElement = postElement.querySelector(".score");
    const currentScore = parseInt(scoreElement.textContent);
    const newScore = tipo === "positivo" ? currentScore + 1 : currentScore - 1;
    scoreElement.textContent = newScore;
  } catch (error) {
    alert("Error al votar: " + error.message);
  }
}

async function toggleComentarios(postId) {
  const comentariosDiv = document.getElementById(`comentarios-${postId}`);

  if (comentariosDiv.classList.contains("hidden")) {
    try {
      const comentarios = await apiClient.getComments(postId);
      const listaDiv = comentariosDiv.querySelector(".lista-comentarios");

      listaDiv.innerHTML = "";
      comentarios.forEach((comentario) => {
        const comentarioDiv = document.createElement("div");
        comentarioDiv.className =
          "comentario text-sm p-2 bg-gray-100 rounded mb-1";
        comentarioDiv.innerHTML = `<strong>${comentario.username}:</strong> ${comentario.contenido}`;
        listaDiv.appendChild(comentarioDiv);
      });

      comentariosDiv.classList.remove("hidden");
    } catch (error) {
      alert("Error cargando comentarios: " + error.message);
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

  try {
    await apiClient.createComment(postId, contenido);
    input.value = "";

    // Recargar comentarios
    const comentariosDiv = document.getElementById(`comentarios-${postId}`);
    comentariosDiv.classList.add("hidden");
    await toggleComentarios(postId);
  } catch (error) {
    alert("Error agregando comentario: " + error.message);
  }
}

function cerrarSesion() {
  apiClient.logout();
}
