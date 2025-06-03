// server.js - Sistema completo con roles y autorización
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "foro_universitario",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Configuración de multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  },
});

// ✅ MIDDLEWARES DE AUTENTICACIÓN Y AUTORIZACIÓN

// Middleware de autenticación básico
async function authenticateUser(req, res, next) {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");

    if (!sessionId) {
      return res.status(401).json({ error: "Token de sesión requerido" });
    }

    const [sessions] = await pool.execute(
      `SELECT s.*, u.id as user_id, u.email, u.username, u.rol 
       FROM sesiones s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.id = ? AND s.activa = TRUE AND s.fecha_expiracion > NOW()`,
      [sessionId]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: "Sesión inválida o expirada" });
    }

    req.user = sessions[0];
    next();
  } catch (error) {
    console.error("Error en autenticación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// ✅ Middleware para verificar que el usuario sea ESTUDIANTE
function requireStudent(req, res, next) {
  if (req.user.rol !== "estudiante") {
    return res.status(403).json({
      error: "Acceso denegado. Solo estudiantes pueden realizar esta acción.",
      requiredRole: "estudiante",
      userRole: req.user.rol,
    });
  }
  next();
}

// ✅ Middleware para verificar que el usuario sea ADMIN
function requireAdmin(req, res, next) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({
      error:
        "Acceso denegado. Solo administradores pueden realizar esta acción.",
      requiredRole: "admin",
      userRole: req.user.rol,
    });
  }
  next();
}

// ✅ Middleware para verificar que sea ADMIN o SECRETARIA
function requireAdminOrSecretary(req, res, next) {
  if (!["admin", "secretaria"].includes(req.user.rol)) {
    return res.status(403).json({
      error:
        "Acceso denegado. Solo administradores o secretarias pueden realizar esta acción.",
      requiredRole: "admin o secretaria",
      userRole: req.user.rol,
    });
  }
  next();
}

// ======================
// RUTAS DE AUTENTICACIÓN
// ======================

