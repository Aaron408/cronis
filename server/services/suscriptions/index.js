const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const Stripe = require("stripe");

require("dotenv").config();

const app = express();
const PORT = process.env.SUSCRIPTION_PORT || 5004;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cors());

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  charset: "utf8mb4",
});

// Function to test the database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.query("SELECT 1 AS test");
    console.log("Connected to the database successfully!");
    connection.release();
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
    if (error.code === "ETIMEDOUT") {
      setTimeout(() => {
        console.log("Attempting to reconnect to the database...");
        testConnection();
      }, 5000);
    }
  }
}

testConnection();

//------------- Token verification ----------------//
const verifyToken = (allowedTypes) => async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  try {
    const [session] = await pool.query(
      `SELECT st.user_id, u.type, st.expires_date FROM session_token st JOIN users u on u.id = st.user_id WHERE token = ?`,
      [token]
    );

    if (session.length === 0) {
      return res
        .status(401)
        .json({ message: "Token inválido o no encontrado." });
    }

    const sessionData = session[0];
    const now = new Date();
    if (new Date(sessionData.expires_date) < now) {
      return res.status(401).json({ message: "Token ha expirado." });
    }

    if (!allowedTypes.includes(sessionData.type)) {
      return res
        .status(403)
        .json({ message: "Acceso denegado. Permisos insuficientes." });
    }

    req.user = { id: sessionData.user_id, type: sessionData.type };
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error);
    res.status(500).json({ message: "Error al verificar el token." });
  }
};

//------------- Suscriptions Functions ----------------//
app.post("/api/create-payment", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const { amount, currency, paymentMethod } = req.body;

  try {
    // Verificar el plan de suscripción actual del usuario
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT suscription_plan FROM users WHERE id = ?",
      [userId]
    );
    connection.release();

    if (!rows.length) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const currentPlan = rows[0].suscription_plan;

    if (currentPlan !== 1) {
      return res
        .status(400)
        .json({ error: "El usuario ya tiene una suscripción activa." });
    }

    // Crear el intento de pago con Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card"],
    });

    const transactionId = paymentIntent.id;
    const amountSQL = amount / 100;

    const dbConnection = await pool.getConnection();
    try {
      await dbConnection.beginTransaction();

      await dbConnection.query(
        `INSERT INTO historical_payment (transaction_id, user_id, amount, payment_date, payment_method, status)
           VALUES (?, ?, ?, NOW(), ?, ?)`,
        [transactionId, userId, amountSQL, paymentMethod, "1"]
      );

      await dbConnection.query(
        `UPDATE users 
           SET suscription_plan = ?, start_suscription = NOW(), 
               end_suscription = DATE_ADD(NOW(), INTERVAL 1 MONTH)
           WHERE id = ?`,
        [2, userId]
      );

      await dbConnection.commit();

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      await dbConnection.rollback();
      throw error;
    } finally {
      dbConnection.release();
    }
  } catch (error) {
    console.error("Error en el proceso:", error);
    res.status(500).send("Error al procesar el pago.");
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Suscription service running on port ${PORT}`);
});
