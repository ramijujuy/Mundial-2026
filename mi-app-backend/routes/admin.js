const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const { User, Championship, Match, Forecast } = require("../models");
const { authenticateJWT, requireAdmin } = require("../middleware");

// Configure Multer for Excel file upload in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de Excel (.xlsx, .xls)"));
    }
  },
});

// GET /api/admin/users - Get all players (for approval queue)
router.get("/users", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { championshipId } = req.query;
    const filter = { isAdmin: false };
    if (championshipId) {
      filter.championshipId = championshipId;
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

// POST /api/admin/approve-user - Approve a user
router.post(
  "/approve-user",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      user.status = "approved";
      await user.save();
      res.json({
        message: `Usuario ${user.username} aprobado con éxito`,
        user,
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Error al aprobar usuario" });
    }
  },
);

// POST /api/admin/reject-user - Reject a user
router.post("/reject-user", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    user.status = "rejected";
    await user.save();
    res.json({ message: `Usuario ${user.username} rechazado`, user });
  } catch (error) {
    console.error("Error rejecting user:", error);
    res.status(500).json({ message: "Error al rechazar usuario" });
  }
});

// POST /api/admin/promote-user - Promote a user to admin
router.post(
  "/promote-user",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      if (user.isAdmin) {
        return res
          .status(400)
          .json({ message: "El usuario ya es administrador" });
      }
      user.isAdmin = true;
      user.status = "approved";
      await user.save();
      res.json({
        message: `Usuario ${user.username} promovido a administrador`,
        user,
      });
    } catch (error) {
      console.error("Error promoting user:", error);
      res
        .status(500)
        .json({ message: "Error al promover usuario a administrador" });
    }
  },
);

// DELETE /api/admin/user/:userId - Delete a user and their forecasts
router.delete(
  "/user/:userId",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      await Forecast.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
      res.json({ message: `Usuario ${user.username} eliminado correctamente` });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error al eliminar usuario" });
    }
  },
);

// DELETE /api/admin/championship/:championshipId - Delete a championship and related data
router.delete(
  "/championship/:championshipId",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { championshipId } = req.params;
      const championship = await Championship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ message: "Campeonato no encontrado" });
      }
      await Match.deleteMany({ championshipId: championship._id });
      await Forecast.deleteMany({ championshipId: championship._id });
      await Championship.findByIdAndDelete(championship._id);
      res.json({
        message: `Campeonato ${championship.name} eliminado correctamente`,
      });
    } catch (error) {
      console.error("Error deleting championship:", error);
      res.status(500).json({ message: "Error al eliminar campeonato" });
    }
  },
);

