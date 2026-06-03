# Foro Universitario — Plataforma académica Universidad Sergio Arboleda

![Node.js](https://img.shields.io/badge/Node.js-16+-339933?logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express) ![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white) ![Deploy](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render)

> Plataforma web que conecta estudiantes con la secretaría académica de la Escuela de Ciencias Exactas. Permite publicar en el foro, votar propuestas, crear tickets de solicitud y recibir anuncios institucionales — todo con autenticación por correo institucional `@usa.edu.co`.

## ✨ Features

- Autenticación con correo institucional `@usa.edu.co` y sistema de roles (estudiante, secretaría, admin)
- Foro participativo con votos positivos y negativos (▲▼) por publicación
- Sistema de tickets de solicitud dirigidos a la secretaría académica
- Panel de publicaciones e anuncios institucionales con soporte de imágenes
- Recuperación de contraseña integrada
- Control de acceso por rol en todas las rutas de la API (middleware de autorización)
- Subida de imágenes con validación de tipo y tamaño (máx. 5 MB)

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node.js 16+ |
| Framework backend | Express 4 |
| Base de datos | MySQL 8.0 |
| Autenticación | Sesiones UUID + bcrypt |
| Subida de archivos | Multer |
| Frontend | HTML + CSS + Tailwind CSS (CDN) |
| Deploy | Render (backend) |

## 🚀 Correr en local

### Requisitos

- Node.js 16+
- MySQL 8.0+
- Python 3.x (para servir el frontend)

### Instalación

```bash
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu contraseña de MySQL y datos reales

# 3. Iniciar el backend
npm run dev
# → API en http://localhost:3000
```

```bash
# 4. En otra terminal, iniciar el frontend
cd frontend
python -m http.server 8000
# → Frontend en http://localhost:8000
```

### Configurar MySQL

1. Instalar MySQL 8.0 y crear la base de datos `foro_universitario`
2. Ejecutar el script SQL de inicialización en MySQL Workbench o consola
3. Ajustar `DB_PASSWORD` en tu `.env` con la contraseña root que creaste

> Para instrucciones detalladas de instalación de MySQL en Windows, ver el archivo `README` (sin extensión) en la raíz.

### Primeros pasos

1. Abre `http://localhost:8000`
2. Regístrate con un correo `@usa.edu.co`
3. Prueba el foro, los tickets y las publicaciones

## 📁 Estructura del proyecto

```
Diseno2/
├── backend/
│   ├── server.js          # API REST completa (auth, foro, tickets, publicaciones)
│   ├── package.json
│   ├── .env.example       # Variables de entorno de referencia
│   └── uploads/           # Imágenes subidas por usuarios
├── frontend/
│   ├── index.html         # Login y registro
│   ├── foro.html          # Foro con votaciones
│   ├── publicaciones.html # Anuncios institucionales
│   ├── tickets.html       # Solicitudes a secretaría
│   ├── forgot-password.html
│   ├── css/style.css
│   └── js/
│       ├── api-client.js  # Cliente HTTP centralizado
│       ├── auth.js
│       ├── foro.js
│       ├── tickets.js
│       └── publicaciones.js
└── img/
    └── imgfondo.webp
```

## 🌐 Deploy

Backend en producción: **https://piaausa.onrender.com/**

## 📸 Screenshots

> 📷 Screenshots pendientes — próximamente
