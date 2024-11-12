const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const crypto = require("crypto");

require("dotenv").config();

const app = express();
const PORT = process.env.USER_PORT || 5001;

app.use(express.json());

// Activar CORS
app.use(cors());

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

const verifyToken = (allowedTypes) => (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  db.query(
    `SELECT st.user_id, u.type, st.expires_date FROM session_token st JOIN users u on u.id = st.user_id WHERE token = ?`,
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

      const sessionData = session[0];
      const now = new Date();
      if (new Date(sessionData.expires_date) < now) {
        return res.status(401).json({ message: "Token ha expirado." });
      }

      // Verifica si el tipo de usuario está permitido
      if (!allowedTypes.includes(sessionData.type)) {
        return res
          .status(403)
          .json({ message: "Acceso denegado. Permisos insuficientes." });
      }

      // Si todo está bien, pasa al siguiente middleware
      req.user = { id: sessionData.user_id, type: sessionData.type };
      next();
    }
  );
};

//----------------- PROFILE PAGE -----------------//

app.post("/api/updateUser", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;
  const { updateData } = req.body;
  const currentPassword = updateData.currentPassword;
  const newPassword = updateData.newPassword;

  if (currentPassword && newPassword) {
    const hashedPassword = crypto
      .createHash("md5")
      .update(currentPassword)
      .digest("hex");

    const selectPasswordQuery = `SELECT password FROM users WHERE id = ?`;

    db.query(selectPasswordQuery, userId, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ error: "Internal server error" });
      } else {
        if (results.length > 0 && hashedPassword === results[0].password) {
          const hashedNewPassword = crypto
            .createHash("md5")
            .update(newPassword)
            .digest("hex");

          // Eliminar las contraseñas de updateData para construir la consulta de actualización
          delete updateData.currentPassword;
          delete updateData.newPassword;

          // Añadir la nueva contraseña al objeto updateData
          updateData.password = hashedNewPassword;

          // Construir la consulta de actualización dinámica
          const updateQuery = `UPDATE users SET ? WHERE id = ?`;

          db.query(updateQuery, [updateData, userId], (err, result) => {
            if (err) {
              console.error("Error updating user:", err);
              return res.status(500).json({ error: "Failed to update user" });
            }
            return res
              .status(200)
              .json({ message: "User updated successfully" });
          });
        } else {
          // Las contraseñas no coinciden
          return res.status(400).json({ error: "Incorrect current password" });
        }
      }
    });
  } else {
    const updateQuery = `UPDATE users SET ? WHERE id = ?`;

    db.query(updateQuery, [updateData, userId], (err, result) => {
      if (err) {
        console.error("Error updating user:", err);
        return res.status(500).json({ error: "Failed to update user" });
      }
      return res.status(200).json({ message: "User updated successfully" });
    });
  }
});

app.get("/api/userData", verifyToken(["1", "0"]), (req, res) => {
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

//---------------- DASHBOARD PAGE -----------------//
app.get("/api/adminData", verifyToken(["0"]), (req, res) => {
  const userId = req.user.id;

  db.query(
    "SELECT name, email, profile_picture_url FROM users WHERE id = ?",
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

app.get("/api/userStatistics", verifyToken(["0"]), (req, res) => {
  const queryTotalUsers = `SELECT COUNT(*) AS total FROM users WHERE status != '2'`;
  const queryPreviousMonthUsers = `
    SELECT COUNT(*) AS previousMonth 
    FROM users 
    WHERE status = '0' 
      AND register_date <= LAST_DAY(CURDATE() - INTERVAL 1 MONTH)`;
  const queryCurrentMonthUsers = `
    SELECT COUNT(*) AS currentMonth 
    FROM users 
    WHERE status = '0' 
      AND MONTH(register_date) = MONTH(CURDATE()) 
      AND YEAR(register_date) = YEAR(CURDATE())`;

  db.query(queryTotalUsers, (error, totalResults) => {
    if (error)
      return res
        .status(500)
        .json({ message: "Error al obtener el total de usuarios" });

    db.query(queryPreviousMonthUsers, (error, previousResults) => {
      if (error)
        return res
          .status(500)
          .json({ message: "Error al obtener usuarios del mes anterior" });

      db.query(queryCurrentMonthUsers, (error, currentResults) => {
        if (error)
          return res
            .status(500)
            .json({ message: "Error al obtener usuarios del mes actual" });

        const total = totalResults[0].total;
        const previousMonth = previousResults[0].previousMonth;
        const currentMonth = currentResults[0].currentMonth;

        const percentageChange =
          previousMonth > 0
            ? ((currentMonth - previousMonth) / previousMonth) * 100
            : currentMonth > 0
            ? 100
            : 0;

        res.status(200).json({
          totalUsers: total,
          previousMonthUsers: previousMonth,
          currentMonthUsers: currentMonth,
          percentageChange: percentageChange.toFixed(2),
        });
      });
    });
  });
});

app.get("/api/graphicsData", verifyToken(["0"]), (req, res) => {
  const query = `
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

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error al obtener los datos del gráfico:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener los datos del gráfico" });
    }
    // Devuelve los datos al frontend
    res.status(200).json({ data: results });
  });
});

//---------------- USERS CRUD PAGE -----------------//
app.get("/api/users", verifyToken(["0"]), (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT us.id, us.name, us.email, us.profile_picture_url AS imgUrl, 
            sp.id AS suscription_plan,
            DATE_FORMAT(us.register_date, '%Y-%m-%d') AS register,
            us.type AS rol,
            us.status
     FROM users us 
     LEFT JOIN subscription_plan sp ON us.suscription_plan = sp.id
     WHERE us.status != '2';
      ;`,
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Error al obtener datos de usuarios" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "No hay usuarios que mostrar" });
      }

      res.status(200).json(results);
    }
  );
});

app.post("/api/addUser", verifyToken(["0"]), (req, res) => {
  const {
    name,
    email,
    type,
    suscription_plan,
    subscription_start_date,
    subscription_end_date,
  } = req.body;

  // Validaciones para el formulario
  if (!name || !email || (!suscription_plan && type !== "1")) {
    return res
      .status(400)
      .json({ message: "Llena correctamente el formulario." });
  }

  const registerDate = new Date().toISOString().slice(0, 10); // Fecha de registro en formato 'YYYY-MM-DD'

  // Generar contraseña aleatoria
  const password = crypto.randomBytes(8).toString("hex");
  const hashedPassword = crypto
    .createHash("md5")
    .update(password)
    .digest("hex");

  // Preparar los datos para la inserción
  const userData = [
    name,
    email,
    type,
    suscription_plan || null,
    registerDate,
    hashedPassword,
  ];

  // Agregar fechas de suscripción si el plan es premium (asumiendo que el ID del plan premium es "2")
  let query = `INSERT INTO users (name, email, type, suscription_plan, register_date, password`;
  if (suscription_plan === 2) {
    query += `, start_suscription, end_suscription`;
    userData.push(
      subscription_start_date || null,
      subscription_end_date || null
    );
  }
  query += `) VALUES (?, ?, ?, ?, ?, ?`;
  if (suscription_plan === 2) {
    query += `, ?, ?`;
  }
  query += `)`;

  // Insertar nuevo usuario en la base de datos
  db.query(query, userData, (error, results) => {
    if (error) {
      console.error("Error al agregar usuario:", error);
      return res
        .status(500)
        .json({ message: "Error al agregar el usuario a la base de datos" });
    }
    res.status(201).json({
      message: "Usuario agregado exitosamente",
      password: password, // Enviar la contraseña sin hash al cliente
    });
  });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
});