// GET /api/admin/export-participants - Export participant list as CSV
router.get(
  "/export-participants",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { championshipId } = req.query;
      const filter = { isAdmin: false };
      if (championshipId) {
        filter.championshipId = championshipId;
      }

      const users = await User.find(filter)
        .populate("championshipId", "name")
        .sort({ createdAt: -1 });
      const championship = championshipId
        ? await Championship.findById(championshipId)
        : null;

      const rows = [["Usuario", "Estado", "Campeonato", "Registrado"]];

      users.forEach((user) => {
        rows.push([
          user.username,
          user.status,
          user.championshipId?.name || "N/A",
          user.createdAt.toISOString(),
        ]);
      });

      const csv = rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        )
        .join("\r\n");
      const filename = `participantes-${championship ? championship.name.replace(/\s+/g, "_").toLowerCase() : "todos"}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(csv);
    } catch (error) {
      console.error("Error exporting participants:", error);
      res.status(500).json({ message: "Error al exportar participantes" });
    }
  },
);

// Helper function to robustly parse dates from Excel cells
function tryParseDate(cell) {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Date) {
    const d = cell.getDate().toString().padStart(2, "0");
    const m = (cell.getMonth() + 1).toString().padStart(2, "0");
    const y = cell.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(cell).trim();
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  if (dateRegex.test(str)) {
    return str;
  }
  // Check if Excel serial date number
  if (typeof cell === "number" && cell > 40000 && cell < 60000) {
    const dateObj = new Date((cell - 25569) * 86400 * 1000);
    const d = dateObj.getUTCDate().toString().padStart(2, "0");
    const m = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
    const y = dateObj.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }
  return null;
}

// POST /api/admin/create-campeonato - Create a championship with Excel uploaded fixture
router.post(
  "/create-campeonato",
  authenticateJWT,
  requireAdmin,
  upload.single("fixture"),
  async (req, res) => {
    try {
      const { name, startDate, endDate } = req.body;

      if (!name || !startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "El nombre y las fechas son obligatorios" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "Debe subir el archivo Excel con el fixture" });
      }

      // Set other championships as inactive if this one is active (default)
      await Championship.updateMany({}, { isActive: false });

      // Create new championship
      const championship = new Championship({
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true,
      });

      await championship.save();

      // Read and parse Excel file
      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Header: 1 gets a raw 2D array [ [cell, cell, ...], [cell, cell, ...] ]
      const data = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
      });

      const matches = [];

      // Scan the sheet dynamically to capture side-by-side grids (Groups A-F and G-L)
      for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          const dateVal = tryParseDate(cell);

          if (dateVal) {
            // A date cell is found! Let's extract values based on expected column offsets
            const timeVal = row[c + 1] ? String(row[c + 1]).trim() : "00:00";
            const phaseVal = row[c + 2] ? String(row[c + 2]).trim() : "Grupo";
            const localTeam = row[c + 4] ? String(row[c + 4]).trim() : "";
            const visitorTeam = row[c + 6] ? String(row[c + 6]).trim() : "";

            // Validate we actually found a match row (two non-empty team names, not headers)
            if (
              localTeam &&
              visitorTeam &&
              localTeam !== "L" &&
              visitorTeam !== "V"
            ) {
              matches.push({
                championshipId: championship._id,
                date: dateVal,
                time: timeVal,
                phase: phaseVal,
                localTeam,
                visitorTeam,
              });
              // Skip scanning remaining elements of this match block to avoid duplicate matches
              c += 7;
            }
          }
        }
      }

      if (matches.length === 0) {
        // Clean up empty championship
        await Championship.findByIdAndDelete(championship._id);
        return res.status(400).json({
          message:
            "No se encontraron partidos válidos en el archivo de Excel. Verifique el formato.",
        });
      }

      // Save matches to DB
      await Match.insertMany(matches);

      res.status(201).json({
        message: `Campeonato '${name}' creado con éxito. Se importaron ${matches.length} partidos.`,
        championship,
        matchCount: matches.length,
      });
    } catch (error) {
      console.error("Error creating championship:", error);
      res
        .status(500)
        .json({ message: "Error al crear campeonato y procesar el fixture" });
    }
  },
);

// Helper function to recalculate user scores dynamically
async function recalculateScores(championshipId) {
  // Fetch all matches for the championship
  const matches = await Match.find({ championshipId });
  const matchMap = new Map();
  matches.forEach((m) => {
    matchMap.set(m._id.toString(), m);
  });

  // Fetch all forecasts for this championship
  const forecasts = await Forecast.find({ championshipId });

  for (const forecast of forecasts) {
    let score = 0;

    for (const prediction of forecast.matches) {
      const match = matchMap.get(prediction.matchId.toString());
      if (match && match.realResult !== null) {
        if (prediction.selection === match.realResult) {
          score += 1;
        }
      }
    }

    forecast.pointsObtained = score;
    await forecast.save();
  }
}

// POST /api/admin/upload-results - Upload real match scores and recalculate user points
router.post(
  "/upload-results",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { championshipId, results } = req.body;
      // results is expected to be an array of: { matchId, scoreLocal, scoreVisitor }

      if (!championshipId || !results || !Array.isArray(results)) {
        return res.status(400).json({
          message: "ID de campeonato y lista de resultados son requeridos",
        });
      }

      const championship = await Championship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ message: "Campeonato no encontrado" });
      }

      if (championship.isFinished) {
        return res.status(400).json({
          message:
            "El campeonato ha finalizado. No se pueden modificar resultados.",
        });
      }

      // Process each match result
      for (const resItem of results) {
        const { matchId, scoreLocal, scoreVisitor } = resItem;

        if (
          scoreLocal === null ||
          scoreLocal === undefined ||
          scoreVisitor === null ||
          scoreVisitor === undefined
        ) {
          continue; // Skip if score is not provided
        }

        const numLocal = Number(scoreLocal);
        const numVisitor = Number(scoreVisitor);

        let realResult = "E"; // Draw
        if (numLocal > numVisitor)
          realResult = "L"; // Local wins
        else if (numVisitor > numLocal) realResult = "V"; // Visitor wins

        await Match.findByIdAndUpdate(matchId, {
          scoreLocal: numLocal,
          scoreVisitor: numVisitor,
          realResult: realResult,
        });
      }

      // Recalculate standings for all users
      await recalculateScores(championshipId);

      res.json({
        message: "Resultados cargados y puntajes actualizados con éxito",
      });
    } catch (error) {
      console.error("Error uploading results:", error);
      res
        .status(500)
        .json({ message: "Error al registrar resultados de partidos" });
    }
  },
);

// POST /api/admin/close-registration - Close registration for the active championship
router.post(
  "/close-registration",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { championshipId } = req.body;
      const championship = await Championship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ message: "Campeonato no encontrado" });
      }
      championship.isClosedForRegistration = true;
      await championship.save();
      res.json({
        message: "Inscripciones cerradas para este campeonato",
        championship,
      });
    } catch (error) {
      console.error("Error closing registration:", error);
      res.status(500).json({ message: "Error al cerrar inscripciones" });
    }
  },
);

// POST /api/admin/finish-campeonato - Mark the championship as finished (locks everything)
router.post(
  "/finish-campeonato",
  authenticateJWT,
  requireAdmin,
  async (req, res) => {
    try {
      const { championshipId } = req.body;
      const championship = await Championship.findById(championshipId);
      if (!championship) {
        return res.status(404).json({ message: "Campeonato no encontrado" });
      }
      championship.isFinished = true;
      championship.isActive = false; // Deactivate once complete
      await championship.save();
      res.json({
        message: "Campeonato marcado como Finalizado con éxito",
        championship,
      });
    } catch (error) {
      console.error("Error finishing championship:", error);
      res.status(500).json({ message: "Error al finalizar campeonato" });
    }
  },
);

module.exports = router;
