// js/publicaciones.js

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar autenticación
  if (!apiClient.sessionId) {
    window.location.href = "index.html";
    return;
  }

  await cargarPublicaciones();
});

async function cargarPublicaciones() {
  try {
    const publicaciones = await apiClient.getPublicaciones();
    const lista = document.getElementById("lista-publicaciones");

    lista.innerHTML = "";

    if (publicaciones.length === 0) {
      lista.innerHTML =
        '<div class="text-center text-gray-500 py-8">No hay publicaciones disponibles</div>';
      return;
    }

    publicaciones.forEach((pub) => {
      const item = document.createElement("div");
      item.className = "bg-white p-4 rounded shadow";

      // Agregar indicador si es destacada
      const destacadaBadge = pub.destacada
        ? '<span class="inline-block bg-yellow-500 text-white text-xs px-2 py-1 rounded mb-2">📌 DESTACADA</span><br>'
        : "";

      const fechaCreacion = new Date(pub.fecha_creacion).toLocaleDateString();

      item.innerHTML = `
        ${destacadaBadge}
        <h3 class="font-bold text-lg mb-2">${pub.titulo}</h3>
        <p class="text-gray-700 mb-3">${pub.contenido}</p>
        <small class="text-gray-500">
          Publicado por ${pub.admin_nombre} • ${fechaCreacion}
        </small>
      `;

      lista.appendChild(item);
    });
  } catch (error) {
    console.error("Error cargando publicaciones:", error);
    const lista = document.getElementById("lista-publicaciones");
    lista.innerHTML =
      '<div class="text-center text-red-500 py-8">Error cargando publicaciones</div>';
  }
}

function cerrarSesion() {
  apiClient.logout();
}
