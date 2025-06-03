// js/tickets.js

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar autenticación
  if (!apiClient.sessionId) {
    window.location.href = "index.html";
    return;
  }

  await cargarTickets();

  document
    .getElementById("form-ticket")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      await crearTicket();
    });
});

async function cargarTickets() {
  try {
    const tickets = await apiClient.getTickets();
    const ticketLista = document.getElementById("ticket-lista");

    ticketLista.innerHTML = "";

    if (tickets.length === 0) {
      ticketLista.innerHTML =
        '<div class="text-center text-gray-500 py-8">No tienes tickets creados</div>';
      return;
    }

    tickets.forEach((ticket) => {
      const ticketDiv = document.createElement("div");
      ticketDiv.className = "bg-white p-4 rounded shadow";

      const estadoColor = {
        abierto: "bg-green-100 text-green-800",
        en_proceso: "bg-yellow-100 text-yellow-800",
        cerrado: "bg-red-100 text-red-800",
      };

      ticketDiv.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-bold">${ticket.titulo || "Solicitud general"}</h3>
          <span class="text-xs px-2 py-1 rounded ${
            estadoColor[ticket.estado] || "bg-gray-100 text-gray-600"
          }">
            ${ticket.estado.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <p class="mb-2 text-gray-700">${ticket.mensaje}</p>
        <small class="text-gray-500">
          Creado: ${new Date(
            ticket.fecha_creacion
          ).toLocaleDateString()} a las ${new Date(
        ticket.fecha_creacion
      ).toLocaleTimeString()}
        </small>
      `;

      ticketLista.appendChild(ticketDiv);
    });
  } catch (error) {
    console.error("Error cargando tickets:", error);
    const ticketLista = document.getElementById("ticket-lista");
    ticketLista.innerHTML =
      '<div class="text-center text-red-500 py-8">Error cargando tickets</div>';
  }
}

async function crearTicket() {
  const titulo = document.getElementById("titulo").value.trim() || null;
  const mensaje = document.getElementById("mensaje").value.trim();

  if (!mensaje) {
    alert("El mensaje es requerido");
    return;
  }

  try {
    await apiClient.createTicket({ titulo, mensaje });

    // Limpiar formulario
    document.getElementById("titulo").value = "";
    document.getElementById("mensaje").value = "";

    // Recargar tickets
    await cargarTickets();

    alert("Ticket creado exitosamente");
  } catch (error) {
    alert("Error creando ticket: " + error.message);
  }
}

function cerrarSesion() {
  apiClient.logout();
}
