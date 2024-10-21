const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const axios = require("axios");

require("dotenv").config({ path: "../../.env" }); // Cargar desde la raíz del proyecto

const app = express();
const PORT = process.env.USER_PORT || 5001;

app.use(express.json());

// Activar CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Configuración de la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
});

db.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conexión exitosa a la base de datos!");
  }
});

//------------- TOKEN VERIFICATION ----------------//

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  db.query(
    "SELECT * FROM session_token WHERE token = ?",
    [token],
    (error, session) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Error al verificar el token." });
      }

      if (session.length === 0) {
        return res
          .status(401)
          .json({ message: "Token inválido o no encontrado." });
      }

      // Verifica si el token ha expirado
      const sessionData = session[0];
      const now = new Date();
      if (new Date(sessionData.expires_date) < now) {
        return res.status(401).json({ message: "Token ha expirado." });
      }

      // Si todo está bien, pasa al siguiente middleware
      req.user = { id: sessionData.user_id };
      next();
    }
  );
};

//----------------- PROFILE PAGE -----------------//

app.get("/api/userData", verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT google_id, name, email, biography, profile_picture_url, notifications, emailnotifications, start_time, end_time FROM users WHERE id = ?",
    [userId],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Error al obtener datos del usuario" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.status(200).json(results[0]);
    }
  );
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
});
