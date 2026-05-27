const express = require("express");
const router = express.Router();
const { Match, Championship } = require("../models");
const { authenticateJWT } = require("../middleware");

// GET /api/fixtures/championships - Helper route to fetch list of all championships (for selector dropdowns)
router.get("/championships/list", async (req, res) => {
  try {
    // Return all championships (both open and closed)
    const championships = await Championship.find().sort({ createdAt: -1 });
    res.json(championships);
  } catch (error) {
    console.error("Error fetching championships:", error);
    res.status(500).json({ message: "Error al obtener campeonatos" });
  }
});

// GET /api/fixtures/:campeonatoId - Get all matches for a specific championship
router.get("/:campeonatoId", authenticateJWT, async (req, res) => {
  try {
    const { campeonatoId } = req.params;

    const championship = await Championship.findById(campeonatoId);
    if (!championship) {
      return res.status(404).json({ message: "Campeonato no encontrado" });
    }

    const matches = await Match.find({ championshipId: campeonatoId }).sort({
      phase: 1, // Sort by phase name
      date: 1, // Then by date
      time: 1, // Then by time
    });

    res.json({
      championship,
      matches,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res
      .status(500)
      .json({ message: "Error al obtener los partidos del campeonato" });
  }
});

module.exports = router;
