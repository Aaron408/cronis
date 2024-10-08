// services/auth/server.js
const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const app = express();
const PORT = process.env.AUTH_PORT || 5000;
const cors = require("cors"); // Importar cors
const nodemailer = require("nodemailer");
const crypto = require("crypto");

require("dotenv").config({ path: "../../.env" }); // Cargar desde la raíz del proyecto

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

//-------------LOGIN PAGE-------------//

const generateToken = (user, expiresIn) => {
  const payload = {
    userId: user.id,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const saveToken = (userId, token, expiresAt) => {
  const query =
    "INSERT INTO session_token (user_id, token, expires_date) VALUES (?, ?, ?)";

  db.query(query, [userId, token, expiresAt], (err, results) => {
    if (err) {
      console.error("Error saving token to the database", err);
    }
  });
};

app.post("/api/login", (req, res) => {
  const { email, password, rememberMe } = req.body;

  // Hash the password using MD5
  const hashedPassword = crypto
    .createHash("md5")
    .update(password)
    .digest("hex");

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(query, [email, hashedPassword], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    const expiresIn = rememberMe ? "30d" : "1d";
    const token = generateToken(user, expiresIn);

    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000
    );
    saveToken(user.id, token, expiresAt);

    res.json({
      name: user.name,
      type: user.type,
      email: user.email,
      token: token,
    });
  });
});

// Función para generar el token JWT con duración de 1 mes
const generateToken30Days = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
  };

  // Generar el token con una duración de 30 días
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
  return token;
};

const saveTokenFor30Days = (userId, token) => {
  // Consulta para guardar el token en la base de datos
  const query =
    "INSERT INTO session_token (user_id, token, expires_date) VALUES (?, ?, ?)";
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fecha de expiración a 30 días

  db.query(query, [userId, token, expiresAt], (err, results) => {
    if (err) {
      console.error("Error al guardar el token en la base de datos", err);
    }
  });
};

