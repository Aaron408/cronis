const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
const PORT = process.env.USER_PORT || 5001;

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
  connectionLimit: 5,
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

app.get("/", (req, res) => {
  res.send("Users service running!");
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

//----------------- PROFILE PAGE -----------------//

app.post("/api/updateUser", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const { updateData } = req.body;
  const currentPassword = updateData.currentPassword;
  const newPassword = updateData.newPassword;

  try {
    if (currentPassword && newPassword) {
      const hashedPassword = crypto
        .createHash("md5")
        .update(currentPassword)
        .digest("hex");

      const [results] = await pool.query(
        `SELECT password FROM users WHERE id = ?`,
        [userId]
      );

      if (results.length > 0 && hashedPassword === results[0].password) {
        const hashedNewPassword = crypto
          .createHash("md5")
          .update(newPassword)
          .digest("hex");

        delete updateData.currentPassword;
        delete updateData.newPassword;
        updateData.password = hashedNewPassword;

        await pool.query(`UPDATE users SET ? WHERE id = ?`, [
          updateData,
          userId,
        ]);
        return res.status(200).json({ message: "User updated successfully" });
      } else {
        return res.status(400).json({ error: "Incorrect current password" });
      }
    } else {
      await pool.query(`UPDATE users SET ? WHERE id = ?`, [updateData, userId]);
      return res.status(200).json({ message: "User updated successfully" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

app.get("/api/userData", verifyToken(["1", "0"]), async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await pool.query(
      "SELECT google_id, name, email, biography, profile_picture_url, notifications, emailnotifications, start_time, end_time FROM users WHERE id = ?",
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error);
    res.status(500).json({ message: "Error al obtener datos del usuario" });
  }
});

//---------------- DASHBOARD PAGE -----------------//

app.get("/api/adminData", verifyToken(["0"]), async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await pool.query(
      "SELECT name, email, profile_picture_url FROM users WHERE id = ?",
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(results[0]);
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error);
    res.status(500).json({ message: "Error al obtener datos del usuario" });
  }
});

app.get("/api/dashboardStatistics", verifyToken(["0"]), async (req, res) => {
  const query = `
    SELECT 
    -- Total de usuarios
    (SELECT COUNT(*) FROM users WHERE status != '2') AS total_users,
    -- Usuarios registrados el mes pasado
    (SELECT COUNT(*) 
     FROM users 
     WHERE status = '0' 
       AND register_date <= LAST_DAY(CURDATE() - INTERVAL 1 MONTH) 
       AND MONTH(register_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) 
       AND YEAR(register_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)) AS previous_month_users,
    -- Usuarios registrados el mes actual
    (SELECT COUNT(*) 
     FROM users 
     WHERE status = '0' 
       AND MONTH(register_date) = MONTH(CURDATE()) 
       AND YEAR(register_date) = YEAR(CURDATE())) AS current_month_users,

    -- Total de actividades
    (SELECT COUNT(*) 
     FROM activity 
     WHERE status = '0') AS total_activities,
    -- Actividades del mes pasado
    (SELECT COUNT(*) 
     FROM activity 
     WHERE status = '0' 
       AND due_date <= LAST_DAY(CURDATE() - INTERVAL 1 MONTH) 
       AND MONTH(due_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) 
       AND YEAR(due_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)) AS previous_month_activities,
    -- Actividades del mes actual
    (SELECT COUNT(*) 
     FROM activity 
     WHERE status = '0' 
       AND MONTH(due_date) = MONTH(CURDATE()) 
       AND YEAR(due_date) = YEAR(CURDATE())) AS current_month_activities,

    -- Ingresos totales
    (SELECT COALESCE(SUM(amount), 0) 
     FROM historical_payment) AS total_revenue,
    -- Ingresos del mes pasado
    (SELECT COALESCE(SUM(amount), 0) 
     FROM historical_payment 
     WHERE 
       MONTH(payment_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) 
       AND YEAR(payment_date) = YEAR(CURDATE() - INTERVAL 1 MONTH)) AS previous_month_revenue,
    -- Ingresos del mes actual
    (SELECT COALESCE(SUM(amount), 0) 
     FROM historical_payment 
     WHERE 
       MONTH(payment_date) = MONTH(CURDATE()) 
       AND YEAR(payment_date) = YEAR(CURDATE())) AS current_month_revenue;
  `;

  try {
    const [results] = await pool.query(query);
    const data = results[0];

    const calculatePercentageChange = (current, previous) => {
      if (previous > 0) {
        return ((current - previous) / previous) * 100;
      } else if (current > 0) {
        return 100;
      } else {
        return 0;
      }
    };

    const userPercentageChange = calculatePercentageChange(
      data.current_month_users,
      data.previous_month_users
    );
    const activityPercentageChange = calculatePercentageChange(
      data.current_month_activities,
      data.previous_month_activities
    );
    const revenuePercentageChange = calculatePercentageChange(
      data.current_month_revenue,
      data.previous_month_revenue
    );

    res.status(200).json({
      users: {
        total: data.total_users,
        previousMonth: data.previous_month_users,
        currentMonth: data.current_month_users,
        percentageChange: userPercentageChange.toFixed(2),
      },
      activities: {
        total: data.total_activities,
        previousMonth: data.previous_month_activities,
        currentMonth: data.current_month_activities,
        percentageChange: activityPercentageChange.toFixed(2),
      },
      revenue: {
        total: data.total_revenue,
        previousMonth: data.previous_month_revenue,
        currentMonth: data.current_month_revenue,
        percentageChange: revenuePercentageChange.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error al obtener estadísticas del dashboard:", error);
    res
      .status(500)
      .json({ message: "Error al obtener estadísticas del dashboard" });
  }
});

app.get("/api/graphicsData", verifyToken(["0"]), async (req, res) => {
  const queryUsers = `
    SELECT 
      m.mes,
      COUNT(u.id) AS total_usuarios
    FROM 
      (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq MONTH), '%Y-%m') AS mes
      FROM (SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
            UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS seqs
      ) AS m
    LEFT JOIN 
      users u ON DATE_FORMAT(u.register_date, '%Y-%m') = m.mes
    GROUP BY 
      m.mes
    ORDER BY 
      m.mes;
  `;

  const queryRevenue = `
    SELECT 
      DATE_FORMAT(m.month_start, '%Y-%m') AS month,
      COALESCE(SUM(hp.amount), 0) AS monthly_revenue
    FROM (
      SELECT LAST_DAY(CURDATE()) - INTERVAL n MONTH + INTERVAL 1 DAY AS month_start,
            LAST_DAY(CURDATE() - INTERVAL n MONTH) AS month_end
      FROM (
          SELECT 0 AS n UNION SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
          UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
          UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11
      ) months
    ) m
    LEFT JOIN historical_payment hp ON m.month_end >= hp.payment_date
    GROUP BY m.month_start
    ORDER BY m.month_start DESC
  `;

  try {
    const [usersResults] = await pool.query(queryUsers);
    const [revenueResults] = await pool.query(queryRevenue);
    console.log(revenueResults);

    res.status(200).json({
      usersData: usersResults,
      revenueData: revenueResults,
    });
  } catch (error) {
    console.error("Error al obtener datos gráficos:", error);
    res.status(500).json({ message: "Error al obtener datos gráficos" });
  }
});

app.get("/api/activity", verifyToken(["0"]), async (req, res) => {
  const queryActivities = `
    SELECT 
      u.name AS user_name,
      a.created AS event_date,
      CASE
          WHEN TIMESTAMPDIFF(MINUTE, a.created, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, a.created, NOW()), ' minutos')
          WHEN TIMESTAMPDIFF(HOUR, a.created, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, a.created, NOW()), ' horas')
          WHEN TIMESTAMPDIFF(DAY, a.created, NOW()) < 7 THEN CONCAT(TIMESTAMPDIFF(DAY, a.created, NOW()), ' días')
          WHEN TIMESTAMPDIFF(WEEK, a.created, NOW()) < 4 THEN CONCAT(TIMESTAMPDIFF(WEEK, a.created, NOW()), ' semanas')
          WHEN TIMESTAMPDIFF(MONTH, a.created, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, a.created, NOW()), ' meses')
          ELSE CONCAT(TIMESTAMPDIFF(YEAR, a.created, NOW()), ' años')
      END AS time_ago,
      'Ha creado una actividad' AS message
    FROM 
      activity a
    JOIN 
      users u ON a.user_id = u.id
    ORDER BY 
      a.created DESC
  `;

  const queryUsers = `
    SELECT 
      u.name AS user_name,
      u.register_date AS event_date,
      CASE
          WHEN TIMESTAMPDIFF(MINUTE, u.register_date, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, u.register_date, NOW()), ' minutos')
          WHEN TIMESTAMPDIFF(HOUR, u.register_date, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, u.register_date, NOW()), ' horas')
          WHEN TIMESTAMPDIFF(DAY, u.register_date, NOW()) < 7 THEN CONCAT(TIMESTAMPDIFF(DAY, u.register_date, NOW()), ' días')
          WHEN TIMESTAMPDIFF(WEEK, u.register_date, NOW()) < 4 THEN CONCAT(TIMESTAMPDIFF(WEEK, u.register_date, NOW()), ' semanas')
          WHEN TIMESTAMPDIFF(MONTH, u.register_date, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, u.register_date, NOW()), ' meses')
          ELSE CONCAT(TIMESTAMPDIFF(YEAR, u.register_date, NOW()), ' años')
      END AS time_ago,
      'Ahora es miembro de Cronis' AS message
    FROM users u
    ORDER BY 
      u.register_date DESC
  `;

  const queryPayments = `
    SELECT 
      u.name AS user_name,
      hp.payment_date AS event_date,
      CASE
          WHEN TIMESTAMPDIFF(MINUTE, hp.payment_date, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, hp.payment_date, NOW()), ' minutos')
          WHEN TIMESTAMPDIFF(HOUR, hp.payment_date, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, hp.payment_date, NOW()), ' horas')
          WHEN TIMESTAMPDIFF(DAY, hp.payment_date, NOW()) < 7 THEN CONCAT(TIMESTAMPDIFF(DAY, hp.payment_date, NOW()), ' días')
          WHEN TIMESTAMPDIFF(WEEK, hp.payment_date, NOW()) < 4 THEN CONCAT(TIMESTAMPDIFF(WEEK, hp.payment_date, NOW()), ' semanas')
          WHEN TIMESTAMPDIFF(MONTH, hp.payment_date, NOW()) < 12 THEN CONCAT(TIMESTAMPDIFF(MONTH, hp.payment_date, NOW()), ' meses')
          ELSE CONCAT(TIMESTAMPDIFF(YEAR, hp.payment_date, NOW()), ' años')
      END AS time_ago,
      'Ahora es premium' AS message
    FROM 
      users u
    JOIN 
      historical_payment hp ON u.id = hp.user_id
    WHERE
      hp.status = '1'
    ORDER BY 
      hp.payment_date DESC
  `;

  try {
    const [activities] = await pool.query(queryActivities);
    const [users] = await pool.query(queryUsers);
    const [payments] = await pool.query(queryPayments);

    const allActivities = [...activities, ...users, ...payments];
    allActivities.sort(
      (a, b) => new Date(b.event_date) - new Date(a.event_date)
    );
    const recentActivities = allActivities.slice(0, 6);

    res.status(200).json(recentActivities);
  } catch (error) {
    console.error("Error al obtener la actividad de los usuarios:", error);
    res
      .status(500)
      .json({ message: "Error al obtener la actividad de los usuarios" });
  }
});

//---------------- USERS CRUD PAGE -----------------//

app.get("/api/users", verifyToken(["0"]), async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT us.id, us.name, us.email, us.profile_picture_url AS imgUrl, 
              us.suscription_plan,
              us.start_suscription,
              us.end_suscription,
              DATE_FORMAT(us.register_date, '%Y-%m-%d') AS register,
              us.type AS rol,
              us.status
       FROM users us
       WHERE us.status != '2'`
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "No hay usuarios que mostrar" });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error al obtener datos de usuarios:", error);
    res.status(500).json({ message: "Error al obtener datos de usuarios" });
  }
});

app.post("/api/addUser", verifyToken(["0"]), async (req, res) => {
  const {
    name,
    email,
    type,
    suscription_plan,
    subscription_start_date,
    subscription_end_date,
  } = req.body;

  if (!name || !email || (!suscription_plan && type !== "0")) {
    return res
      .status(400)
      .json({ message: "Llena correctamente el formulario." });
  }

  const registerDate = new Date().toISOString().slice(0, 10);
  const password = crypto.randomBytes(8).toString("hex");
  const hashedPassword = crypto
    .createHash("md5")
    .update(password)
    .digest("hex");

  const userData = [
    name,
    email,
    type,
    suscription_plan || null,
    registerDate,
    hashedPassword,
  ];

  let query = `INSERT INTO users (name, email, type, suscription_plan, register_date, password`;
  if (suscription_plan === 2) {
    query += `, start_suscription, end_suscription`;
    userData.push(
      subscription_start_date || null,
      subscription_end_date || null
    );
  }
  query += `) VALUES (${userData.map(() => "?").join(", ")})`;

  try {
    await pool.query(query, userData);
    res.status(201).json({
      message: "Usuario agregado exitosamente",
      password: password,
    });
  } catch (error) {
    console.error("Error al agregar usuario:", error);
    res
      .status(500)
      .json({ message: "Error al agregar el usuario a la base de datos" });
  }
});

app.post("/api/updateUserCRUD", verifyToken(["0"]), async (req, res) => {
  const { id, name, email, suscription_plan, status } = req.body.selectedUser;

  try {
    await pool.query(
      `UPDATE users 
       SET name = ?, email = ?, suscription_plan = ?, status = ?
       WHERE id = ?`,
      [name, email, suscription_plan, status, id]
    );
    res.status(200).json({ message: "Usuario actualizado exitosamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar el usuario en la base de datos" });
  }
});

app.post("/api/deleteUser", verifyToken(["0"]), async (req, res) => {
  const { userId } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE users SET status = ? WHERE id = ?`,
      [2, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res
      .status(200)
      .json({ message: "Usuario eliminado lógicamente exitosamente" });
  } catch (error) {
    console.error("Error al realizar el borrado lógico del usuario:", error);
    res.status(500).json({
      message:
        "Error al realizar el borrado lógico del usuario en la base de datos",
    });
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
});
