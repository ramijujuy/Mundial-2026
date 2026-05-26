const express = require("express");
const router = express.Router();
const { Forecast, User, Championship } = require("../models");
const { authenticateJWT } = require("../middleware");

// GET /api/rankings/:campeonatoId - Get leaderboards for a championship
router.get("/:campeonatoId", authenticateJWT, async (req, res) => {
  try {
    const { campeonatoId } = req.params;
    const championshipId = campeonatoId;

    const championship = await Championship.findById(championshipId);
    if (!championship) {
      return res.status(404).json({ message: "Campeonato no encontrado" });
    }

    // Fetch all approved, non-admin players registered in this championship
    const players = await User.find({
      isAdmin: false,
      status: "approved",
      championshipId,
    });

    // Fetch all forecasts for this championship
    const forecasts = await Forecast.find({ championshipId });
    const forecastMap = new Map();
    forecasts.forEach((f) => {
      forecastMap.set(f.userId.toString(), f);
    });

    // Merge players and forecasts
    let rankingList = players.map((player) => {
      const forecast = forecastMap.get(player._id.toString());
      return {
        userId: player._id,
        username: player.username,
        points: forecast ? forecast.pointsObtained : 0,
        isConfirmed: forecast ? forecast.isConfirmed : false,
        confirmedAt: forecast ? forecast.confirmedAt : null,
      };
    });

    // Sort by points descending, then by username alphabetically
    rankingList.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points; // Higher points first
      }
      return a.username.localeCompare(b.username); // Alphabetical tie-breaker
    });

    // Add rank positions (1, 2, 3, etc.)
    let currentRank = 1;
    const rankedList = rankingList.map((item, index) => {
      if (index > 0 && rankingList[index - 1].points > item.points) {
        currentRank = index + 1;
      }
      return {
        ...item,
        rank: currentRank,
      };
    });

    res.json({
      championship: {
        name: championship.name,
        isFinished: championship.isFinished,
      },
      rankings: rankedList,
    });
  } catch (error) {
    console.error("Error fetching rankings:", error);
    res
      .status(500)
      .json({ message: "Error al obtener la tabla de posiciones" });
  }
});

module.exports = router;
