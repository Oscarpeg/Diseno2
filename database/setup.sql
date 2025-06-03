-- Crear la base de datos
CREATE DATABASE foro_universitario;
USE foro_universitario;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('usuario', 'admin') DEFAULT 'usuario',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_conexion TIMESTAMP NULL
);

-- Tabla de posts/dudas del foro
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT,
    imagen_url VARCHAR(500) NULL,
    votos_positivos INT DEFAULT 0,
    votos_negativos INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de comentarios
CREATE TABLE comentarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    usuario_id INT NOT NULL,
    contenido TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de votaciones
CREATE TABLE votaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    post_id INT NOT NULL,
    tipo ENUM('positivo', 'negativo') NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_voto (usuario_id, post_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Tabla de tickets
CREATE TABLE tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado ENUM('abierto', 'en_proceso', 'cerrado') DEFAULT 'abierto',
    prioridad ENUM('baja', 'media', 'alta') DEFAULT 'media',
    respuesta TEXT NULL,
    admin_asignado INT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_asignado) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Tabla de publicaciones oficiales
CREATE TABLE publicaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    destacada BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATE NULL,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de sesiones
CREATE TABLE sesiones (
    id VARCHAR(128) PRIMARY KEY,
    usuario_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de tokens de recuperación de contraseña
CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    UNIQUE KEY unique_user_reset (usuario_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Insertar usuario admin por defecto
INSERT INTO usuarios (email, username, password_hash, rol) VALUES 
('admin@usa.edu.co', 'Administrador', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insertar publicaciones de ejemplo
INSERT INTO publicaciones (admin_id, titulo, contenido, destacada) VALUES 
(1, 'Matrículas abiertas', 'Las matrículas estarán abiertas hasta el 10 de junio.', TRUE),
(1, 'Semana de parciales', 'La semana de parciales será del 3 al 7 de julio.', FALSE),
(1, 'Feria académica', 'No te pierdas la feria académica el 20 de agosto.', FALSE);






-- ✅ EJECUTAR ESTOS COMANDOS EN MYSQL WORKBENCH PARA ACTUALIZAR EL SISTEMA DE TICKETS

USE foro_universitario;

-- 1. ✅ Verificar estructura actual de tickets
DESCRIBE tickets;

-- 2. ✅ Agregar campo fecha_respuesta si no existe
-- (Solo ejecutar si no aparece en la descripción anterior)
ALTER TABLE tickets ADD COLUMN fecha_respuesta TIMESTAMP NULL AFTER fecha_creacion;

-- 3. ✅ Crear tabla para respuestas de tickets
CREATE TABLE IF NOT EXISTS ticket_respuestas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_id INT NOT NULL,
    admin_id INT NOT NULL,
    respuesta TEXT NOT NULL,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 4. ✅ Verificar que se creó correctamente
DESCRIBE ticket_respuestas;

-- 5. ✅ Actualizar roles si es necesario
UPDATE usuarios SET rol = 'estudiante' WHERE rol = 'usuario';

-- 6. ✅ Crear un usuario secretaria de prueba (opcional)
-- INSERT INTO usuarios (email, username, password_hash, rol) VALUES 
-- ('secretaria@usa.edu.co', 'Secretaria Academica', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'secretaria');

-- 7. ✅ Verificar estructura final
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'foro_universitario' 
AND TABLE_NAME IN ('tickets', 'ticket_respuestas', 'usuarios')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 8. ✅ Verificar usuarios y sus roles
SELECT id, email, username, rol FROM usuarios ORDER BY rol;