const express = require("express");
const authService = require("./services/auth");
const userService = require("./services/users");
const app = express();

app.use(express.json());
require("dotenv").config();

// Registrar servicios/rutas en sus respectivas rutas base
app.use("/api/auth", authService);
app.use("/api/users", userService);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
