// js/publicaciones.js - Versión que funciona correctamente

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando publicaciones.js...");

  // Verificar autenticación
  if (!apiClient.sessionId) {
    console.log("❌ No hay sesión, redirigiendo...");
    window.location.href = "index.html";
    return;
  }

  console.log("✅ Sesión encontrada, cargando publicaciones...");
  await cargarPublicaciones();
});

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

    // OCULTAR LOADING - ESTO ES CLAVE
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

    // Construir HTML
    item.innerHTML = `
      ${destacadaBadge}
      <h3 class="font-bold text-lg mb-2 text-gray-800">${
        pub.titulo || "Sin título"
      }</h3>
      <p class="text-gray-700 mb-3 leading-relaxed">${
        pub.contenido || "Sin contenido"
      }</p>
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
