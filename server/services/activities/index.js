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
          COALESCE(s.start_time, NULL) AS start_time, 
          COALESCE(s.end_time, NULL) AS end_time
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
          AND a.id NOT IN (
              SELECT DISTINCT activity_id
              FROM schedule
              WHERE type = 'Puntual'
          )
      ORDER BY 
          a.importance DESC, 
          a.due_date ASC
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
        LEFT JOIN activity a ON a.id = s.activity_id
        WHERE s.user_id = ? AND (s.type IN ('Recurrente', 'Descanso') OR (s.type = 'Recurrente' AND a.status NOT IN ('2', '3')))`,
      [userId]
    );

    // 6. Programar actividades usando programación dinámica
    console.log("Recurrentes: ", recurringActivities);
    console.log("Puntuales: ", punctualActivities);
    const schedule = improvedDynamicProgrammingSchedule(
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

function improvedDynamicProgrammingSchedule(
  recurringActivities,
  punctualActivities,
  startDate,
  endDate,
  workStartTime,
  workEndTime
) {
  console.log("Starting improvedDynamicProgrammingSchedule");
  console.log("Recurring Activities:", JSON.stringify(recurringActivities));
  console.log("Punctual Activities:", JSON.stringify(punctualActivities));

  const schedule = {};
  const workStartMoment = moment(workStartTime, "HH:mm:ss");
  const workEndMoment = moment(workEndTime, "HH:mm:ss");
  const recentlyScheduledActivities = new Set();

  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    const dateKey = moment(currentDate).format("YYYY-MM-DD");
    console.log(`Processing date: ${dateKey}`);

    const availableSlots = getAvailableTimeSlots(
      currentDate,
      workStartTime,
      workEndTime,
      punctualActivities
    );
    console.log("Available slots:", JSON.stringify(availableSlots));

    const activitiesForDay = recurringActivities.filter((activity) =>
      isActivityValidForDate(activity, currentDate)
    );
    console.log("Activities for day:", JSON.stringify(activitiesForDay));

    // Prioritize activities that haven't been scheduled recently
    activitiesForDay.sort((a, b) => {
      if (
        recentlyScheduledActivities.has(a.id) &&
        !recentlyScheduledActivities.has(b.id)
      )
        return 1;
      if (
        !recentlyScheduledActivities.has(a.id) &&
        recentlyScheduledActivities.has(b.id)
      )
        return -1;
      return b.importance - a.importance;
    });

    schedule[dateKey] = distributeActivitiesEvenly(
      activitiesForDay,
      availableSlots,
      workStartMoment,
      workEndMoment
    );

    // Update recently scheduled activities
    schedule[dateKey].forEach((activity) => {
      if (activity.type === "Recurrente") {
        recentlyScheduledActivities.add(activity.activityId);
      }
    });

    // Remove activities from the set if they're more than 2 days old
    if (recentlyScheduledActivities.size > activitiesForDay.length * 2) {
      const oldestActivities = [...recentlyScheduledActivities].slice(
        0,
        activitiesForDay.length
      );
      oldestActivities.forEach((id) => recentlyScheduledActivities.delete(id));
    }
  }

  console.log("Final schedule:", JSON.stringify(schedule, null, 2));
  return schedule;
}

function distributeActivitiesEvenly(
  activities,
  availableSlots,
  workStartMoment,
  workEndMoment
) {
  console.log("Starting distributeActivitiesEvenly");
  console.log("Activities:", JSON.stringify(activities));
  console.log("Available slots:", JSON.stringify(availableSlots));

  const schedule = [];
  let totalAvailableTime = availableSlots.reduce(
    (sum, slot) => sum + moment.duration(slot.end.diff(slot.start)).asMinutes(),
    0
  );
  console.log("Total available time:", totalAvailableTime);

  const totalImportance = activities.reduce(
    (sum, activity) => sum + (activity.importance + 1),
    0
  );
  console.log("Total importance:", totalImportance);

  const activityTimeAllocation = activities.map((activity) => ({
    ...activity,
    allocatedTime: Math.max(
      30,
      Math.floor(
        ((activity.importance + 1) / totalImportance) * totalAvailableTime
      )
    ),
  }));
  console.log(
    "Activity time allocation:",
    JSON.stringify(activityTimeAllocation)
  );

  let slotIndex = 0;
  let activityIndex = 0;
  let lastActivityId = null;
  let currentBlockDuration = 0;
  let lastBreakEnd = null;

  while (slotIndex < availableSlots.length) {
    const slot = availableSlots[slotIndex];
    console.log(`Processing slot: ${JSON.stringify(slot)}`);

    // No breaks in the first 2.5 hours
    if (moment.duration(slot.start.diff(workStartMoment)).asHours() < 2.5) {
      console.log("Within first 2.5 hours, no breaks");
      if (activityIndex >= activityTimeAllocation.length) {
        console.log("No more activities to schedule");
        break;
      }
      const activity = activityTimeAllocation[activityIndex];
      console.log(activity);
      const slotDuration = moment
        .duration(slot.end.diff(slot.start))
        .asMinutes();
      let allocatedTime = Math.min(activity.allocatedTime, slotDuration);

      console.log(
        `Scheduling activity ${activity.id} for ${allocatedTime} minutes`
      );
      schedule.push({
        activityId: activity.id,
        start: moment(slot.start),
        end: moment(slot.start).add(allocatedTime, "minutes"),
        title: activity.title || `Activity ${activity.id}`,
        type: "Recurrente",
      });

      activity.allocatedTime -= allocatedTime;
      if (activity.allocatedTime <= 0) {
        activityIndex++;
      }

      slot.start = moment(slot.start).add(allocatedTime, "minutes");
      if (slot.start.isSame(slot.end)) {
        slotIndex++;
      }
      continue;
    }

    if (
      shouldInsertBreak(
        schedule,
        currentBlockDuration,
        lastBreakEnd,
        slot.start
      )
    ) {
      console.log("Inserting break");
      const breakDuration = 15; // Fixed break duration

      schedule.push({
        activityId: null,
        start: moment(slot.start),
        end: moment(slot.start).add(breakDuration, "minutes"),
        title: "Descanso",
        type: "Descanso",
        breakDuration: breakDuration,
      });
      slot.start = moment(slot.start).add(breakDuration, "minutes");
      currentBlockDuration = 0;
      lastActivityId = null;
      lastBreakEnd = moment(slot.start);
      continue;
    }

    if (activityIndex >= activityTimeAllocation.length) {
      console.log("No more activities to schedule");
      break;
    }
    const activity = activityTimeAllocation[activityIndex];
    const slotDuration = moment.duration(slot.end.diff(slot.start)).asMinutes();
    let allocatedTime = Math.min(activity.allocatedTime, slotDuration);

    console.log(
      `Scheduling activity ${activity.id} for ${allocatedTime} minutes`
    );

    // Ensure minimum activity duration of 30 minutes, unless it's filling a small gap
    if (allocatedTime < 30 && slotDuration >= 30) {
      allocatedTime = 30;
    }

    // Limit block size to 3 hours
    if (currentBlockDuration + allocatedTime > 180) {
      allocatedTime = 180 - currentBlockDuration;
    }

    if (
      activity.id === lastActivityId &&
      currentBlockDuration + allocatedTime <= 180
    ) {
      // Extend the previous activity block
      const lastActivity = schedule[schedule.length - 1];
      lastActivity.end = moment(slot.start).add(allocatedTime, "minutes");
      currentBlockDuration += allocatedTime;
    } else {
      // Start a new activity block
      schedule.push({
        activityId: activity.id,
        start: moment(slot.start),
        end: moment(slot.start).add(allocatedTime, "minutes"),
        title: activity.title || `Activity ${activity.id}`,
        type: "Recurrente",
      });
      lastActivityId = activity.id;
      currentBlockDuration = allocatedTime;
    }

    activity.allocatedTime -= allocatedTime;
    if (activity.allocatedTime <= 0) {
      activityIndex++;
    }

    slot.start = moment(slot.start).add(allocatedTime, "minutes");
    if (slot.start.isSame(slot.end)) {
      slotIndex++;
    }
  }

  console.log("Final schedule for the day:", JSON.stringify(schedule));
  return schedule.sort((a, b) => a.start.diff(b.start));
}

function shouldInsertBreak(
  schedule,
  currentBlockDuration,
  lastBreakEnd,
  currentTime
) {
  if (schedule.length === 0) return false;
  const lastActivity = schedule[schedule.length - 1];
  const timeSinceLastBreak = lastBreakEnd
    ? moment(currentTime).diff(lastBreakEnd, "minutes")
    : Infinity;
  return (
    (lastActivity.type !== "Descanso" && timeSinceLastBreak >= 120) ||
    currentBlockDuration >= 180
  );
}

function isActivityValidForDate(activity, date) {
  const activityStart = moment(activity.start_date);
  const activityEnd = moment(activity.due_date);
  return moment(date).isBetween(activityStart, activityEnd, null, "[]");
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

  return availableSlots;
}

function isActivityValidForDate(activity, date) {
  const activityStart = moment(activity.start_date);
  const activityEnd = moment(activity.due_date);
  return moment(date).isBetween(activityStart, activityEnd, null, "[]");
}

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
      return res.status(404).json({
        message: "Usuario o plan de suscripción no encontrado",
        errorCode: "USER_OR_PLAN_NOT_FOUND",
      });
    }

    const { maxActivities, activeActivities } = limitCheckResult[0];

    if (activeActivities >= maxActivities) {
      return res.status(403).json({
        message:
          "No puedes agregar más actividades. Has alcanzado el límite máximo de tu plan.",
        errorCode: "ACTIVITY_LIMIT_REACHED",
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
        errorCode: "WORK_HOURS_NOT_SET",
      });
    }

    // Si la actividad es puntual, realizar verificaciones adicionales
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
          errorCode: "ACTIVITY_OUTSIDE_WORK_HOURS",
        });
      }

      // Verificar si hay conflictos con otras actividades
      const [conflictingEvents] = await connection.query(
        `SELECT * FROM schedule 
         WHERE user_id = ? 
         AND date = ? 
         AND (
           (start_time < ? AND end_time > ?) OR
           (start_time < ? AND end_time > ?) OR
           (start_time >= ? AND end_time <= ?)
         )`,
        [
          userId,
          newEvent.date,
          newEvent.end_time,
          newEvent.start_time,
          newEvent.end_time,
          newEvent.start_time,
          newEvent.start_time,
          newEvent.end_time,
        ]
      );

      if (conflictingEvents.length > 0) {
        // Verificar si hay conflicto con una actividad puntual
        const punctualConflict = conflictingEvents.some(
          (event) => event.type === "Puntual"
        );
        if (punctualConflict) {
          return res.status(409).json({
            message:
              "Ya existe una actividad puntual que se superpone con el horario seleccionado",
            errorCode: "PUNCTUAL_ACTIVITY_CONFLICT",
          });
        }

        // Si hay conflictos solo con actividades recurrentes o descansos, ajustar sus tiempos
        await connection.beginTransaction();

        for (const event of conflictingEvents) {
          if (event.start_time < newEvent.start_time) {
            await connection.query(
              "UPDATE schedule SET end_time = ? WHERE id = ?",
              [newEvent.start_time, event.id]
            );
          } else if (event.end_time > newEvent.end_time) {
            await connection.query(
              "UPDATE schedule SET start_time = ? WHERE id = ?",
              [newEvent.end_time, event.id]
            );
          } else {
            // Si la actividad está completamente solapada, eliminarla
            await connection.query("DELETE FROM schedule WHERE id = ?", [
              event.id,
            ]);
          }
        }
      }
    }

    // Insertar la nueva actividad
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
        newEvent.type,
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
      await scheduleActivities(userId);
    }

    // Confirmar transacción
    await connection.commit();
    res
      .status(201)
      .json({ message: "Actividad agregada exitosamente", activityId });
  } catch (error) {
    await connection.rollback();
    console.error("Error al agregar actividad:", error);
    res.status(500).json({
      message: "Error al agregar actividad",
      error: error.message,
      errorCode: "INTERNAL_SERVER_ERROR",
    });
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

    // Fetch the original activity data
    const [originalActivity] = await connection.query(
      `SELECT 
          s.type, 
          a.start_date, 
          a.due_date 
      FROM 
          activity a
      JOIN 
          schedule s 
      ON 
          s.activity_id = a.id
      WHERE 
          a.id = ? 
      AND 
          a.user_id = ?;
