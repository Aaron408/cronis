// server/config/db.js
require("dotenv").config(); // Para leer las variables de entorno
const mysql = require("mysql2/promise");

// Crear una conexión a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// Exporta el pool para usar en los servicios
module.exports = pool;
