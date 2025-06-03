// js/publicaciones.js - VERSIÓN ACTUALIZADA de tu archivo existente

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando publicaciones.js...");

  // Verificar autenticación
  if (!apiClient.sessionId) {
    console.log("❌ No hay sesión, redirigiendo...");
    window.location.href = "index.html";
    return;
  }

  // ✅ NUEVO: Verificar rol y mostrar panel de admin si corresponde
  await verificarRolYMostrarPanel();

  console.log("✅ Sesión encontrada, cargando publicaciones...");
  await cargarPublicaciones();

  // ✅ NUEVO: Configurar event listeners para el panel de admin
  configurarEventListeners();
});

// ==================
// ✅ FUNCIONES NUEVAS PARA ADMIN
// ==================

async function verificarRolYMostrarPanel() {
  try {
    const user = apiClient.getCurrentUser();
    console.log("👤 Usuario actual:", user);

    if (user && user.rol === "admin") {
      console.log("👑 Usuario es admin, mostrando panel...");
      mostrarPanelAdmin();
    } else {
      console.log("👨‍🎓 Usuario es estudiante, ocultando panel admin");
      ocultarPanelAdmin();
    }
  } catch (error) {
    console.error("❌ Error verificando rol:", error);
    ocultarPanelAdmin();
  }
}

function mostrarPanelAdmin() {
  const adminPanel = document.getElementById("admin-panel");
  const refreshButton = document.getElementById("refresh-button");

  if (adminPanel) {
    adminPanel.classList.remove("hidden");
    console.log("✅ Panel de admin mostrado");
  }

  if (refreshButton) {
    refreshButton.classList.remove("hidden");
  }
}

function ocultarPanelAdmin() {
  const adminPanel = document.getElementById("admin-panel");
  const refreshButton = document.getElementById("refresh-button");

  if (adminPanel) {
    adminPanel.classList.add("hidden");
  }

  if (refreshButton) {
    refreshButton.classList.add("hidden");
  }
}

function configurarEventListeners() {
  // Formulario de publicación
  const formPublicacion = document.getElementById("form-publicacion");
  if (formPublicacion) {
    formPublicacion.addEventListener("submit", async (e) => {
      e.preventDefault();
      await crearPublicacion();
    });
  }

  // Drag & drop para imágenes
  const uploadArea = document.getElementById("upload-area");
  if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("bg-blue-50");
    });

    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("bg-blue-50");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("bg-blue-50");

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const imageInput = document.getElementById("pub-imagen");
        imageInput.files = files;
        mostrarVistaPrevia(imageInput);
      }
    });
  }
}

async function crearPublicacion() {
  const titulo = document.getElementById("pub-titulo").value.trim();
  const contenido = document.getElementById("pub-contenido").value.trim();
  const destacada = document.getElementById("pub-destacada").checked;
  const fechaExpiracion =
    document.getElementById("pub-expiracion").value || null;
  const imagenFile = document.getElementById("pub-imagen").files[0];

  // Validaciones
  if (!titulo || !contenido) {
    mostrarMensaje("❌ Título y contenido son obligatorios", "error");
    return;
  }

  try {
    mostrarMensaje("🔄 Creando publicación...", "info");

    // Crear FormData para manejar texto e imagen
    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("contenido", contenido);
    formData.append("destacada", destacada);

    if (fechaExpiracion) {
      formData.append("fecha_expiracion", fechaExpiracion);
    }

    if (imagenFile) {
      formData.append("imagen", imagenFile);
    }

    // Enviar a la API
    const response = await crearPublicacionConImagen(formData);

    mostrarMensaje("✅ Publicación creada exitosamente", "success");

    // Limpiar formulario
    limpiarFormulario();

    // Recargar publicaciones
    await cargarPublicaciones();
  } catch (error) {
    console.error("❌ Error creando publicación:", error);
    mostrarMensaje(`❌ Error: ${error.message}`, "error");
  }
}

async function crearPublicacionConImagen(formData) {
  const response = await fetch(`${apiClient.baseURL}/publicaciones`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiClient.sessionId}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Error creando publicación");
  }

  return await response.json();
}

