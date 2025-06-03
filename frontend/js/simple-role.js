// js/simple-role.js - Script súper simple para mostrar rol

function mostrarRolUsuario() {
  // Obtener información del usuario del localStorage
  const userData = localStorage.getItem("user");
  const rolElement = document.getElementById("rol-usuario");

  if (!rolElement) {
    console.log("Elemento rol-usuario no encontrado en esta página");
    return;
  }

  if (!userData) {
    rolElement.textContent = "";
    console.log("No hay datos de usuario en localStorage");
    return;
  }

  try {
    const user = JSON.parse(userData);
    const rol = user.rol;

    console.log("✅ Mostrando rol:", rol, "para usuario:", user.username);

    // Mostrar rol simple con colores
    if (rol === "admin") {
      rolElement.textContent = "👑 Administrativo";
      rolElement.className = "text-yellow-300 text-sm font-semibold";
    } else if (rol === "estudiante" || rol === "usuario") {
      rolElement.textContent = "🎓 Estudiante";
      rolElement.className = "text-blue-300 text-sm font-semibold";
    } else if (rol === "secretaria") {
      rolElement.textContent = "📋 Secretaria";
      rolElement.className = "text-green-300 text-sm font-semibold";
    } else {
      rolElement.textContent = `📝 ${rol}`;
      rolElement.className = "text-gray-300 text-sm";
    }
  } catch (error) {
    console.error("❌ Error mostrando rol:", error);
    rolElement.textContent = "";
  }
}

// Función para limpiar el rol cuando no hay sesión
function limpiarRolUsuario() {
  const rolElement = document.getElementById("rol-usuario");
  if (rolElement) {
    rolElement.textContent = "";
  }
}

// Ejecutar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando simple-role.js...");
  mostrarRolUsuario();
});

// También ejecutar cuando cambia el foco de la ventana (por si cambió en otra pestaña)
window.addEventListener("focus", mostrarRolUsuario);

// Ejecutar cuando se hace login (si se actualiza el localStorage)
window.addEventListener("storage", (e) => {
  if (e.key === "user") {
    mostrarRolUsuario();
  }
});
