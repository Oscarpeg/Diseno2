// server.js - Servidor backend para el foro universitario
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Para servir archivos estáticos
app.use("/uploads", express.static("uploads")); // Para imágenes subidas

// Configuración de base de datos
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "123456", // Cambia por tu contraseña de MySQL
  database: "foro_universitario",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Configuración de multer para subida de archivos
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  },
});

// ======================
// RUTAS DE AUTENTICACIÓN
// ======================

// Registro de usuarios
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, username, password, rol = "usuario" } = req.body;

    // Validaciones
    if (!email.endsWith("@usa.edu.co")) {
      return res
        .status(400)
        .json({ error: "El correo debe ser institucional (@usa.edu.co)" });
    }

    if (password.length <= 4) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener más de 4 caracteres" });
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
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login de usuarios
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const [users] = await pool.execute(
      "SELECT id, email, username, password_hash, rol FROM usuarios WHERE email = ? AND activo = TRUE",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = users[0];

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Crear sesión
    const sessionId = uuidv4();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24); // 24 horas

    await pool.execute(
      "INSERT INTO sesiones (id, usuario_id, fecha_expiracion) VALUES (?, ?, ?)",
      [sessionId, user.id, expirationDate]
    );

    // Actualizar última conexión
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

// Recuperar contraseña
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Validar email institucional
    if (!email.endsWith("@usa.edu.co")) {
      return res
        .status(400)
        .json({ error: "El correo debe ser institucional (@usa.edu.co)" });
    }

    // Buscar usuario
    const [users] = await pool.execute(
      "SELECT id, email, username FROM usuarios WHERE email = ? AND activo = TRUE",
      [email]
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró una cuenta con ese correo" });
    }

    const user = users[0];

    // Generar token de recuperación
    const resetToken = uuidv4();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1); // 1 hora de expiración

    // Guardar token en base de datos
    await pool.execute(
      `INSERT INTO password_resets (usuario_id, token, fecha_expiracion) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE token = VALUES(token), fecha_expiracion = VALUES(fecha_expiracion)`,
      [user.id, resetToken, expirationDate]
    );

    // En un entorno real, aquí enviarías un email
    // Por ahora, devolvemos el token (solo para desarrollo)
    res.json({
      message: "Se ha generado un token de recuperación",
      resetToken: resetToken, // Solo para desarrollo - NO hacer en producción
      email: user.email,
    });
  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Resetear contraseña con token
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (newPassword.length <= 4) {
      return res
        .status(400)
        .json({ error: "La contraseña debe tener más de 4 caracteres" });
    }

    // Verificar token válido y no expirado
    const [resets] = await pool.execute(
      `SELECT pr.*, u.email FROM password_resets pr 
       JOIN usuarios u ON pr.usuario_id = u.id 
       WHERE pr.token = ? AND pr.fecha_expiracion > NOW() AND pr.usado = FALSE`,
      [token]
    );

    if (resets.length === 0) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const resetData = resets[0];

    // Encriptar nueva contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await pool.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", [
      passwordHash,
      resetData.usuario_id,
    ]);

    // Marcar token como usado
    await pool.execute(
      "UPDATE password_resets SET usado = TRUE WHERE token = ?",
      [token]
    );

    // Invalidar todas las sesiones activas del usuario
    await pool.execute(
      "UPDATE sesiones SET activa = FALSE WHERE usuario_id = ?",
      [resetData.usuario_id]
    );

    res.json({
      message: "Contraseña actualizada exitosamente",
      email: resetData.email,
    });
  } catch (error) {
    console.error("Error reseteando contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Middleware de autenticación
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

// ======================
// RUTAS DEL FORO
// ======================

// Obtener todos los posts
app.get("/api/posts", async (req, res) => {
  try {
    console.log("Intentando obtener posts...");

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

    console.log(`Encontrados ${posts.length} posts`);
    res.json(posts);
  } catch (error) {
    console.error("Error obteniendo posts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear nuevo post
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

// Votar en un post
app.post("/api/posts/:id/vote", authenticateUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const { tipo } = req.body; // 'positivo' o 'negativo'
    const userId = req.user.user_id;

    if (!["positivo", "negativo"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de voto inválido" });
    }

    // Verificar si ya votó
    const [existingVote] = await pool.execute(
      "SELECT tipo FROM votaciones WHERE usuario_id = ? AND post_id = ?",
      [userId, postId]
    );

    if (existingVote.length > 0) {
      // Si el voto es el mismo, lo eliminamos
      if (existingVote[0].tipo === tipo) {
        await pool.execute(
          "DELETE FROM votaciones WHERE usuario_id = ? AND post_id = ?",
          [userId, postId]
        );
      } else {
        // Si es diferente, lo actualizamos
        await pool.execute(
          "UPDATE votaciones SET tipo = ? WHERE usuario_id = ? AND post_id = ?",
          [tipo, userId, postId]
        );
      }
    } else {
      // Insertar nuevo voto
      await pool.execute(
        "INSERT INTO votaciones (usuario_id, post_id, tipo) VALUES (?, ?, ?)",
        [userId, postId, tipo]
      );
    }

    // Actualizar contadores en el post
    await pool.execute(
      `UPDATE posts SET 
       votos_positivos = (SELECT COUNT(*) FROM votaciones WHERE post_id = ? AND tipo = 'positivo'),
       votos_negativos = (SELECT COUNT(*) FROM votaciones WHERE post_id = ? AND tipo = 'negativo')
       WHERE id = ?`,
      [postId, postId, postId]
    );

    res.json({ message: "Voto registrado exitosamente" });
  } catch (error) {
    console.error("Error en votación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener comentarios de un post
app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id;

    const [comments] = await pool.execute(
      `SELECT c.*, u.username 
       FROM comentarios c 
       JOIN usuarios u ON c.usuario_id = u.id 
       WHERE c.post_id = ? AND c.activo = TRUE 
       ORDER BY c.fecha_creacion ASC`,
      [postId]
    );

    res.json(comments);
  } catch (error) {
    console.error("Error obteniendo comentarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear comentario
app.post("/api/posts/:id/comments", authenticateUser, async (req, res) => {
  try {
    const postId = req.params.id;
    const { contenido } = req.body;
    const userId = req.user.user_id;

    if (!contenido || contenido.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "El comentario no puede estar vacío" });
    }

    const [result] = await pool.execute(
      "INSERT INTO comentarios (post_id, usuario_id, contenido) VALUES (?, ?, ?)",
      [postId, userId, contenido.trim()]
    );

    res.status(201).json({
      message: "Comentario creado exitosamente",
      commentId: result.insertId,
    });
  } catch (error) {
    console.error("Error creando comentario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ======================
// RUTAS DE TICKETS
// ======================

// Crear ticket
app.post("/api/tickets", authenticateUser, async (req, res) => {
  try {
    const { titulo, mensaje, prioridad = "media" } = req.body;
    const userId = req.user.user_id;
    const nombre = req.user.username;

    const [result] = await pool.execute(
      "INSERT INTO tickets (usuario_id, nombre, titulo, mensaje, prioridad) VALUES (?, ?, ?, ?, ?)",
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

// Obtener tickets
app.get("/api/tickets", authenticateUser, async (req, res) => {
  try {
    let query = `
      SELECT t.*, u.username as usuario_nombre 
      FROM tickets t 
      JOIN usuarios u ON t.usuario_id = u.id 
    `;
    let params = [];

    // Si es usuario normal, solo sus tickets
    if (req.user.rol !== "admin") {
      query += " WHERE t.usuario_id = ?";
      params.push(req.user.user_id);
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
// RUTAS DE PUBLICACIONES
// ======================

// Obtener publicaciones
app.get("/api/publicaciones", async (req, res) => {
  try {
    const [publicaciones] = await pool.execute(
      `SELECT p.*, u.username as admin_nombre 
       FROM publicaciones p 
       JOIN usuarios u ON p.admin_id = u.id 
       WHERE p.activa = TRUE AND (p.fecha_expiracion IS NULL OR p.fecha_expiracion > CURDATE())
       ORDER BY p.destacada DESC, p.fecha_creacion DESC`
    );

    res.json(publicaciones);
  } catch (error) {
    console.error("Error obteniendo publicaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});