// ✅ Registro con roles específicos
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, username, password, rol = "estudiante" } = req.body;

    // Validar email institucional
    if (!email.endsWith("@usa.edu.co")) {
      return res.status(400).json({
        error: "El correo debe ser institucional (@usa.edu.co)",
      });
    }

    if (password.length <= 4) {
      return res.status(400).json({
        error: "La contraseña debe tener más de 4 caracteres",
      });
    }

    // ✅ Validar roles permitidos
    const rolesPermitidos = ["estudiante", "admin", "secretaria"];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({
        error: "Rol inválido. Roles permitidos: " + rolesPermitidos.join(", "),
      });
    }

    // ✅ Solo admins pueden crear otros admins o secretarias
    if (["admin", "secretaria"].includes(rol)) {
      const { adminCode } = req.body;
      if (adminCode !== process.env.ADMIN_REGISTRATION_CODE) {
        return res.status(403).json({
          error:
            "Código de administrador requerido para crear este tipo de cuenta",
        });
      }
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.execute(
      "SELECT email FROM usuarios WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Este correo ya está registrado" });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario
    const [result] = await pool.execute(
      "INSERT INTO usuarios (email, username, password_hash, rol) VALUES (?, ?, ?, ?)",
      [email, username, passwordHash, rol]
    );

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      userId: result.insertId,
      rol: rol,
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      "SELECT id, email, username, password_hash, rol FROM usuarios WHERE email = ? AND activo = TRUE",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const sessionId = uuidv4();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);

    await pool.execute(
      "INSERT INTO sesiones (id, usuario_id, fecha_expiracion) VALUES (?, ?, ?)",
      [sessionId, user.id, expirationDate]
    );

    await pool.execute(
      "UPDATE usuarios SET ultima_conexion = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    res.json({
      message: "Login exitoso",
      sessionId: sessionId,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======================
// RUTAS DE TICKETS
// ======================

// ✅ Crear ticket - SOLO ESTUDIANTES
app.post("/api/tickets", authenticateUser, requireStudent, async (req, res) => {
  try {
    const { titulo, mensaje, prioridad = "media" } = req.body;
    const userId = req.user.user_id;
    const nombre = req.user.username;

    if (!titulo || !mensaje) {
      return res.status(400).json({
        error: "Título y mensaje son requeridos",
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO tickets (usuario_id, nombre, titulo, mensaje, prioridad, estado) VALUES (?, ?, ?, ?, ?, 'abierto')",
      [userId, nombre, titulo, mensaje, prioridad]
    );

    res.status(201).json({
      message: "Ticket creado exitosamente",
      ticketId: result.insertId,
    });
  } catch (error) {
    console.error("Error creando ticket:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ Obtener tickets
app.get("/api/tickets", authenticateUser, async (req, res) => {
  try {
    let query = `
      SELECT t.*, u.username as usuario_nombre 
      FROM tickets t 
      JOIN usuarios u ON t.usuario_id = u.id 
    `;
    let params = [];

    if (req.user.rol === "estudiante") {
      query += " WHERE t.usuario_id = ?";
      params.push(req.user.user_id);
    } else if (["admin", "secretaria"].includes(req.user.rol)) {
      // Admins y secretarias ven todos los tickets
    } else {
      return res
        .status(403)
        .json({ error: "Rol no autorizado para ver tickets" });
    }

    query += " ORDER BY t.fecha_creacion DESC";

    const [tickets] = await pool.execute(query, params);
    res.json(tickets);
  } catch (error) {
    console.error("Error obteniendo tickets:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======================
// RUTAS DE PUBLICACIONES (MODIFICADAS)
// ======================

// ✅ Crear publicación con imagen - SOLO ADMINS
app.post(
  "/api/publicaciones",
  authenticateUser,
  requireAdmin,
  upload.single("imagen"), // Middleware para manejar archivo de imagen
  async (req, res) => {
    try {
      console.log("📝 Petición recibida para crear publicación");
      console.log("📄 Body:", req.body);
      console.log("📷 File:", req.file ? req.file.filename : "Sin archivo");
      console.log("👤 Usuario:", req.user.user_id, req.user.username);

      // ✅ Extraer datos del body (viene del FormData)
      const { titulo, contenido, destacada, fecha_expiracion } = req.body;

      const adminId = req.user.user_id;

      // ✅ Procesar imagen si existe
      const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

      // ✅ Log de validación
      console.log("🔍 Datos procesados:");
      console.log("  - Título:", titulo);
      console.log(
        "  - Contenido:",
        contenido ? contenido.substring(0, 50) + "..." : "vacío"
      );
      console.log("  - Destacada:", destacada);
      console.log("  - Fecha exp:", fecha_expiracion);
      console.log("  - Imagen:", imagen_url);

      // ✅ Validación mejorada
      if (!titulo || titulo.trim() === "") {
        console.log("❌ Validación falló: título vacío");
        return res.status(400).json({
          error: "El título es requerido y no puede estar vacío",
        });
      }

      if (!contenido || contenido.trim() === "") {
        console.log("❌ Validación falló: contenido vacío");
        return res.status(400).json({
          error: "El contenido es requerido y no puede estar vacío",
        });
      }

      // ✅ Convertir destacada a boolean correctamente
      const esDestacada =
        destacada === "on" || destacada === "true" || destacada === true;

      console.log("✅ Validación pasada, insertando en BD...");

      // ✅ Insertar en base de datos
      const [result] = await pool.execute(
        `INSERT INTO publicaciones (admin_id, titulo, contenido, destacada, fecha_expiracion, imagen_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          titulo.trim(),
          contenido.trim(),
          esDestacada,
          fecha_expiracion || null,
          imagen_url,
        ]
      );

      console.log("✅ Publicación creada con ID:", result.insertId);

      res.status(201).json({
        message: "Publicación creada exitosamente",
        publicacionId: result.insertId,
        imagen_url: imagen_url,
        destacada: esDestacada,
      });
    } catch (error) {
      console.error("❌ Error completo creando publicación:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ✅ Obtener publicaciones (modificada para incluir imagen_url)
app.get("/api/publicaciones", async (req, res) => {
  try {
    let query = `
      SELECT p.*, u.username as admin_nombre 
      FROM publicaciones p 
      JOIN usuarios u ON p.admin_id = u.id 
    `;

    // Si no es admin, solo mostrar publicaciones activas y no expiradas
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    let isAdmin = false;

    if (sessionId) {
      const [sessions] = await pool.execute(
        `SELECT u.rol FROM sesiones s 
         JOIN usuarios u ON s.usuario_id = u.id 
         WHERE s.id = ? AND s.activa = TRUE AND s.fecha_expiracion > NOW()`,
        [sessionId]
      );

      if (sessions.length > 0 && sessions[0].rol === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      query +=
        " WHERE p.activa = TRUE AND (p.fecha_expiracion IS NULL OR p.fecha_expiracion > CURDATE())";
    }

    query += " ORDER BY p.destacada DESC, p.fecha_creacion DESC";

    const [publicaciones] = await pool.execute(query);

    console.log(`📋 Devolviendo ${publicaciones.length} publicaciones`);
    res.json(publicaciones);
  } catch (error) {
    console.error("❌ Error obteniendo publicaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======================
// OTRAS RUTAS (sin cambios)
// ======================

app.get("/api/auth/me", authenticateUser, (req, res) => {
  res.json({
    user: {
      id: req.user.user_id,
      email: req.user.email,
      username: req.user.username,
      rol: req.user.rol,
    },
  });
});

// RUTAS DE POSTS (sin cambios)
app.get("/api/posts", async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.email,
              (p.votos_positivos - p.votos_negativos) as score,
              COUNT(c.id) as comentarios_count
       FROM posts p 
       JOIN usuarios u ON p.usuario_id = u.id 
       LEFT JOIN comentarios c ON p.id = c.post_id AND c.activo = TRUE
       WHERE p.activo = TRUE 
       GROUP BY p.id
       ORDER BY p.fecha_creacion DESC 
       LIMIT 20`
    );

    res.json(posts);
  } catch (error) {
    console.error("Error obteniendo posts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post(
  "/api/posts",
  authenticateUser,
  upload.single("imagen"),
  async (req, res) => {
    try {
      const { titulo, contenido } = req.body;
      const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

      if (!titulo && !contenido && !imagen_url) {
        return res.status(400).json({
          error: "Debe proporcionar al menos título, contenido o imagen",
        });
      }

      const [result] = await pool.execute(
        "INSERT INTO posts (usuario_id, titulo, contenido, imagen_url) VALUES (?, ?, ?, ?)",
        [req.user.user_id, titulo || "", contenido || "", imagen_url]
      );

      res.status(201).json({
        message: "Post creado exitosamente",
        postId: result.insertId,
      });
    } catch (error) {
      console.error("Error creando post:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ✅ AGREGAR ESTAS RUTAS AL server.js (después de las rutas de tickets existentes)

// ✅ NUEVA RUTA: Responder ticket - SOLO ADMINS/SECRETARIAS
app.post(
  "/api/tickets/:id/respond",
  authenticateUser,
  requireAdminOrSecretary,
  async (req, res) => {
    try {
      const ticketId = req.params.id;
      const { respuesta, estado = "en_proceso" } = req.body;
      const adminId = req.user.user_id;

      console.log("📝 Respondiendo ticket:", {
        ticketId,
        adminId,
        adminUsername: req.user.username,
        respuesta: respuesta.substring(0, 50) + "...",
        estado,
      });

      if (!respuesta || respuesta.trim() === "") {
        return res.status(400).json({ error: "La respuesta es requerida" });
      }

      // Verificar que el ticket existe
      const [tickets] = await pool.execute(
        "SELECT id, estado, usuario_id FROM tickets WHERE id = ?",
        [ticketId]
      );

      if (tickets.length === 0) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }

      // Verificar que existe la tabla ticket_respuestas
      try {
        await pool.execute("SELECT 1 FROM ticket_respuestas LIMIT 1");
      } catch (tableError) {
        console.log("⚠️ Tabla ticket_respuestas no existe, creándola...");

        // Crear tabla si no existe
        await pool.execute(`
          CREATE TABLE ticket_respuestas (
            id INT PRIMARY KEY AUTO_INCREMENT,
            ticket_id INT NOT NULL,
            admin_id INT NOT NULL,
            respuesta TEXT NOT NULL,
            fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
          )
        `);

        console.log("✅ Tabla ticket_respuestas creada");
      }

      // Insertar respuesta
      await pool.execute(
        "INSERT INTO ticket_respuestas (ticket_id, admin_id, respuesta) VALUES (?, ?, ?)",
        [ticketId, adminId, respuesta.trim()]
      );

      // Actualizar estado del ticket
      await pool.execute(
        "UPDATE tickets SET estado = ?, fecha_respuesta = CURRENT_TIMESTAMP WHERE id = ?",
        [estado, ticketId]
      );

      console.log("✅ Respuesta agregada y ticket actualizado");

      res.json({
        message: "Respuesta agregada exitosamente",
        ticketId: ticketId,
        estado: estado,
        respondidoPor: req.user.username,
      });
    } catch (error) {
      console.error("❌ Error respondiendo ticket:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// ✅ NUEVA RUTA: Obtener respuestas de un ticket
app.get("/api/tickets/:id/responses", authenticateUser, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // Verificar que el usuario puede ver este ticket
    let canView = false;

    if (req.user.rol === "estudiante") {
      // Estudiantes solo pueden ver respuestas de sus propios tickets
      const [tickets] = await pool.execute(
        "SELECT id FROM tickets WHERE id = ? AND usuario_id = ?",
        [ticketId, req.user.user_id]
      );
      canView = tickets.length > 0;
    } else if (["admin", "secretaria"].includes(req.user.rol)) {
      // Admins y secretarias pueden ver todas las respuestas
      canView = true;
    }

    if (!canView) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para ver este ticket" });
    }

    // Verificar que existe la tabla ticket_respuestas
    try {
      const [respuestas] = await pool.execute(
        `SELECT tr.*, u.username as admin_nombre 
         FROM ticket_respuestas tr 
         JOIN usuarios u ON tr.admin_id = u.id 
         WHERE tr.ticket_id = ? 
         ORDER BY tr.fecha_respuesta ASC`,
        [ticketId]
      );

      res.json(respuestas);
    } catch (tableError) {
      console.log(
        "⚠️ Tabla ticket_respuestas no existe, devolviendo array vacío"
      );
      res.json([]);
    }
  } catch (error) {
    console.error("❌ Error obteniendo respuestas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ ACTUALIZAR LA RUTA EXISTENTE DE TICKETS PARA INCLUIR fecha_respuesta
// Reemplazar la ruta GET /api/tickets existente con esta versión mejorada:

app.get("/api/tickets", authenticateUser, async (req, res) => {
  try {
    let query = `
      SELECT t.*, u.username as usuario_nombre 
      FROM tickets t 
      JOIN usuarios u ON t.usuario_id = u.id 
    `;
    let params = [];

    console.log(
      "📋 Obteniendo tickets para usuario:",
      req.user.username,
      "rol:",
      req.user.rol
    );

    if (req.user.rol === "estudiante") {
      // Estudiantes solo ven sus propios tickets
      query += " WHERE t.usuario_id = ?";
      params.push(req.user.user_id);
      console.log("👨‍🎓 Mostrando tickets del estudiante:", req.user.user_id);
    } else if (["admin", "secretaria"].includes(req.user.rol)) {
      // Admins y secretarias ven todos los tickets
      console.log("📋 Mostrando todos los tickets para", req.user.rol);
    } else {
      return res
        .status(403)
        .json({ error: "Rol no autorizado para ver tickets" });
    }

    query += " ORDER BY t.fecha_creacion DESC";

    const [tickets] = await pool.execute(query, params);

    console.log(`✅ Devolviendo ${tickets.length} tickets`);
    res.json(tickets);
  } catch (error) {
    console.error("❌ Error obteniendo tickets:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
  console.log(`Roles disponibles: estudiante, admin, secretaria`);
});
