// Reemplaza la función registrar() en frontend/js/auth.js

async function registrar() {
  const email = document.getElementById("reg-email").value.trim();
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const rol = document.getElementById("reg-rol").value;

  try {
    await apiClient.register({ email, username, password, rol });
    alert("Registro exitoso. Ahora puedes iniciar sesión.");

    // Limpiar formulario
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-password").value = "";
    document.getElementById("reg-rol").value = "estudiante";
  } catch (error) {
    alert(error.message);
  }
}

async function iniciarSesion() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const response = await apiClient.login({ email, password });
    alert(`Bienvenido, ${response.user.username} (${response.user.rol})`);
    window.location.href = "foro.html";
  } catch (error) {
    alert(error.message);
  }
}
