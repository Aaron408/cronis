const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();
const moment = require("moment");

const app = express();
const PORT = process.env.ACTIVITIES_PORT || 5002;

app.use(express.json());
app.use(cors());

// Create a connection pool
const pool = mysql.createPool({
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectTimeout: 10000,
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

// Call the test function
testConnection();

app.get("/", (req, res) => {
  res.send("Activities service running!");
});

//--------------- TOKEN VERIFICATION ----------------//

const verifyToken = (allowedTypes) => async (req, res, next) => {
  console.log("Iniciando verificación de token");
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    console.log("Token no proporcionado");
    return res
      .status(401)
      .json({ message: "Acceso denegado. Token no proporcionado." });
  }

  console.log("Token recibido:", token);

  try {
    const [session] = await pool.query(
      `SELECT st.user_id, u.type, st.expires_date FROM session_token st JOIN users u on u.id = st.user_id WHERE token = ?`,
      [token]
    );

    console.log("Resultado de la consulta:", session);

    if (session.length === 0) {
      console.log("Token inválido o no encontrado");
      return res
        .status(401)
        .json({ message: "Token inválido o no encontrado." });
    }

    const sessionData = session[0];
    console.log("Datos de la sesión:", sessionData);

    const now = new Date();
    if (new Date(sessionData.expires_date) < now) {
      console.log("Token expirado");
      return res.status(401).json({ message: "Token ha expirado." });
    }

    if (!allowedTypes.includes(sessionData.type)) {
      console.log("Permisos insuficientes. Tipo de usuario:", sessionData.type);
      return res
        .status(403)
        .json({ message: "Acceso denegado. Permisos insuficientes." });
    }

    console.log("Token verificado exitosamente");
    req.user = { id: sessionData.user_id, type: sessionData.type };
    next();
  } catch (error) {
    console.error("Error en la verificación del token:", error);
    res
      .status(500)
      .json({ message: "Error al verificar el token.", error: error.message });
  }
};

//--------------- SCHEDULE ORDER ALGORITM ----------------//

async function scheduleActivities(userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener el horario laboral del usuario
    const [userWorkHours] = await connection.query(
      "SELECT start_time, end_time FROM users WHERE id = ?",
      [userId]
    );
    const { start_time, end_time } = userWorkHours[0];

    // 2. Obtener actividades puntuales del usuario
    const [punctualActivities] = await connection.query(
      `SELECT s.*, a.title FROM schedule s
       JOIN activity a ON a.id = s.activity_id
       WHERE s.user_id = ? AND s.type = 'Puntual' AND a.status NOT IN ('2', '3')
       ORDER BY s.date, s.start_time`,
      [userId]
    );

    // 3. Obtener actividades recurrentes del usuario
    const [recurringActivities] = await connection.query(
      `SELECT 
          a.id, 
          a.user_id, 
          a.importance, 
          a.start_date, 
          a.due_date, 
          a.status, 
          s.start_time, 
          s.end_time
      FROM 
          activity a
      LEFT JOIN 
          (
              SELECT 
                  activity_id, 
                  MIN(start_time) AS start_time, 
                  MAX(end_time) AS end_time
              FROM 
                  schedule
              WHERE 
                  type NOT IN ('Puntual', 'Descanso')
              GROUP BY 
                  activity_id
          ) s 
          ON a.id = s.activity_id
      WHERE 
          a.user_id = ? 
          AND a.status NOT IN ('2', '3')
      ORDER BY 
          a.importance DESC, 
          a.due_date ASC;
      ;
      `,
      [userId]
    );

    // 4. Determinar el rango de fechas para la programación
    const startDate = new Date(
      Math.min(
        ...recurringActivities.map((a) => new Date(a.start_date)),
        ...punctualActivities.map((a) => new Date(a.date))
      )
    );
    const endDate = new Date(
      Math.max(
        ...recurringActivities.map((a) => new Date(a.due_date)),
        ...punctualActivities.map((a) => new Date(a.date))
      )
    );

    // 5. Borrar actividades recurrentes existentes en el schedule
    await connection.query(
      `DELETE s FROM schedule s
       INNER JOIN activity a ON a.id = s.activity_id
       WHERE s.user_id = ? AND s.type = 'Recurrente' AND a.status NOT IN ('2', '3')`,
      [userId]
    );

    // 6. Programar actividades usando programación dinámica
    console.log(recurringActivities);
    const schedule = dynamicProgrammingSchedule(
      recurringActivities,
      punctualActivities,
      startDate,
      endDate,
      start_time,
      end_time
    );

    // 7. Guardar el nuevo horario en la base de datos
    for (const [date, activities] of Object.entries(schedule)) {
      for (const activity of activities) {
        await connection.query(
          `INSERT INTO schedule (user_id, activity_id, date, start_time, end_time, type, break_duration)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            activity.activityId,
            date,
            activity.start.format("HH:mm:ss"),
            activity.end.format("HH:mm:ss"),
            activity.type,
            activity.breakDuration || null,
          ]
        );
      }
    }

    await connection.commit();
    console.log("Actividades programadas exitosamente");
  } catch (error) {
    await connection.rollback();
    console.error("Error al programar actividades:", error);
    throw error;
  } finally {
    connection.release();
  }
}

function dynamicProgrammingSchedule(
  recurringActivities,
  punctualActivities,
  startDate,
  endDate,
  workStartTime,
  workEndTime
) {
  const schedule = {};
  const workStartMoment = moment(workStartTime, "HH:mm:ss");
  const workEndMoment = moment(workEndTime, "HH:mm:ss");
  const workDurationMinutes = workEndMoment.diff(workStartMoment, "minutes");

  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dateKey = moment(currentDate).format("YYYY-MM-DD");
    const availableSlots = getAvailableTimeSlots(
      currentDate,
      workStartTime,
      workEndTime,
      punctualActivities
    );

    // Inicializar la matriz de programación dinámica
    const dp = new Array(recurringActivities.length + 1)
      .fill(null)
      .map(() => new Array(workDurationMinutes + 1).fill(0));

    // Llenar la matriz de programación dinámica
    for (let i = 1; i <= recurringActivities.length; i++) {
      const activity = recurringActivities[i - 1];
      const activityDuration = calculateDuration(activity.importance);

      for (let j = 1; j <= workDurationMinutes; j++) {
        if (
          activityDuration <= j &&
          isActivityValidForDate(activity, currentDate)
        ) {
          dp[i][j] = Math.max(
            dp[i - 1][j],
            dp[i - 1][j - activityDuration] + activity.importance
          );
        } else {
          dp[i][j] = dp[i - 1][j];
        }
      }
    }

    // Reconstruir la solución óptima
    const optimalSchedule = [];
    let i = recurringActivities.length;
    let j = workDurationMinutes;

    while (i > 0 && j > 0) {
      if (dp[i][j] !== dp[i - 1][j]) {
        const activity = recurringActivities[i - 1];
        const activityDuration = calculateDuration(activity.importance);
        optimalSchedule.push({
          activityId: activity.id,
          duration: activityDuration,
          importance: activity.importance,
          title: activity.title,
        });
        j -= activityDuration;
      }
      i--;
    }

    // Asignar actividades a slots disponibles
    schedule[dateKey] = assignActivitiesToSlots(
      optimalSchedule,
      availableSlots
    );
  }

  return schedule;
}

function getAvailableTimeSlots(
  date,
  workStartTime,
  workEndTime,
  punctualActivities
) {
  const workStart = moment(date).set({
    hour: workStartTime.split(":")[0],
    minute: workStartTime.split(":")[1],
    second: 0,
  });
  const workEnd = moment(date).set({
    hour: workEndTime.split(":")[0],
    minute: workEndTime.split(":")[1],
    second: 0,
  });

  let availableSlots = [{ start: workStart, end: workEnd }];

  const activitiesForDay = punctualActivities.filter((activity) =>
    moment(activity.date).isSame(date, "day")
  );

  activitiesForDay.sort((a, b) =>
    moment(a.start_time, "HH:mm:ss").diff(moment(b.start_time, "HH:mm:ss"))
  );

  for (const activity of activitiesForDay) {
    const activityStart = moment(date).set({
      hour: activity.start_time.split(":")[0],
      minute: activity.start_time.split(":")[1],
      second: 0,
    });
    const activityEnd = moment(date).set({
      hour: activity.end_time.split(":")[0],
      minute: activity.end_time.split(":")[1],
      second: 0,
    });

    availableSlots = availableSlots.flatMap((slot) => {
      if (activityStart >= slot.end || activityEnd <= slot.start) {
        return [slot];
      }
      const newSlots = [];
      if (slot.start < activityStart) {
        newSlots.push({ start: slot.start, end: activityStart });
      }
      if (slot.end > activityEnd) {
        newSlots.push({ start: activityEnd, end: slot.end });
      }
      return newSlots;
    });
  }

  return insertRandomBreaks(availableSlots);
}

function insertRandomBreaks(slots) {
  const updatedSlots = [];
  for (const slot of slots) {
    let currentTime = moment(slot.start);
    while (currentTime < slot.end) {
      const nextBreakTime = moment(currentTime).add(
        Math.random() < 0.5 ? 1.5 : 3,
        "hours"
      );
      const breakDuration = Math.random() < 0.5 ? 15 : 20;

      if (nextBreakTime.isBefore(slot.end)) {
        if (moment.duration(nextBreakTime.diff(currentTime)).asMinutes() > 30) {
          updatedSlots.push({
            start: moment(currentTime),
            end: nextBreakTime,
            isAvailable: true,
          });
        }
        updatedSlots.push({
          start: nextBreakTime,
          end: moment(nextBreakTime).add(breakDuration, "minutes"),
          isBreak: true,
          breakDuration: breakDuration,
        });
        currentTime = moment(nextBreakTime).add(breakDuration, "minutes");
      } else {
        if (moment.duration(slot.end.diff(currentTime)).asMinutes() > 30) {
          updatedSlots.push({
            start: moment(currentTime),
            end: moment(slot.end),
            isAvailable: true,
          });
        }
        break;
      }
    }
  }
  return updatedSlots;
}

function isActivityValidForDate(activity, date) {
  const activityStart = moment(activity.start_date);
  const activityEnd = moment(activity.due_date);
  return moment(date).isBetween(activityStart, activityEnd, null, "[]");
}

function calculateDuration(importance) {
  return 30 + importance * 15; // 30 minutos base + 15 por cada nivel de importancia
}

function assignActivitiesToSlots(activities, availableSlots) {
  const schedule = [];
  let slotIndex = 0;

  for (const activity of activities) {
    let remainingDuration = activity.duration;

    while (remainingDuration > 0 && slotIndex < availableSlots.length) {
      const slot = availableSlots[slotIndex];

      if (slot.isBreak) {
        schedule.push({
          activityId: null,
          start: slot.start,
          end: slot.end,
          title: "Descanso",
          type: "Descanso",
          breakDuration: slot.breakDuration,
        });
        slotIndex++;
        continue;
      }

      const slotDuration = moment
        .duration(slot.end.diff(slot.start))
        .asMinutes();
      const allocatedTime = Math.min(remainingDuration, slotDuration);

      schedule.push({
        activityId: activity.activityId,
        start: moment(slot.start),
        end: moment(slot.start).add(allocatedTime, "minutes"),
        title: activity.title,
        type: "Recurrente",
      });

      remainingDuration -= allocatedTime;
      slot.start = moment(slot.start).add(allocatedTime, "minutes");

      if (slot.start.isSame(slot.end)) {
        slotIndex++;
      }
    }
  }

  return schedule.sort((a, b) => a.start.diff(b.start));
}

// Ejemplo de uso
scheduleActivities(95).catch(console.error);

//--------------- ACTIVITIES PAGE ----------------//

app.get("/api/userActivities", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await pool.query(
      `SELECT 
          a.id,
          a.user_id,
          a.title,
          a.description,
          a.importance,
          DATE_FORMAT(a.start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
          a.status,
          a.created,
          a.updated,
          s.id AS schedule_id,
          s.type,
          s.break_duration,
          DATE_FORMAT(s.date, '%Y-%m-%d') AS date,
          TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
          TIME_FORMAT(s.end_time, '%H:%i') AS end_time
      FROM 
          activity a
      LEFT JOIN 
          (SELECT 
              activity_id, 
              id, 
              type, 
              break_duration, 
              date, 
              start_time, 
              end_time
          FROM 
              schedule
          WHERE 
              type NOT IN ('Puntual', 'Descanso')
          GROUP BY 
              activity_id
          ORDER BY 
              date DESC) s
      ON 
          a.id = s.activity_id
      WHERE 
          a.user_id = ? 
          AND a.status NOT IN ("2", "3");
      `,
      [userId]
    );

    res.status(200).json(results.length > 0 ? results : []);
  } catch (error) {
    console.error("Error al obtener actividades del usuario:", error);
    res
      .status(500)
      .json({ message: "Error al obtener actividades del usuario" });
  }
});

app.post("/api/addActivity", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const newEvent = req.body;

  const connection = await pool.getConnection();
  try {
    // Verificar límite de actividades antes de proceder
    const [limitCheckResult] = await connection.query(
      `
      SELECT 
        sp.max_activities AS maxActivities,
        COUNT(a.id) AS activeActivities
      FROM users u
      JOIN subscription_plan sp ON u.suscription_plan = sp.id
      LEFT JOIN activity a 
        ON u.id = a.user_id 
        AND a.status NOT IN ('2', '3')
      WHERE u.id = ?
      GROUP BY sp.max_activities
      `,
      [userId]
    );

    if (limitCheckResult.length === 0) {
      return res
        .status(404)
        .json({ message: "Usuario o plan de suscripción no encontrado" });
    }

    const { maxActivities, activeActivities } = limitCheckResult[0];

    if (activeActivities >= maxActivities) {
      return res.status(403).json({
        message:
          "No puedes agregar más actividades. Has alcanzado el límite máximo de tu plan.",
      });
    }

    // Verificar si el usuario ha configurado su horario laboral
    const [userWorkHours] = await connection.query(
      "SELECT start_time, end_time FROM users WHERE id = ?",
      [userId]
    );

    if (!userWorkHours[0].start_time || !userWorkHours[0].end_time) {
      return res.status(400).json({
        message:
          "Debe configurar su horario de trabajo antes de agregar actividades",
      });
    }

    // Si la actividad es puntual, verificar que esté dentro del horario laboral
    if (newEvent.type === "Puntual") {
      const activityStartTime = new Date(`1970-01-01T${newEvent.start_time}`);
      const activityEndTime = new Date(`1970-01-01T${newEvent.end_time}`);
      const workStartTime = new Date(
        `1970-01-01T${userWorkHours[0].start_time}`
      );
      const workEndTime = new Date(`1970-01-01T${userWorkHours[0].end_time}`);

      if (activityStartTime < workStartTime || activityEndTime > workEndTime) {
        return res.status(400).json({
          message: "La actividad debe estar dentro de su horario laboral",
        });
      }

      // Verificar si hay conflictos con otras actividades puntuales
      const [conflictingEvents] = await connection.query(
        `SELECT * FROM schedule 
         WHERE user_id = ? 
         AND date = ? 
         AND type = 'Puntual'
         AND (
           (start_time < ? AND end_time > ?) OR
           (start_time < ? AND end_time > ?) OR
           (start_time >= ? AND end_time <= ?) OR
           (? < end_time AND ? > start_time)
         )`,
        [
          userId,
          newEvent.date,
          newEvent.start_time,
          newEvent.start_time,
          newEvent.end_time,
          newEvent.end_time,
          newEvent.start_time,
          newEvent.end_time,
          newEvent.start_time,
          newEvent.end_time,
        ]
      );

      if (conflictingEvents.length > 0) {
        return res.status(409).json({
          message:
            "Ya existe un evento que se superpone con el horario seleccionado en la fecha indicada",
        });
      }
    }

    // Inicia la transacción
    await connection.beginTransaction();

    // Insertar la actividad
    const [activityResult] = await connection.query(
      `INSERT INTO activity (user_id, title, description, importance, status, start_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        newEvent.title,
        newEvent.description,
        newEvent.type === "Puntual" ? null : newEvent.importance,
        newEvent.status,
        newEvent.type === "Puntual" ? newEvent.date : newEvent.start_date,
        newEvent.type === "Puntual" ? newEvent.date : newEvent.due_date,
      ]
    );

    const activityId = activityResult.insertId;

    // Insertar en la tabla `schedule` si la actividad es puntual
    if (newEvent.type === "Puntual") {
      await connection.query(
        `INSERT INTO schedule (activity_id, user_id, date, start_time, end_time, type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          activityId,
          userId,
          newEvent.date,
          newEvent.start_time,
          newEvent.end_time,
          "Puntual",
        ]
      );
    } else {
      // Ejemplo de uso
      scheduleActivities(userId).catch(console.error);
    }

    // Confirmar transacción
    await connection.commit();
    res
      .status(201)
      .json({ message: "Actividad agregada exitosamente", activityId });
  } catch (error) {
    await connection.rollback();
    console.error("Error al agregar actividad:", error);
    res
      .status(500)
      .json({ message: "Error al agregar actividad", error: error.message });
  } finally {
    connection.release();
  }
});

app.post("/api/updateActivities", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const editingEvent = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE activity 
       SET title = ?, description = ?, importance = ?, status = ?, start_date = ?, due_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        editingEvent.title,
        editingEvent.description,
        editingEvent.importance,
        editingEvent.status,
        editingEvent.type === "Puntual"
          ? editingEvent.date
          : editingEvent.start_date,
        editingEvent.type === "Puntual"
          ? editingEvent.date
          : editingEvent.due_date,
        editingEvent.id,
        userId,
      ]
    );

    const [scheduleResults] = await connection.query(
      `SELECT * FROM schedule WHERE activity_id = ?`,
      [editingEvent.id]
    );

    if (editingEvent.type === "Puntual") {
      const scheduleData = [
        editingEvent.date,
        editingEvent.start_time,
        editingEvent.end_time,
        editingEvent.id,
      ];

      if (scheduleResults.length > 0) {
        await connection.query(
          `UPDATE schedule SET date = ?, start_time = ?, end_time = ? WHERE activity_id = ?`,
          scheduleData
        );
      } else {
        await connection.query(
          `INSERT INTO schedule (date, start_time, end_time, activity_id, type) VALUES (?, ?, ?, ?, 'Puntual')`,
          scheduleData
        );
      }
    } else if (scheduleResults.length > 0) {
      await connection.query(`DELETE FROM schedule WHERE activity_id = ?`, [
        editingEvent.id,
      ]);
    }

    await connection.commit();
    res.status(200).json({ message: "Actividad actualizada con éxito" });
  } catch (error) {
    await connection.rollback();
    console.error("Error al actualizar la actividad:", error);
    res.status(500).json({
      message: "Error al actualizar la actividad",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

app.post("/api/deleteActivity", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const { activityId } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `DELETE FROM schedule WHERE activity_id = ? AND user_id = ?`,
      [activityId, userId]
    );

    await connection.query(
      `UPDATE activity SET status = '3' WHERE id = ? AND user_id = ?`,
      [activityId, userId]
    );

    await connection.commit();
    res.status(200).json({ message: "Actividad eliminada exitosamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error al eliminar la actividad:", error);
    res.status(500).json({
      message: "Error al eliminar la actividad",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

//--------------- HISTORY PAGE ----------------//

app.get("/api/history", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await pool.query(
      `SELECT 
          a.id,
          a.user_id,
          a.title,
          a.description,
          a.importance,
          DATE_FORMAT(a.start_date, '%Y-%m-%d') AS start_date,
          DATE_FORMAT(a.due_date, '%Y-%m-%d') AS due_date,
          a.status,
          a.created,
          a.updated,
          s.id AS schedule_id,
          s.type,
          s.break_duration,
          DATE_FORMAT(s.date, '%Y-%m-%d') AS date,
          TIME_FORMAT(s.start_time, '%H:%i') AS start_time,
          TIME_FORMAT(s.end_time, '%H:%i') AS end_time
      FROM 
          activity a
      LEFT JOIN 
          (
              SELECT 
                  schedule.activity_id,
                  MIN(schedule.id) AS schedule_id
              FROM 
                  schedule
              GROUP BY schedule.activity_id
          ) subquery ON a.id = subquery.activity_id
      LEFT JOIN 
          schedule s ON subquery.schedule_id = s.id
      WHERE 
          a.user_id = ? AND a.status = "2";
`,
      [userId]
    );

    res.status(200).json(results.length > 0 ? results : []);
  } catch (error) {
    console.error("Error al obtener el historial de actividades:", error);
    res
      .status(500)
      .json({ message: "Error al obtener el historial de actividades" });
  }
});

//--------------- USERS CRUD PAGE ----------------//

app.get("/api/plans", verifyToken(["0"]), async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT id, name FROM subscription_plan`
    );
    res.status(200).json(results.length > 0 ? results : []);
  } catch (error) {
    console.error("Error al obtener los planes:", error);
    res.status(500).json({ message: "Error al obtener los planes" });
  }
});

//--------------- HOME PAGE ----------------//

app.get("/api/schedule", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;
  const { date } = req.query;

  try {
    const [results] = await pool.query(
      `SELECT 
        s.id AS schedule_id,
        s.date,
        s.start_time,
        s.end_time,
        s.break_duration,
        a.id AS activity_id,
        a.title,
        a.description
      FROM 
        schedule s
      RIGHT JOIN 
        activity a ON s.activity_id = a.id
      WHERE 
        s.user_id = ? 
        AND a.status NOT IN ("2", "3")
        AND s.date = ?
      ORDER BY 
        s.date, s.start_time`,
      [userId, date]
    );

    res.status(200).json(results.length > 0 ? results : []);
  } catch (error) {
    console.error("Error al obtener la agenda del usuario:", error);
    res.status(500).json({ message: "Error al obtener la agenda del usuario" });
  }
});

app.get("/api/activitiesData", verifyToken(["1"]), async (req, res) => {
  const userId = req.user.id;

  try {
    const [results] = await pool.query(
      `
      SELECT 
        sp.max_activities AS maxActivities,
        COUNT(a.id) AS activeActivities
      FROM users u
      JOIN subscription_plan sp ON u.suscription_plan = sp.id
      LEFT JOIN activity a 
        ON u.id = a.user_id 
      WHERE u.id = ? AND a.status NOT IN ('2', '3')
      GROUP BY sp.max_activities
      `,
      [userId]
    );

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "Usuario o plan de suscripción no encontrado" });
    }

    const { maxActivities, activeActivities } = results[0];

    // Comparar los valores
    if (activeActivities >= maxActivities) {
      return res.status(403).json({
        message: "Has alcanzado el límite máximo de actividades para tu plan.",
      });
    }

    res.status(200).json({ message: "Puedes abrir el modal" });
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error);
    res.status(500).json({ message: "Error al obtener datos del usuario" });
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Activities service running on port ${PORT}`);
});