`,
      [editingEvent.id, userId]
    );

    if (originalActivity.length === 0) {
      return res.status(404).json({ message: "Activity not found" });
    }

    const wasRecurrent = originalActivity[0].type === "Recurrente";

    // Actualizar la actividad
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

    // Obtener todos los registros de la actividad en la agenda
    const [scheduleResults] = await connection.query(
      `SELECT * FROM schedule WHERE activity_id = ?`,
      [editingEvent.id]
    );

    let needRescheduling = false;

    if (editingEvent.type === "Puntual") {
      if (scheduleResults.length > 1) {
        // Si hay multiples registros se borran todos menos uno
        await connection.query(
          `DELETE FROM schedule WHERE activity_id = ? AND id NOT IN (SELECT id FROM (SELECT MIN(id) as id FROM schedule WHERE activity_id = ?) as temp)`,
          [editingEvent.id, editingEvent.id]
        );
        needRescheduling = true;
      }

      // Data para la actividad
      const scheduleData = [
        editingEvent.date,
        editingEvent.start_time,
        editingEvent.end_time,
        editingEvent.id,
        userId,
        "Puntual",
      ];

      if (scheduleResults.length > 0) {
        await connection.query(
          `UPDATE schedule SET date = ?, start_time = ?, end_time = ?, user_id = ?, type = ? WHERE activity_id = ?`,
          [...scheduleData, editingEvent.id]
        );
      } else {
        await connection.query(
          `INSERT INTO schedule (date, start_time, end_time, activity_id, user_id, type) VALUES (?, ?, ?, ?, ?, ?)`,
          scheduleData
        );
      }
      needRescheduling = true;
    } else {
      // Si el type no es "Puntual", se borran todos los registros de schedule de dicha actividad.
      if (scheduleResults.length > 0) {
        await connection.query(`DELETE FROM schedule WHERE activity_id = ?`, [
          editingEvent.id,
        ]);
        needRescheduling = true;
      }

      // Revisar si la actividad era y se mantiene como "Recurrente". Y si las fechas cambiaron.
      if (
        wasRecurrent &&
        editingEvent.type === "Recurrente" &&
        (originalActivity[0].start_date !== editingEvent.start_date ||
          originalActivity[0].due_date !== editingEvent.due_date)
      ) {
        needRescheduling = true;
      }
    }

    await connection.commit();

    // En caso de que se hayan cumplido condiciones deberá acomodarse la agenda nuevamente.
    if (needRescheduling) {
      scheduleActivities(userId).catch(console.error);
    }

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
    scheduleActivities(userId).catch(console.error);

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
        s.type,
        COALESCE(a.id, 0) AS activity_id,
        COALESCE(a.title, 'Descanso') AS title,
        COALESCE(a.description, 'Tiempo de descanso') AS description
      FROM 
        schedule s
      LEFT JOIN 
        activity a ON s.activity_id = a.id
      WHERE 
        s.user_id = ? 
        AND s.date = ?
        AND (a.status NOT IN ("2", "3") OR a.status IS NULL)
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
      JOIN subscription_plan sp 
          ON u.suscription_plan = sp.id
      LEFT JOIN activity a 
          ON u.id = a.user_id AND a.status NOT IN ('2', '3')
      WHERE u.id = ?
      GROUP BY sp.max_activities;

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
