const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const moment = require("moment");

require("dotenv").config();

const app = express();
const PORT = process.env.REPORTS_PORT || 5003;

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
  connectionLimit: 4,
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

//--------------- TOKEN VERIFICATION ----------------//

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

//--------------- REPORTES PAGE ----------------//

const getDateRange = (period) => {
  const endDate = moment().endOf("day");
  let startDate;

  switch (period) {
    case "last7days":
      startDate = moment().subtract(7, "days").startOf("day");
      break;
    case "last30days":
      startDate = moment().subtract(30, "days").startOf("day");
      break;
    case "last3months":
      startDate = moment().subtract(3, "months").startOf("day");
      break;
    case "lastyear":
      startDate = moment().subtract(1, "year").startOf("day");
      break;
    case "alltime":
    default:
      startDate = moment("1970-01-01").startOf("day");
      break;
  }

  return {
    startDate: startDate.format("YYYY-MM-DD"),
    endDate: endDate.format("YYYY-MM-DD"),
  };
};

// 1. Usuarios Registrados Report
app.get("/api/registerReport", verifyToken(["0"]), async (req, res) => {
  const { startDate, endDate } = getDateRange(req.query.period);

  const query = `
    SELECT 
        DATE_FORMAT(register_date, '%d/%m/%Y') AS fecha,
        COUNT(*) AS usuarios_nuevos,
        SUM(CASE WHEN suscription_plan IS NOT NULL THEN 1 ELSE 0 END) AS suscripciones_nuevas
    FROM users
    WHERE register_date BETWEEN ? AND ?
    GROUP BY DATE(register_date)
    ORDER BY DATE(register_date);
  `;

  try {
    const [results] = await pool.query(query, [startDate, endDate]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener el reporte de usuarios registrados", error);
    res
      .status(500)
      .json({ message: "Error al obtener el reporte de usuarios registrados" });
  }
});

// 2. Reporte de Ganancias
app.get("/api/revenueReport", verifyToken(["0"]), async (req, res) => {
  const { startDate, endDate } = getDateRange(req.query.period);

  const query = `
    SELECT 
        DATE_FORMAT(payment_date, '%d/%m/%Y') AS fecha,
        SUM(amount) AS total_revenue,
        COUNT(*) AS total_transactions,
        SUM(CASE WHEN status = '1' THEN 1 ELSE 0 END) AS successful_transactions
    FROM historical_payment
    WHERE payment_date BETWEEN ? AND ?
    GROUP BY DATE(payment_date)
    ORDER BY DATE(payment_date);
  `;

  try {
    const [results] = await pool.query(query, [startDate, endDate]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener el reporte de ganancias", error);
    res
      .status(500)
      .json({ message: "Error al obtener el reporte de ganancias" });
  }
});

// 3. Actividades Creadas Report
app.get("/api/activityReport", verifyToken(["0"]), async (req, res) => {
  const { startDate, endDate } = getDateRange(req.query.period);

  const query = `
    SELECT 
        DATE_FORMAT(created, '%d/%m/%Y') AS fecha,
        COUNT(*) AS total_activities,
        SUM(CASE WHEN status = '2' THEN 1 ELSE 0 END) AS completed_activities,
        AVG(DATEDIFF(due_date, start_date)) AS avg_duration
    FROM activity
    WHERE created BETWEEN ? AND ?
    GROUP BY DATE(created)
    ORDER BY DATE(created);
  `;

  try {
    const [results] = await pool.query(query, [startDate, endDate]);
    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener el reporte de actividades", error);
    res
      .status(500)
      .json({ message: "Error al obtener el reporte de actividades" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Reports service running on port ${PORT}`);
});