app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await verifyGoogleToken(idToken);
    const { sub, name, email, picture, given_name } = ticket;

    const queryCheckUser = `
        SELECT * 
        FROM users 
        WHERE google_id = ?
      `;

    // Verifica si el usuario ya existe
    db.query(queryCheckUser, [sub], async (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (results.length > 0) {
        const user = results[0];

        const sessionToken = generateToken30Days(user);
        saveTokenFor30Days(user.id, sessionToken, (err) => {
          if (err) {
            return res
              .status(500)
              .json({ message: "Error al guardar el token de sesión." });
          }
        });
        return res.status(200).json({
          name: user.name,
          type: user.type,
          email: user.email,
          token: sessionToken,
        });
      } else {
        const newUserQuery = `
            INSERT INTO users (google_id, name, email, email_verified, profile_picture_url, given_name, suscription_plan, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

        const newUser = {
          google_id: sub,
          name: name,
          email: email,
          email_verified: true,
          profile_picture_url: picture,
          given_name: given_name,
          suscription_plan: 1,
          status: 1,
        };

        db.query(
          newUserQuery,
          [
            newUser.google_id,
            newUser.name,
            newUser.email,
            newUser.email_verified,
            newUser.profile_picture_url,
            newUser.given_name,
            newUser.suscription_plan,
            newUser.status,
          ],
          (err, insertResult) => {
            if (err) {
              console.error("Error inserting new user:", err);
              return res.status(500).json({ error: "Error creating new user" });
            }

            const sessionToken = generateToken30Days({
              id: insertResult.insertId,
              email: newUser.email,
            });

            saveTokenFor30Days(insertResult.insertId, sessionToken, (err) => {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Error al guardar el token de sesión." });
              }
            });

            return res.status(201).json({
              name: newUser.name,
              type: "1",
              email: newUser.email,
              token: sessionToken,
            });
          }
        );
      }
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Función para verificar el token de Google
const verifyGoogleToken = async (token) => {
  const response = await axios.get(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
  );
  return response.data;
};

//---------------Register Page----------------//

app.post("/api/checkEmail", (req, res) => {
  const { email } = req.body;

  db.query(
    "SELECT COUNT(*) as count FROM users WHERE email = ?",
    [email],
    (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error al verificar el correo" });
      }

      if (results[0].count > 0) {
        return res.status(200).json({ exists: true }); // Correo ya registrado
      } else {
        return res.status(200).json({ exists: false }); // Correo no registrado
      }
    }
  );
});

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

app.post("/api/sendVerificationCode", (req, res) => {
  const { email } = req.body;

  // Validar que se haya proporcionado el correo
  if (!email) {
    return res.status(400).json({ message: "Correo electrónico requerido" });
  }

  // Generar el código de verificación
  const verificationCode = generateVerificationCode();

  // Insertar el código de verificación en la base de datos
  db.query(
    "INSERT INTO verification_codes (email, code) VALUES (?, ?)",
    [email, verificationCode],
    (err, result) => {
      if (err) {
        console.error("Error al insertar el código de verificación:", err);
        return res
          .status(500)
          .json({ message: "Hubo un error al generar el código." });
      }

      // Configurar Nodemailer para enviar el correo usando Titan Email
      const transporter = nodemailer.createTransport({
        host: "smtp.titan.email", // Servidor SMTP de Titan
        port: 465, // Puerto seguro para SMTP con SSL
        secure: true, // Utilizar SSL
        auth: {
          user: process.env.NODE_EMAIL,
          pass: "ProyectoIngenieria#2024",
        },
      });

      // Función para enviar correo
      const enviarCorreo = (email, verificationCode, res) => {
        // Opciones del correo
        const mailOptions = {
          from: `"Nombre de tu empresa" <${process.env.NODE_EMAIL}>`, // Remitente con el nombre de tu empresa
          to: email, // Correo del destinatario
          subject: "Código de verificación", // Asunto
          text: `Tu código de verificación para CRONIS es: ${verificationCode}. Este código expira en 3 minutos.`, // Cuerpo del correo en texto plano
        };

        // Enviar el correo
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error al enviar el correo de verificación:", error);
            // Log más detalles del error
            console.error("Detalles del error:", error.message, error.stack);

            // Respuesta en caso de error
            return res.status(500).json({
              message: "Hubo un error al enviar el correo de verificación.",
            });
          }

          // Respuesta en caso de éxito
          res.status(200).json({
            message: "Código de verificación enviado correctamente",
          });
        });
      };

      // Llamar a la función enviarCorreo con los parámetros correctos
      enviarCorreo(email, verificationCode, res);
    }
  );
});


app.post("/api/verify-code", (req, res) => {
  const { email, code } = req.body;

  db.query(
    "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW()",
    [email, code],
    (err, results) => {
      if (err) {
        console.error("Error al verificar el código:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (results.length > 0) {
        // Código válido
        res.json({ isValid: true });
      } else {
        // Código inválido o expirado
        res.json({ isValid: false });
      }
    }
  );
});

app.post("/api/register", async (req, res) => {
  const { nombre, email, password } = req.body;

  // Validaciones básicas
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    // Verificar si el usuario ya existe
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Error al verificar el usuario existente:", err);
          return res.status(500).json({ error: "Error interno del servidor" });
        }

        if (results.length > 0) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }

        // Hashear la contraseña
        const hashedPassword = crypto
          .createHash("md5")
          .update(password)
          .digest("hex");

        // Insertar el nuevo usuario
        db.query(
          "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
          [nombre, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error("Error al insertar nuevo usuario:", err);
              return res
                .status(500)
                .json({ error: "Error al crear nuevo usuario" });
            }

            // Eliminar el código de verificación usado
            db.query("DELETE FROM verification_codes WHERE email = ?", [email]);

            res.status(201).json({ success: true, userId: result.insertId });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
