require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

// Initialize Express App
const app = express();

// Standard Middlewares
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Import Routes
const authRoutes = require("../routes/auth");
const adminRoutes = require("../routes/admin");
const pronosticosRoutes = require("../routes/pronosticos");
const fixturesRoutes = require("../routes/fixtures");
const rankingsRoutes = require("../routes/rankings");

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pronosticos", pronosticosRoutes);
app.use("/api/fixtures", fixturesRoutes);
app.use("/api/rankings", rankingsRoutes);

// Root Endpoint for Health Check
async function respondHealth(req, res) {
  // If a connection attempt is in progress, wait for it (short timeout)
  if (connectPromise) {
    try {
      // wait but don't block indefinitely
      await Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
    } catch (err) {
      // ignore - we'll report disconnected state below
    }
  }

  res.json({
    message: "Backend de Apuestas Mundial 2026 corriendo con éxito 🚀",
    dbStatus:
      mongoose.connection.readyState === 1 ? "Conectado" : "Desconectado",
  });
}

app.get("/", respondHealth);
app.get("/api", respondHealth);

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

// Database Connection (connect only once)
let connectPromise = null;
if (mongoose.connection.readyState === 0) {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/prode_mundial";
  console.log("Intentando conectar a MongoDB...");

  connectPromise = mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("¡Conexión exitosa a MongoDB!");
      seedAdmin();
    })
    .catch((err) => {
      console.error("Error al conectar a MongoDB:", err.message);
    });
}

// Export for Vercel Serverless Function
module.exports = (req, res) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Delegate to Express app
  return app(req, res);
};

// Also export app for local development
module.exports.app = app;
