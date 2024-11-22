const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
const PORT = process.env.AUTH_PORT || 5000;

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

app.get("/", (req, res) => {
  res.send("Auth service running!");
});

app.get("/datos", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM prueba");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error en la consulta:", err);
    res.status(500).json({ error: "Consulta no procesada" });
  }
});

//----------------LOGIN PAGE-------------------//

const generateToken = (user, expiresIn) => {
  const payload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

const saveToken = async (userId, token, expiresAt) => {
  try {
    await pool.query(
      "INSERT INTO session_token (user_id, token, expires_date) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );
  } catch (err) {
    console.error("Error saving token to the database", err);
  }
};

app.get("/api/login", async (req, res) => {
  const { email, password, rememberMe } = req.query;

  const hashedPassword = crypto
    .createHash("md5")
    .update(password)
    .digest("hex");

  try {
    const [results] = await pool.query(
      "SELECT * FROM users WHERE email = ? AND password = ?",
      [email, hashedPassword]
    );

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    const expiresIn = rememberMe === "true" ? "30d" : "1d";
    const token = generateToken(user, expiresIn);

    const expiresAt = new Date(
      Date.now() + (rememberMe === "true" ? 30 : 1) * 24 * 60 * 60 * 1000
    );
    await saveToken(user.id, token, expiresAt);

    res.json({
      name: user.name,
      type: user.type,
      email: user.email,
      suscription_plan: user.suscription_plan,
      token: token,
    });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/logout", async (req, res) => {
  const { session_token } = req.body;
  try {
    await pool.query("DELETE FROM session_token WHERE token = ?", [
      session_token,
    ]);
    res.status(200).json({ message: "Token eliminado exitosamente!." });
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Google Auth
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body;

  try {
    const ticket = await verifyGoogleToken(idToken);
    const { sub, name, email, picture, given_name } = ticket;

    const [userResults] = await pool.query(
      "SELECT * FROM users WHERE google_id = ?",
      [sub]
    );

    if (userResults.length > 0) {
      const user = userResults[0];
      const sessionToken = generateToken30Days(user);
      await saveTokenFor30Days(user.id, sessionToken);
      return res.status(200).json({
        name: user.name,
        type: user.type,
        email: user.email,
        suscription_plan: user.suscription_plan,
        token: sessionToken,
      });
    } else {
      const [emailResults] = await pool.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (emailResults.length > 0) {
        const user = emailResults[0];
        await pool.query(
          "UPDATE users SET google_id = ?, profile_picture_url = ? WHERE id = ?",
          [sub, picture, user.id]
        );

        const sessionToken = generateToken30Days({
          id: user.id,
          email: user.email,
        });

        await saveTokenFor30Days(user.id, sessionToken);

        return res.status(200).json({
          name: user.name,
          type: user.type,
          email: user.email,
          suscription_plan: user.suscription_plan,
          token: sessionToken,
        });
      } else {
        const [insertResult] = await pool.query(
          `INSERT INTO users (google_id, name, email, email_verified, profile_picture_url, given_name, suscription_plan, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [sub, name, email, true, picture, given_name, 1, 1]
        );

        const sessionToken = generateToken30Days({
          id: insertResult.insertId,
          email: email,
        });

        await saveTokenFor30Days(insertResult.insertId, sessionToken);

        return res.status(201).json({
          name: name,
          type: "1",
          email: email,
          suscription_plan: 1,
          token: sessionToken,
        });
      }
    }
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

const generateToken30Days = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const saveTokenFor30Days = async (userId, token) => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  try {
    await pool.query(
      "INSERT INTO session_token (user_id, token, expires_date) VALUES (?, ?, ?)",
      [userId, token, expiresAt]
    );
  } catch (err) {
    console.error("Error al guardar el token en la base de datos", err);
  }
};

const verifyGoogleToken = async (token) => {
  const response = await axios.get(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
  );
  return response.data;
};

//---------------Register Page----------------//

app.get("/api/checkEmail", async (req, res) => {
  const { email } = req.query;

  try {
    const [results] = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE email = ?",
      [email]
    );
    res.status(200).json({ exists: results[0].count > 0 });
  } catch (err) {
    console.error("Error al verificar el correo:", err);
    res.status(500).json({ message: "Error al verificar el correo" });
  }
});

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

app.post("/api/sendVerificationCode", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Correo electrónico requerido" });
  }

  const verificationCode = generateVerificationCode();

  try {
    await pool.query(
      "INSERT INTO verification_codes (email, code) VALUES (?, ?)",
      [email, verificationCode]
    );

    const transporter = nodemailer.createTransport({
      host: "smtp.titan.email",
      port: 465,
      secure: true,
      auth: {
        user: process.env.NODE_EMAIL,
        pass: process.env.NODE_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"CRONIS" <${process.env.NODE_EMAIL}>`,
      to: email,
      subject: "Código de verificación",
      text: `Tu código de verificación para CRONIS es: ${verificationCode}. Este código expira en 3 minutos.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Código de verificación enviado correctamente",
    });
  } catch (error) {
    console.error("Error en el proceso de envío de verificación:", error);
    res.status(500).json({
      message: "Hubo un error al procesar la solicitud de verificación.",
      error: error.message,
    });
  }
});

app.post("/api/verify-code", async (req, res) => {
  const { email, code } = req.body;

  try {
    const [results] = await pool.query(
      "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW()",
      [email, code]
    );
    res.json({ isValid: results.length > 0 });
  } catch (err) {
    console.error("Error al verificar el código:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/api/register", async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = crypto
      .createHash("md5")
      .update(password)
      .digest("hex");

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [nombre, email, hashedPassword]
    );

    await pool.query("DELETE FROM verification_codes WHERE email = ?", [email]);

    res.status(201).json({ success: true, userId: result.insertId });
  } catch (error) {
    console.error("Error al registrar el usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