function mostrarVistaPrevia(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("❌ Solo se permiten archivos de imagen");
    input.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("❌ El archivo debe ser menor a 5MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const uploadArea = document.getElementById("upload-area");
    const imagePreview = document.getElementById("image-preview");
    const previewImg = document.getElementById("preview-img");

    uploadArea.classList.add("hidden");
    imagePreview.classList.remove("hidden");
    previewImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function quitarImagen() {
  const uploadArea = document.getElementById("upload-area");
  const imagePreview = document.getElementById("image-preview");
  const imageInput = document.getElementById("pub-imagen");

  uploadArea.classList.remove("hidden");
  imagePreview.classList.add("hidden");
  imageInput.value = "";
}

function previsualizarPublicacion() {
  const titulo = document.getElementById("pub-titulo").value.trim();
  const contenido = document.getElementById("pub-contenido").value.trim();
  const destacada = document.getElementById("pub-destacada").checked;
  const fechaExpiracion = document.getElementById("pub-expiracion").value;
  const imagenFile = document.getElementById("pub-imagen").files[0];

  if (!titulo && !contenido) {
    alert("❌ Agrega al menos un título o contenido para previsualizar");
    return;
  }

  let previewHTML = "";

  if (destacada) {
    previewHTML +=
      '<span class="inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded mb-2">📌 DESTACADA</span><br>';
  }

  previewHTML += `
    <h3 class="font-bold text-lg mb-2 text-gray-800">${
      titulo || "Sin título"
    }</h3>
    <p class="text-gray-700 mb-3 leading-relaxed">${
      contenido || "Sin contenido"
    }</p>
  `;

  if (imagenFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      previewHTML += `<img src="${e.target.result}" alt="Imagen de la publicación" class="max-w-full h-64 object-cover rounded mb-3">`;
      mostrarModalVistaPrevia(previewHTML, fechaExpiracion);
    };
    reader.readAsDataURL(imagenFile);
  } else {
    mostrarModalVistaPrevia(previewHTML, fechaExpiracion);
  }
}

function mostrarModalVistaPrevia(contenidoHTML, fechaExpiracion) {
  const modal = document.getElementById("preview-modal");
  const previewContent = document.getElementById("preview-content");

  let expiracionText = "";
  if (fechaExpiracion) {
    const fecha = new Date(fechaExpiracion).toLocaleDateString("es-ES");
    expiracionText = `<div class="text-sm text-red-600 mt-3 p-2 bg-red-50 rounded">⏰ Se oculta automáticamente el ${fecha}</div>`;
  }

  previewContent.innerHTML =
    contenidoHTML +
    expiracionText +
    `<div class="text-sm text-gray-500 border-t pt-2 mt-3">
      <span>📝 Publicado por <strong>Administrador</strong></span>
      <span class="float-right">📅 ${new Date().toLocaleDateString(
        "es-ES"
      )}</span>
    </div>`;

  modal.classList.remove("hidden");
}

function cerrarVistaPrevia() {
  const modal = document.getElementById("preview-modal");
  modal.classList.add("hidden");
}

function limpiarFormulario() {
  document.getElementById("pub-titulo").value = "";
  document.getElementById("pub-contenido").value = "";
  document.getElementById("pub-destacada").checked = false;
  document.getElementById("pub-expiracion").value = "";
  quitarImagen();
  mostrarMensaje("", "");
}

function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById("publicacion-mensaje");
  if (!mensaje) return;

  mensaje.textContent = texto;
  mensaje.className = "text-center text-sm mt-4";

  if (tipo === "success") {
    mensaje.classList.add("text-green-600");
  } else if (tipo === "error") {
    mensaje.classList.add("text-red-600");
  } else if (tipo === "info") {
    mensaje.classList.add("text-blue-600");
  }

  if (tipo === "success") {
    setTimeout(() => {
      mensaje.textContent = "";
    }, 5000);
  }
}

// ==================
// TU FUNCIÓN ORIGINAL (conservada y mejorada)
// ==================

