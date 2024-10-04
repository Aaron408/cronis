// services/auth/server.js
const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const app = express();
const PORT = process.env.AUTH_PORT || 5000;

require("dotenv").config({ path: "../../.env" }); // Cargar desde la raíz del proyecto

app.use(express.json());

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

app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body; // Obtén el token del cuerpo de la solicitud

  try {
    // Verifica el token con Google
    const ticket = await verifyGoogleToken(idToken);
    const { email, name, picture } = ticket; // Destructura la información que necesitas

    // Aquí puedes buscar o crear el usuario en tu base de datos
    // Por ejemplo:
    let user = await findOrCreateUser(email, name, picture);

    // Crea un JWT para el usuario autenticado
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Responde con el usuario y el token
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Función para verificar el token de Google
const verifyGoogleToken = async (token) => {
  const response = await axios.get(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
  );
  return response.data; // Regresa los datos del token verificado
};

// Aquí defines cómo buscar o crear un usuario en tu base de datos
const findOrCreateUser = async (email, name, picture) => {
  // Lógica para buscar o crear un usuario en tu base de datos
  // Ejemplo simplificado
  const user = { id: "123", email, name, picture, tipo: "user" }; // Esto debería ser una búsqueda real en tu DB
  return user;
};

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
