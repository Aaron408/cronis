const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

require("dotenv").config();

const app = express();
const PORT = process.env.ACTIVITIES_PORT || 5002;

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

//--------------- TOKEN VERIFICATION ----------------//

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

//--------------- ACTIVITIES PAGE ----------------//

app.get("/api/userActivities", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;

  db.query(
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
      schedule s ON a.id = s.activity_id
    WHERE 
      a.user_id = ? AND a.status NOT IN ("2", "3")`,
    [userId],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Error al obtener actividades del usuario" });
      }

      res.status(200).json(results.length > 0 ? results : []);
    }
  );
});

// Endpoint para agregar actividades
app.post("/api/addActivity", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;
  const newEvent = req.body;

  db.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error al iniciar la transacción" });
    }

    // Insertar la actividad
    const activityQuery = `
      INSERT INTO activity (user_id, title, description, importance, status, start_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const activityValues = [
      userId,
      newEvent.title,
      newEvent.description,
      newEvent.type === "Puntual" ? null : newEvent.importance,
      newEvent.status,
      newEvent.type === "Puntual" ? newEvent.date : newEvent.start_date,
      newEvent.type === "Puntual" ? newEvent.date : newEvent.due_date,
    ];

    db.query(activityQuery, activityValues, (error, activityResult) => {
      if (error) {
        return db.rollback(() => {
          res
            .status(500)
            .json({
              message: "Error al insertar la actividad",
              error: error.message,
            });
        });
      }

      const activityId = activityResult.insertId;

      // Si es una actividad de tipo puntual, insertar en la tabla schedule
      if (newEvent.type === "Puntual") {
        const scheduleQuery = `
          INSERT INTO schedule (activity_id, user_id, date, start_time, end_time, type)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const scheduleValues = [
          activityId,
          userId,
          newEvent.date,
          newEvent.start_time,
          newEvent.end_time,
          "Puntual",
        ];

        db.query(scheduleQuery, scheduleValues, (error) => {
          if (error) {
            return db.rollback(() => {
              res
                .status(500)
                .json({
                  message: "Error al insertar el horario",
                  error: error.message,
                });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res
                  .status(500)
                  .json({
                    message: "Error al confirmar la transacción",
                    error: err.message,
                  });
              });
            }
            res
              .status(201)
              .json({ message: "Actividad agregada exitosamente", activityId });
          });
        });
      } else {
        // Si no es puntual, simplemente confirmar la transacción
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              res
                .status(500)
                .json({
                  message: "Error al confirmar la transacción",
                  error: err.message,
                });
            });
          }
          res
            .status(201)
            .json({ message: "Actividad agregada exitosamente", activityId });
        });
      }
    });
  });
});

// Endpoint para actualizar una actividad existente
app.post("/api/updateActivities", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;
  const editingEvent = req.body;

  db.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error al iniciar la transacción" });
    }

    // Actualizar la actividad
    db.query(
      `UPDATE activity 
       SET title = ?, description = ?, importance = ?, status = ?, start_date = ?, due_date = ?
       WHERE id = ? AND user_id = ?`,
      [
        editingEvent.title,
        editingEvent.description,
        editingEvent.importance,
        editingEvent.status,
        editingEvent.type === "Puntual" ? editingEvent.date : editingEvent.start_date,
        editingEvent.type === "Puntual" ? editingEvent.date : editingEvent.due_date,
        editingEvent.id,
        userId,
      ],
      (error, results) => {
        if (error) {
          return db.rollback(() => {
            res.status(500).json({
              message: "Error al actualizar la actividad",
              error: error.message,
            });
          });
        }

        // Verificar si existe un registro en schedule para la actividad
        const checkScheduleQuery = `SELECT * FROM schedule WHERE activity_id = ?`;
        db.query(
          checkScheduleQuery,
          [editingEvent.id],
          (err, scheduleResults) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({
                  message: "Error en la consulta de horarios",
                  error: err.message,
                });
              });
            }

            if (editingEvent.type === "Puntual") {
              const scheduleData = [
                editingEvent.date,
                editingEvent.start_time,
                editingEvent.end_time,
                editingEvent.id,
              ];

              const query =
                scheduleResults.length > 0
                  ? `UPDATE schedule SET date = ?, start_time = ?, end_time = ? WHERE activity_id = ?`
                  : `INSERT INTO schedule (date, start_time, end_time, activity_id, type) VALUES (?, ?, ?, ?, 'Puntual')`;

              db.query(query, scheduleData, (error) => {
                if (error) {
                  return db.rollback(() => {
                    res.status(500).json({
                      message: "Error al actualizar/insertar el horario",
                      error: error.message,
                    });
                  });
                }

                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      res.status(500).json({
                        message: "Error al confirmar la transacción",
                        error: commitErr.message,
                      });
                    });
                  }
                  res.status(200).json({
                    message: "Actividad y horario actualizados con éxito",
                  });
                });
              });
            } else {
              // Si el tipo no es "Puntual", eliminar el registro si existe
              if (scheduleResults.length > 0) {
                db.query(
                  `DELETE FROM schedule WHERE activity_id = ?`,
                  [editingEvent.id],
                  (deleteError) => {
                    if (deleteError) {
                      return db.rollback(() => {
                        res.status(500).json({
                          message: "Error al eliminar el horario",
                          error: deleteError.message,
                        });
                      });
                    }

                    db.commit((commitErr) => {
                      if (commitErr) {
                        return db.rollback(() => {
                          res.status(500).json({
                            message: "Error al confirmar la transacción",
                            error: commitErr.message,
                          });
                        });
                      }
                      res.status(200).json({
                        message: "Actividad actualizada y horario eliminado",
                      });
                    });
                  }
                );
              } else {
                // No hay horario que eliminar, solo confirmar la transacción
                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      res.status(500).json({
                        message: "Error al confirmar la transacción",
                        error: commitErr.message,
                      });
                    });
                  }
                  res
                    .status(200)
                    .json({ message: "Actividad actualizada con éxito" });
                });
              }
            }
          }
        );
      }
    );
  });
});

// Endpoint para insertar una nueva actividad
app.post("/api/activities", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;
  const {
    title,
    description,
    importance,
    status,
    start_date,
    due_date,
    type,
    date,
    start_time,
    end_time,
  } = req.body;

  db.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error al iniciar la transacción" });
    }

    // Insertar la actividad
    db.query(
      `INSERT INTO activity (user_id, title, description, importance, status, start_date, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, description, importance, status, start_date, due_date],
      (error, results) => {
        if (error) {
          return db.rollback(() => {
            res.status(500).json({ message: "Error al insertar la actividad" });
          });
        }

        const activityId = results.insertId;

        // Insertar el horario si es una actividad puntual
        if (type === "Puntual") {
          db.query(
            `INSERT INTO schedule (user_id, type, activity_id, date, start_time, end_time)
               VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, type, activityId, date, start_time, end_time],
            (error, results) => {
              if (error) {
                return db.rollback(() => {
                  res
                    .status(500)
                    .json({ message: "Error al insertar el horario" });
                });
              }

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res
                      .status(500)
                      .json({ message: "Error al confirmar la transacción" });
                  });
                }
                res
                  .status(201)
                  .json({ message: "Actividad creada con éxito", activityId });
              });
            }
          );
        } else {
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res
                  .status(500)
                  .json({ message: "Error al confirmar la transacción" });
              });
            }
            res
              .status(201)
              .json({ message: "Actividad creada con éxito", activityId });
          });
        }
      }
    );
  });
});

app.post("/api/deleteActivity", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;
  const { activityId } = req.body; // id de la actividad a eliminar

  db.beginTransaction((err) => {
    if (err) {
      console.error("Error al iniciar la transacción:", err);
      return res
        .status(500)
        .json({ message: "Error al iniciar la transacción" });
    }

    // Paso 1: Eliminar registros en la tabla schedule relacionados con la actividad
    const deleteScheduleQuery = `DELETE FROM schedule WHERE activity_id = ? AND user_id = ?`;
    db.query(deleteScheduleQuery, [activityId, userId], (error, results) => {
      if (error) {
        console.error("Error al eliminar de schedule:", error);
        return db.rollback(() => {
          res
            .status(500)
            .json({ message: "Error al eliminar la actividad del horario" });
        });
      }

      // Paso 2: Eliminar la actividad en la tabla activity
      const deleteActivityQuery = `UPDATE activity SET status = '3' WHERE id = ? AND user_id = ?`;
      db.query(deleteActivityQuery, [activityId, userId], (error, results) => {
        if (error) {
          console.error("Error al eliminar la actividad:", error);
          return db.rollback(() => {
            res.status(500).json({ message: "Error al eliminar la actividad" });
          });
        }

        // Confirmar la transacción si ambos pasos son exitosos
        db.commit((err) => {
          if (err) {
            console.error("Error al confirmar la transacción:", err);
            return db.rollback(() => {
              res
                .status(500)
                .json({ message: "Error al confirmar la transacción" });
            });
          }
          res.status(200).json({ message: "Actividad eliminada exitosamente" });
        });
      });
    });
  });
});

//--------------- HISTORY PAGE ----------------//

app.get("/api/history", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;

  db.query(
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
      schedule s ON a.id = s.activity_id
    WHERE 
      a.user_id = ? AND a.status = "2"`,
    [userId],
    (error, results) => {
      if (error) {
        return res
          .status(500)
          .json({ message: "Error al obtener actividades del usuario" });
      }

      res.status(200).json(results.length > 0 ? results : []);
    }
  );
});

//--------------- USERS CRUD PAGE ----------------//

app.get("/api/plans", verifyToken(["0"]), (req, res) => {
  const userId = req.user.id;

  db.query(`SELECT id, name FROM subscription_plan`, (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Error al obtener los planes" });
    }

    res.status(200).json(results.length > 0 ? results : []);
  });
});

//--------------- HOME PAGE ----------------//

app.get("/api/schedule", verifyToken(["1"]), (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
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
    JOIN 
      activity a ON s.activity_id = a.id
    WHERE 
      s.user_id = ? AND a.status NOT IN ("2", "3")
    ORDER BY 
      s.date, s.start_time;
  `;

  db.query(query, [userId, userId], (error, results) => {
    if (error) {
      console.error("Error al obtener la agenda del usuario", error);
      return res
        .status(500)
        .json({ message: "Error al obtener la agenda del usuario" });
    }

    res.status(200).json(results.length > 0 ? results : []);
  });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
});
