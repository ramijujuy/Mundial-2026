require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { User } = require("./models");

// Initialize Express App
const app = express();

// Standard Middlewares
app.use(
  cors({
    origin: "*", // In production, replace with actual frontend domain if desired
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Import Routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const pronosticosRoutes = require("./routes/pronosticos");
const fixturesRoutes = require("./routes/fixtures");
const rankingsRoutes = require("./routes/rankings");

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pronosticos", pronosticosRoutes);
app.use("/api/fixtures", fixturesRoutes);
app.use("/api/rankings", rankingsRoutes);

// Root Endpoint for Health Check
app.get("/", (req, res) => {
  res.json({
    message: "Backend de Apuestas Mundial 2026 corriendo con éxito 🚀",
    dbStatus:
      mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
  });
});

// Seed default Admin Account on startup
async function seedAdmin() {
  try {
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "261299";

    const existingAdmin = await User.findOne({
      username: adminUser.toLowerCase(),
    });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPass, 10);
      const newAdmin = new User({
        username: adminUser.toLowerCase(),
        password: hashedPassword,
        isAdmin: true,
        status: "approved",
      });
      await newAdmin.save();
      console.log(
        `[SEED] Administrador default creado con usuario: '${adminUser}'`,
      );
    } else {
      console.log(`[SEED] El usuario administrador '${adminUser}' ya existe.`);
    }
  } catch (error) {
    console.error("[SEED ERROR] Error al crear administrador inicial:", error);
  }
}

// Database Connection
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/prode_mundial";
console.log("Intentando conectar a MongoDB...");

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("¡Conexión exitosa a MongoDB!");
    // Seed admin
    seedAdmin();
  })
  .catch((err) => {
    console.error("Error al conectar a MongoDB:", err.message);
  });

// Export app for Vercel Serverless
module.exports = app;

// Listen on PORT if run locally (not as Vercel serverless function)
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Servidor local corriendo en el puerto ${PORT}`);
  });
}
