const express = require("express");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 5005;

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
  connectionLimit: 2,
  queueLimit: 0,
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

app.get("/", (req, res) => {
  res.send("Notification service running!");
});

//------------- TOKEN VERIFICATION ----------------//
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

//---------------- SEND MAILS ----------------//

// Crear un transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.titan.email",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODE_EMAIL,
    pass: process.env.NODE_PASSWORD,
  },
});

// Función para manejar la verificación diaria de actividades
async function dailyActivityCheck() {
  try {
    // Verificar actividades que vencen en 1-2 días
    const [upcomingActivities] = await pool.query(`
      SELECT 
        a.*, 
        u.email,
        u.emailnotifications,
        DATE_FORMAT(a.due_date, '%d/%m/%Y') AS formatted_due_date
      FROM 
        activity a
      JOIN 
        users u ON a.user_id = u.id
      WHERE 
        (a.due_date BETWEEN CURDATE() + INTERVAL 1 DAY AND CURDATE() + INTERVAL 10 DAY)
        AND a.status NOT IN ('2', '3')
        AND u.notifications = '1'
        AND u.status != '2';
    `);

    // Insertar notificaciones y enviar correos
    for (const activity of upcomingActivities) {
      // Insertar notificación
      await pool.query(
        `
          INSERT INTO notification (user_id, activity_id, details, notify_time)
          VALUES (?, ?, ?, NOW())
        `,
        [
          activity.user_id,
          activity.id,
          `La actividad "${activity.title}" vence pronto.`,
        ]
      );

      // Enviar correo solo si el usuario tiene habilitadas las notificaciones por correo
      if (activity.emailnotifications === "1") {
        await transporter.sendMail({
          from: `"CRONIS" <${process.env.NODE_EMAIL}>`,
          to: activity.email,
          subject: "Recordatorio de Actividad Próxima",
          text: `Tu actividad "${activity.title}" vence el ${activity.formatted_due_date}. ¡No olvides completarla!`,
        });
      }
    }

    // Eliminar notificaciones antiguas
    await pool.query(`
      DELETE n FROM notification n
      JOIN activity a ON n.activity_id = a.id
      WHERE a.due_date < CURDATE() - INTERVAL 6 DAY
    `);

    console.log("Verificación diaria de actividades completada con éxito.");
  } catch (error) {
    console.error("Error en la verificación diaria de actividades:", error);
  }
}

// Ruta para ejecutar manualmente la verificación diaria
app.get("/run-daily-check", async (req, res) => {
  try {
    await dailyActivityCheck();
    res
      .status(200)
      .json({ message: "Verificación diaria ejecutada con éxito." });
  } catch (error) {
    console.error("Error al ejecutar la verificación diaria:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Programar la ejecución diaria
const schedule = require("node-schedule");

// Ejecutar todos los días a la medianoche
schedule.scheduleJob("0 0 * * *", dailyActivityCheck);

//---------------- NOTIFICATIONS HEADER ----------------//

app.get("/api/userNotifications", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;

  try {
    // Contar notificaciones no vistas
    const [countResults] = await pool.query(
      `
        SELECT COUNT(*) AS notificationCount 
        FROM notification 
        WHERE user_id = ? AND sent = 1
      `,
      [userId]
    );

    // Obtener las notificaciones con detalles de la actividad
    const [notifications] = await pool.query(
      `
        SELECT 
          n.id, 
          a.title AS activity_title, 
          n.details AS message, 
          n.notify_time AS date
        FROM 
          notification n
        LEFT JOIN 
          activity a 
        ON 
          n.activity_id = a.id
        WHERE 
          n.user_id = ?
        ORDER BY 
          n.notify_time DESC
        LIMIT 10
      `,
      [userId]
    );

    // Responder con los datos
    res.status(200).json({
      notificationCount: countResults[0].notificationCount,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Error al obtener notificaciones del usuario:", error);
    res
      .status(500)
      .json({ message: "Error al obtener notificaciones del usuario" });
  }
});

app.post("/api/watchedNotifications", verifyToken(["1"]), async (req, res) => {
  const { notificationIds } = req.body;

  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res
      .status(400)
      .json({ message: "No se proporcionaron IDs válidos." });
  }

  try {
    const query = "UPDATE notification SET sent = 2 WHERE id IN (?)";
    await pool.query(query, [notificationIds]);

    return res
      .status(200)
      .json({ message: "Notificaciones actualizadas correctamente." });
  } catch (error) {
    console.error("Error al actualizar las notificaciones:", error);
    return res.status(500).json({
      message: "Hubo un error al actualizar las notificaciones.",
      error: error.message,
    });
  }
});

//---------------- TURN ON SERVER ----------------//

app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});
