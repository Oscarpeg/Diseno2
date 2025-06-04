// server.js - Sistema completo con roles, votaciones, tickets y todo
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
  if (!["estudiante", "usuario"].includes(req.user.rol)) {
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

// ======================
// RUTAS DE POSTS CON VOTACIONES
// ======================

// ✅ Obtener posts con información de votos del usuario
app.get("/api/posts", async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    let userId = null;

    // Obtener ID del usuario si está autenticado
    if (sessionId) {
      const [sessions] = await pool.execute(
        "SELECT usuario_id FROM sesiones WHERE id = ? AND activa = TRUE AND fecha_expiracion > NOW()",
        [sessionId]
      );

      if (sessions.length > 0) {
        userId = sessions[0].usuario_id;
      }
    }

    let query = `
      SELECT p.*, u.username, u.email,
             (p.votos_positivos - p.votos_negativos) as score,
             COUNT(DISTINCT c.id) as comentarios_count
    `;

    // Si hay usuario autenticado, incluir su voto
    if (userId) {
      query += `, v.tipo as voto_usuario`;
    }

    query += `
      FROM posts p 
      JOIN usuarios u ON p.usuario_id = u.id 
      LEFT JOIN comentarios c ON p.id = c.post_id AND c.activo = TRUE
    `;

    if (userId) {
      query += ` LEFT JOIN votaciones v ON p.id = v.post_id AND v.usuario_id = ${userId}`;
    }

    query += `
      WHERE p.activo = TRUE 
      GROUP BY p.id
      ORDER BY p.fecha_creacion DESC 
      LIMIT 20
    `;

    const [posts] = await pool.execute(query);

    console.log(
      `📋 Devolviendo ${posts.length} posts con información de votos`
    );
    res.json(posts);
  } catch (error) {
    console.error("❌ Error obteniendo posts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ Crear post
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

// ======================
// RUTAS DE VOTACIÓN (ESTILO REDDIT)
// ======================

// ✅ Votar en posts
app.post("/api/posts/:id/vote", authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.user_id;
    const { tipo } = req.body; // 'positivo' o 'negativo'

    console.log("🗳️ Procesando voto:", {
      postId,
      userId,
      tipo,
      username: req.user.username,
    });

    // Validar tipo de voto
    if (!["positivo", "negativo"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo de voto inválido. Debe ser 'positivo' o 'negativo'",
      });
    }

    // Verificar que el post existe
    const [posts] = await pool.execute(
      "SELECT id, votos_positivos, votos_negativos FROM posts WHERE id = ? AND activo = TRUE",
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    const post = posts[0];

    // Verificar si el usuario ya votó en este post
    const [votosExistentes] = await pool.execute(
      "SELECT tipo FROM votaciones WHERE usuario_id = ? AND post_id = ?",
      [userId, postId]
    );

    let mensaje = "";
    let nuevoScore = 0;

    if (votosExistentes.length === 0) {
      // ✅ PRIMER VOTO DEL USUARIO
      console.log("✅ Primer voto del usuario");

      // Insertar nuevo voto
      await pool.execute(
        "INSERT INTO votaciones (usuario_id, post_id, tipo) VALUES (?, ?, ?)",
        [userId, postId, tipo]
      );

      // Actualizar contadores en la tabla posts
      if (tipo === "positivo") {
        await pool.execute(
          "UPDATE posts SET votos_positivos = votos_positivos + 1 WHERE id = ?",
          [postId]
        );
        nuevoScore = post.votos_positivos + 1 - post.votos_negativos;
        mensaje = "Voto positivo agregado";
      } else {
        await pool.execute(
          "UPDATE posts SET votos_negativos = votos_negativos + 1 WHERE id = ?",
          [postId]
        );
        nuevoScore = post.votos_positivos - (post.votos_negativos + 1);
        mensaje = "Voto negativo agregado";
      }
    } else {
      const votoAnterior = votosExistentes[0].tipo;

      if (votoAnterior === tipo) {
        // ✅ QUITAR VOTO (usuario hace clic en el mismo botón)
        console.log("❌ Quitando voto anterior");

        await pool.execute(
          "DELETE FROM votaciones WHERE usuario_id = ? AND post_id = ?",
          [userId, postId]
        );

        if (tipo === "positivo") {
          await pool.execute(
            "UPDATE posts SET votos_positivos = votos_positivos - 1 WHERE id = ?",
            [postId]
          );
          nuevoScore = post.votos_positivos - 1 - post.votos_negativos;
          mensaje = "Voto positivo removido";
        } else {
          await pool.execute(
            "UPDATE posts SET votos_negativos = votos_negativos - 1 WHERE id = ?",
            [postId]
          );
          nuevoScore = post.votos_positivos - (post.votos_negativos - 1);
          mensaje = "Voto negativo removido";
        }
      } else {
        // ✅ CAMBIAR VOTO (de positivo a negativo o viceversa)
        console.log("🔄 Cambiando voto:", votoAnterior, "→", tipo);

        await pool.execute(
          "UPDATE votaciones SET tipo = ? WHERE usuario_id = ? AND post_id = ?",
          [tipo, userId, postId]
        );

        if (votoAnterior === "positivo" && tipo === "negativo") {
          // Era positivo, ahora negativo
          await pool.execute(
            "UPDATE posts SET votos_positivos = votos_positivos - 1, votos_negativos = votos_negativos + 1 WHERE id = ?",
            [postId]
          );
          nuevoScore = post.votos_positivos - 1 - (post.votos_negativos + 1);
          mensaje = "Voto cambiado a negativo";
        } else {
          // Era negativo, ahora positivo
          await pool.execute(
            "UPDATE posts SET votos_positivos = votos_positivos + 1, votos_negativos = votos_negativos - 1 WHERE id = ?",
            [postId]
          );
          nuevoScore = post.votos_positivos + 1 - (post.votos_negativos - 1);
          mensaje = "Voto cambiado a positivo";
        }
      }
    }

    // Obtener el estado actual del voto del usuario
    const [votoActual] = await pool.execute(
      "SELECT tipo FROM votaciones WHERE usuario_id = ? AND post_id = ?",
      [userId, postId]
    );

    console.log(
      "✅ Voto procesado exitosamente:",
      mensaje,
      "Score:",
      nuevoScore
    );

    res.json({
      message: mensaje,
      nuevoScore: nuevoScore,
      votoUsuario: votoActual.length > 0 ? votoActual[0].tipo : null,
    });
  } catch (error) {
    console.error("❌ Error procesando voto:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Obtener votos de un post específico
app.get("/api/posts/:id/votes", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    // Obtener estadísticas de votos
    const [stats] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN tipo = 'positivo' THEN 1 END) as votos_positivos,
        COUNT(CASE WHEN tipo = 'negativo' THEN 1 END) as votos_negativos
       FROM votaciones 
       WHERE post_id = ?`,
      [postId]
    );

    const estadisticas = stats[0] || { votos_positivos: 0, votos_negativos: 0 };
    const score = estadisticas.votos_positivos - estadisticas.votos_negativos;

    res.json({
      votos_positivos: estadisticas.votos_positivos,
      votos_negativos: estadisticas.votos_negativos,
      score: score,
    });
  } catch (error) {
    console.error("❌ Error obteniendo votos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ Obtener voto actual del usuario en un post
app.get("/api/posts/:id/my-vote", authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.user_id;

    const [votos] = await pool.execute(
      "SELECT tipo FROM votaciones WHERE usuario_id = ? AND post_id = ?",
      [userId, postId]
    );

    res.json({
      voto: votos.length > 0 ? votos[0].tipo : null,
    });
  } catch (error) {
    console.error("❌ Error obteniendo voto del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======================
// RUTAS DE COMENTARIOS
// ======================

// ✅ Obtener comentarios de un post
app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.id);

    const [comentarios] = await pool.execute(
      `SELECT c.*, u.username 
       FROM comentarios c 
       JOIN usuarios u ON c.usuario_id = u.id 
       WHERE c.post_id = ? AND c.activo = TRUE 
       ORDER BY c.fecha_creacion ASC`,
      [postId]
    );

    console.log(
      `📝 Devolviendo ${comentarios.length} comentarios para post ${postId}`
    );
    res.json(comentarios);
  } catch (error) {
    console.error("❌ Error obteniendo comentarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ✅ Crear comentario en un post
app.post("/api/posts/:id/comments", authenticateUser, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user.user_id;
    const { contenido } = req.body;

    console.log("💬 Creando comentario:", {
      postId,
      userId,
      contenido: contenido.substring(0, 50) + "...",
    });

    // Validaciones
    if (!contenido || contenido.trim() === "") {
      return res.status(400).json({
        error: "El contenido del comentario es requerido",
      });
    }

    if (contenido.length > 500) {
      return res.status(400).json({
        error: "El comentario no puede exceder 500 caracteres",
      });
    }

    // Verificar que el post existe
    const [posts] = await pool.execute(
      "SELECT id FROM posts WHERE id = ? AND activo = TRUE",
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    // Insertar comentario
    const [result] = await pool.execute(
      "INSERT INTO comentarios (post_id, usuario_id, contenido) VALUES (?, ?, ?)",
      [postId, userId, contenido.trim()]
    );

    console.log("✅ Comentario creado con ID:", result.insertId);

    res.status(201).json({
      message: "Comentario creado exitosamente",
      comentarioId: result.insertId,
    });
  } catch (error) {
    console.error("❌ Error creando comentario:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ======================
// RUTAS DE TICKETS CON TEMA
// ======================

// ✅ Crear ticket - SOLO ESTUDIANTES CON TEMA
app.post("/api/tickets", authenticateUser, requireStudent, async (req, res) => {
  try {
    const { titulo, mensaje, tema, prioridad = "media" } = req.body;
    const userId = req.user.user_id;
    const nombre = req.user.username;

    console.log("📝 Creando ticket:", {
      titulo,
      mensaje,
      tema,
      prioridad,
      userId,
      nombre,
    });

    // Validaciones
    if (!mensaje || mensaje.trim() === "") {
      return res.status(400).json({
        error: "El mensaje es requerido",
      });
    }

    if (!tema || tema.trim() === "") {
      return res.status(400).json({
        error: "El tema es requerido",
      });
    }

    // Verificar que el tema sea válido
    const temasValidos = [
      "materia",
      "practicas",
      "certificados",
      "matricula",
      "notas",
      "tramites",
      "becas",
      "otro",
    ];

    if (!temasValidos.includes(tema)) {
      return res.status(400).json({
        error: "Tema inválido. Temas permitidos: " + temasValidos.join(", "),
      });
    }

    // Insertar con el nuevo campo tema
    const [result] = await pool.execute(
      "INSERT INTO tickets (usuario_id, nombre, titulo, mensaje, tema, prioridad, estado) VALUES (?, ?, ?, ?, ?, ?, 'abierto')",
      [userId, nombre, titulo || "Solicitud general", mensaje, tema, prioridad]
    );

    console.log("✅ Ticket creado con ID:", result.insertId);

    res.status(201).json({
      message: "Ticket creado exitosamente",
      ticketId: result.insertId,
      tema: tema,
    });
  } catch (error) {
    console.error("❌ Error creando ticket:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ✅ Obtener tickets incluye tema
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

    if (["estudiante", "usuario"].includes(req.user.rol)) {
      // Estudiantes solo ven sus propios tickets
      query += " WHERE t.usuario_id = ?";
      params.push(req.user.user_id);
      console.log("👨‍🎓 Mostrando tickets del estudiante:", req.user.user_id);
    } else if (["admin", "secretaria"].includes(req.user.rol)) {
      // Admins y secretarias ven todos los tickets
      console.log("📋 Mostrando todos los tickets para", req.user.rol);
    } else {
      return res.status(403).json({
        error: "Rol no autorizado para ver tickets",
        userRole: req.user.rol,
      });
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

// ✅ Responder ticket - SOLO ADMINS/SECRETARIAS
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

// ✅ Obtener respuestas de un ticket
app.get("/api/tickets/:id/responses", authenticateUser, async (req, res) => {
  try {
    const ticketId = req.params.id;

    // Verificar que el usuario puede ver este ticket
    let canView = false;

    if (["estudiante", "usuario"].includes(req.user.rol)) {
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

// ======================
// RUTAS DE PUBLICACIONES
// ======================

// ✅ Crear publicación con imagen - SOLO ADMINS
app.post(
  "/api/publicaciones",
  authenticateUser,
  requireAdmin,
  upload.single("imagen"),
  async (req, res) => {
    try {
      console.log("📝 Petición recibida para crear publicación");
      console.log("📄 Body:", req.body);
      console.log("📷 File:", req.file ? req.file.filename : "Sin archivo");
      console.log("👤 Usuario:", req.user.user_id, req.user.username);

      const { titulo, contenido, destacada, fecha_expiracion } = req.body;
      const adminId = req.user.user_id;
      const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

      // Validación mejorada
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

      // Convertir destacada a boolean correctamente
      const esDestacada =
        destacada === "on" || destacada === "true" || destacada === true;

      console.log("✅ Validación pasada, insertando en BD...");

      // Insertar en base de datos
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

// ✅ Obtener publicaciones
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
  console.log(`Roles disponibles: estudiante, admin, secretaria`);
});
