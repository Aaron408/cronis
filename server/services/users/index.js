const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const crypto = require("crypto");

require("dotenv").config();

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

app.post("/api/updateUser", verifyToken, (req, res) => {
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


//Cambiar imagen

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '../../../Assets/uploads';
    // Crear el directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Crear un nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('No es un archivo de imagen válido'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  }
 });

 app.post('/api/uploadImage', verifyToken, upload.single('image'), (req, res) => {
  const userId = req.user.id;
  const newImageUrl = req.file.path;

  // Paso 1: Obtener la URL de la imagen actual desde la base de datos
  const selectQuery = `SELECT profile_picture_url FROM users WHERE id = ?`;
  db.query(selectQuery, [userId], (selectErr, selectResult) => {
    if (selectErr) {
      console.error("Error fetching current profile image:", selectErr);
      return res.status(500).json({ error: "Failed to fetch current profile image" });
    }

    // Almacenar la URL de la imagen anterior si existe
    const oldImageUrl = selectResult.length > 0 ? selectResult[0].profile_picture_url : null;

    // Paso 2: Actualizar la base de datos con la nueva URL de la imagen
    const updateQuery = `UPDATE users SET profile_picture_url = ? WHERE id = ?`;
    db.query(updateQuery, [newImageUrl, userId], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Error updating user:", updateErr);
        return res.status(500).json({ error: "Failed to update user" });
      }

      // Paso 3: Borrar la imagen anterior si existe y no es igual a la nueva
      if (oldImageUrl && oldImageUrl !== newImageUrl) {
        fs.unlink(oldImageUrl, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting old image:", unlinkErr);
          } else {
            console.log("Old image deleted successfully");
          }
        });
      }

      return res.status(200).json({ message: "User updated successfully" });
    });
  });
});

app.get('/api/getUserProfileImage', verifyToken, (req, res) => {
  const userId = req.user.id;
  const selectQuery = `SELECT profile_picture_url FROM users WHERE id = ?`;

  db.query(selectQuery, [userId], (err, result) => {
    if (err) {
      console.error("Error fetching profile image:", err);
      return res.status(500).json({ error: "Failed to fetch profile image" });
    }
    if (result.length > 0) {
      const profilePictureUrl = result[0].profile_picture_url;
      return res.status(200).json({ profilePictureUrl });
    } else {
      return res.status(404).json({ error: "User not found" });
    }
  });
});


// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
});
