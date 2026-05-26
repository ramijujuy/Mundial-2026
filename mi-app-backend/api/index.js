require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

// Initialize Express App
const app = express();

// Configuración CORS mejorada para Vercel
const corsOptions = {
  origin: [
    "https://mundial-2026-w4kp.vercel.app",
    "https://mundial-2026-pi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Aplica CORS antes que cualquier otra cosa
app.use(cors(corsOptions));

// Middleware adicional para manejar preflight requests manualmente
app.use((req, res, next) => {
  // También permitir desde cualquier origen para debug
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

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
  if (connectPromise) {
    try {
      await Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000),
        ),
      ]);
    } catch (err) {
      // ignore
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

// Seed default Admin Account
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
let connectPromise = null;
if (mongoose.connection.readyState === 0) {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/prode_mundial";

  const maskedUri = MONGO_URI.replace(
    /mongodb\+srv:\/\/.*@/,
    "mongodb+srv://***:***@",
  );
  console.log(`[DB] Intentando conectar a MongoDB...`);
  console.log(`[DB] URI (masked): ${maskedUri}`);
  console.log(`[DB] MONGO_URI defined: ${!!process.env.MONGO_URI}`);

  connectPromise = mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("[DB] ¡Conexión exitosa a MongoDB!");
      console.log(`[DB] Connection state: ${mongoose.connection.readyState}`);
      seedAdmin();
    })
    .catch((err) => {
      console.error("[DB] Error al conectar a MongoDB:", err.message);
      console.error("[DB] Error code:", err.code);
      console.error("[DB] Error name:", err.name);
      if (err.reason) {
        console.error("[DB] Error reason:", err.reason);
      }
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

module.exports.app = app;