async function cargarPublicaciones() {
  console.log("📡 Iniciando carga de publicaciones...");

  const loadingElement = document.getElementById("loading");
  const listaElement = document.getElementById("lista-publicaciones");

  try {
    // Mostrar loading
    if (loadingElement) {
      loadingElement.style.display = "block";
      console.log("🔄 Loading mostrado");
    }

    // Limpiar lista
    if (listaElement) {
      listaElement.innerHTML = "";
      console.log("🧹 Lista limpiada");
    }

    // Obtener publicaciones
    console.log("📡 Solicitando publicaciones...");
    const publicaciones = await apiClient.getPublicaciones();

    console.log(`✅ Publicaciones recibidas: ${publicaciones.length}`);

    // OCULTAR LOADING
    if (loadingElement) {
      loadingElement.style.display = "none";
      console.log("✅ Loading ocultado");
    }

    // Mostrar publicaciones
    if (publicaciones.length === 0) {
      console.log("📭 No hay publicaciones");
      listaElement.innerHTML =
        '<div class="text-center text-gray-500 py-8">No hay publicaciones disponibles</div>';
    } else {
      console.log("📄 Mostrando publicaciones...");
      mostrarPublicaciones(publicaciones);
    }
  } catch (error) {
    console.error("❌ Error cargando publicaciones:", error);

    // OCULTAR LOADING EN CASO DE ERROR
    if (loadingElement) {
      loadingElement.style.display = "none";
      console.log("❌ Loading ocultado por error");
    }

    // Mostrar error
    if (listaElement) {
      listaElement.innerHTML = `
        <div class="text-center text-red-500 py-8">
          <h3 class="text-xl font-semibold mb-2">Error al cargar publicaciones</h3>
          <p class="mb-4">${error.message}</p>
          <button onclick="cargarPublicaciones()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            🔄 Intentar nuevamente
          </button>
        </div>
      `;
    }
  }
}

function mostrarPublicaciones(publicaciones) {
  const listaElement = document.getElementById("lista-publicaciones");

  if (!listaElement) {
    console.error("❌ No se encontró elemento lista-publicaciones");
    return;
  }

  console.log(
    `📝 Construyendo HTML para ${publicaciones.length} publicaciones...`
  );

  listaElement.innerHTML = "";

  publicaciones.forEach((pub, index) => {
    console.log(`📄 Procesando publicación ${index + 1}: "${pub.titulo}"`);

    const item = document.createElement("div");
    item.className = "bg-white p-4 rounded shadow mb-4";

    // Badge de destacada
    const destacadaBadge = pub.destacada
      ? '<span class="inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded mb-2">📌 DESTACADA</span><br>'
      : "";

    // Formatear fecha
    let fechaCreacion = "Fecha no disponible";
    try {
      fechaCreacion = new Date(pub.fecha_creacion).toLocaleDateString("es-ES");
    } catch (e) {
      console.warn("Error formateando fecha:", e);
    }

    // ✅ NUEVO: Mostrar imagen si existe
    const imagenHTML = pub.imagen_url
      ? `<img src="${pub.imagen_url}" alt="Imagen de la publicación" class="max-w-full h-64 object-cover rounded my-3">`
      : "";

    // Construir HTML
    item.innerHTML = `
      ${destacadaBadge}
      <h3 class="font-bold text-lg mb-2 text-gray-800">${
        pub.titulo || "Sin título"
      }</h3>
      <p class="text-gray-700 mb-3 leading-relaxed">${
        pub.contenido || "Sin contenido"
      }</p>
      ${imagenHTML}
      <div class="text-sm text-gray-500 border-t pt-2">
        <span>📝 Publicado por <strong>${
          pub.admin_nombre || "Administrador"
        }</strong></span>
        <span class="float-right">📅 ${fechaCreacion}</span>
      </div>
    `;

    listaElement.appendChild(item);
  });

  console.log(
    `✅ Se mostraron ${publicaciones.length} publicaciones correctamente`
  );
}

function cerrarSesion() {
  console.log("🚪 Cerrando sesión...");
  apiClient.logout();
}

// Cerrar modal con ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cerrarVistaPrevia();
  }
});
