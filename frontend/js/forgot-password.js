// js/forgot-password.js

let resetToken = null;

async function recuperarContrasena() {
  const email = document.getElementById("forgot-email").value.trim();
  const mensaje = document.getElementById("mensaje");

  try {
    const response = await apiClient.forgotPassword(email);

    // Guardar el token (en producción esto vendría por email)
    resetToken = response.resetToken;

    // Mostrar formulario de nueva contraseña
    mostrarFormularioReset();

    mensaje.innerHTML = `
      <div class="text-green-600">
        ✅ Se ha generado un token de recuperación.<br>
        <small>En producción, este llegaría a tu email.</small>
      </div>
    `;
  } catch (error) {
    mensaje.innerHTML = `<div class="text-red-600">❌ ${error.message}</div>`;
  }
}

function mostrarFormularioReset() {
  const container = document.querySelector(".bg-white");

  // Crear formulario de reset
  const resetForm = document.createElement("div");
  resetForm.id = "reset-form";
  resetForm.className = "mt-6 p-4 border-t";
  resetForm.innerHTML = `
    <h3 class="text-lg font-semibold mb-4 text-center">Nueva Contraseña</h3>
    
    <input 
      type="password" 
      id="new-password" 
      placeholder="Nueva contraseña (más de 4 caracteres)" 
      class="input mb-4" 
      minlength="5"
      required
    />
    
    <input 
      type="password" 
      id="confirm-password" 
      placeholder="Confirmar nueva contraseña" 
      class="input mb-4" 
      required
    />
    
    <button 
      onclick="cambiarContrasena()" 
      class="btn-green w-full mb-2"
    >
      Cambiar Contraseña
    </button>
    
    <button 
      onclick="cancelarReset()" 
      class="btn-blue w-full text-sm"
    >
      Cancelar
    </button>
    
    <p id="reset-mensaje" class="text-center text-sm mt-4"></p>
  `;

  container.appendChild(resetForm);

  // Ocultar formulario original
  document.querySelector(".bg-white > h2").style.display = "none";
  document.getElementById("forgot-email").style.display = "none";
  document.querySelector(
    'button[onclick="recuperarContrasena()"]'
  ).style.display = "none";
}

async function cambiarContrasena() {
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const resetMensaje = document.getElementById("reset-mensaje");

  // Validaciones
  if (newPassword.length <= 4) {
    resetMensaje.innerHTML =
      '<div class="text-red-600">La contraseña debe tener más de 4 caracteres</div>';
    return;
  }

  if (newPassword !== confirmPassword) {
    resetMensaje.innerHTML =
      '<div class="text-red-600">Las contraseñas no coinciden</div>';
    return;
  }

  if (!resetToken) {
    resetMensaje.innerHTML =
      '<div class="text-red-600">Error: No hay token de recuperación</div>';
    return;
  }

  try {
    const response = await apiClient.resetPassword(resetToken, newPassword);

    resetMensaje.innerHTML = `
      <div class="text-green-600">
        ✅ ${response.message}<br>
        <small>Redirigiendo al login...</small>
      </div>
    `;

    // Redirigir después de 2 segundos
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    resetMensaje.innerHTML = `<div class="text-red-600">❌ ${error.message}</div>`;
  }
}

function cancelarReset() {
  // Eliminar formulario de reset
  const resetForm = document.getElementById("reset-form");
  if (resetForm) {
    resetForm.remove();
  }

  // Mostrar formulario original
  document.querySelector(".bg-white > h2").style.display = "block";
  document.getElementById("forgot-email").style.display = "block";
  document.querySelector(
    'button[onclick="recuperarContrasena()"]'
  ).style.display = "block";

  // Limpiar mensajes
  document.getElementById("mensaje").innerHTML = "";
  document.getElementById("forgot-email").value = "";

  // Limpiar token
  resetToken = null;
}

// Función para mostrar/ocultar contraseña
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}
