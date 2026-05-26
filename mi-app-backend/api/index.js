require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

// Initialize Express App
const app = express();

// Configuración CORS simplificada y corregida
const allowedOrigins = [
  "https://mundial-2026-w4kp.vercel.app",
  "https://mundial-2026-pi.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:16957",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("Origen bloqueado por CORS:", origin);
        callback(null, true); // Temporalmente permitir todos para debugging
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200,
  }),
);

// Middleware para logging (útil para debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Origin:", req.headers.origin);
  console.log("Headers:", req.headers);
  next();
});

app.use(express.json());

// Import Routes
const authRoutes = require("../routes/auth");
const adminRoutes = require("../routes/admin");
const pronosticosRoutes = require("../routes/pronosticos");
const fixturesRoutes = require("../routes/fixtures");
const rankingsRoutes = require("../routes/rankings");

// Mount Routes - IMPORTANTE: No agregues /api adicional aquí si ya está en las rutas
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pronosticos", pronosticosRoutes);
app.use("/api/fixtures", fixturesRoutes);
app.use("/api/rankings", rankingsRoutes);

// Health Check Endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Backend de Apuestas Mundial 2026 corriendo con éxito 🚀",
    cors: "Configurado correctamente",
    endpoints: [
      "/api/auth",
      "/api/admin",
      "/api/pronosticos",
      "/api/fixtures",
      "/api/rankings",
    ],
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
    status: "online",
  });
});

// Seed default Admin Account
async function seedAdmin() {
  try {
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "261299";

    // Esperar a que la conexión esté lista
    if (connectPromise) {
      await connectPromise;
    }

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
      console.log(`[SEED] Administrador creado: '${adminUser}'`);
    } else {
      console.log(`[SEED] Admin '${adminUser}' ya existe.`);
    }
  } catch (error) {
    console.error("[SEED ERROR]:", error);
  }
}

// Database Connection
let connectPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/prode_mundial";

    console.log(`[DB] Conectando a MongoDB...`);

    try {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("[DB] Conexión exitosa!");
      await seedAdmin();
      return mongoose.connection;
    } catch (err) {
      console.error("[DB Error]:", err.message);
      throw err;
    }
  }
  return mongoose.connection;
}

// Iniciar conexión
connectPromise = connectDB().catch((err) => {
  console.error("Fallo en conexión inicial:", err);
});

// Export for Vercel Serverless Function - Versión corregida
module.exports = async (req, res) => {
  // Asegurar que la base de datos esté conectada
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectPromise;
    }
  } catch (err) {
    console.error("Error de conexión DB:", err);
  }

  // Manejar OPTIONS requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  // Delegar a Express
  return app(req, res);
};

module.exports.app = app;
