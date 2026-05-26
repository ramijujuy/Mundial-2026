const express = require('express');
const router = express.Router();
const { Forecast, Match, Championship } = require('../models');
const { authenticateJWT, requireApproved } = require('../middleware');

// GET /api/pronosticos/mi-pronostico - Retrieve logged in player's forecast
router.get('/mi-pronostico', authenticateJWT, requireApproved, async (req, res) => {
  try {
    const { championshipId } = req.query;
    
    let targetChampionshipId = championshipId;

    if (!targetChampionshipId) {
      // Find the active championship
      const activeChampionship = await Championship.findOne({ isActive: true });
      if (!activeChampionship) {
        return res.status(404).json({ message: 'No hay campeonatos activos en este momento' });
      }
      targetChampionshipId = activeChampionship._id;
    }

    const forecast = await Forecast.findOne({
      userId: req.user._id,
      championshipId: targetChampionshipId
    });

    res.json(forecast || { matches: [], isConfirmed: false });

  } catch (error) {
    console.error('Error fetching forecast:', error);
    res.status(500).json({ message: 'Error al obtener tu pronóstico' });
  }
});

// POST /api/pronosticos/submit - Submit or save predictions (supports partial save and final confirm)
router.post('/submit', authenticateJWT, requireApproved, async (req, res) => {
  try {
    const { championshipId, matches, isConfirmed } = req.body;

    if (!championshipId || !matches || !Array.isArray(matches)) {
      return res.status(400).json({ message: 'El ID de campeonato y los pronósticos son obligatorios' });
    }

    // Check if the championship is finished
    const championship = await Championship.findById(championshipId);
    if (!championship) {
      return res.status(404).json({ message: 'Campeonato no encontrado' });
    }

    if (championship.isFinished) {
      return res.status(400).json({ message: 'Este campeonato ha finalizado. No se permiten cambios.' });
    }

    // Check if user already has a confirmed forecast (locked)
    const existingForecast = await Forecast.findOne({
      userId: req.user._id,
      championshipId
    });

    if (existingForecast && existingForecast.isConfirmed) {
      return res.status(400).json({ 
        message: 'Tu pronóstico ya ha sido confirmado y bloqueado. No se permiten más modificaciones.' 
      });
    }

    // Fetch all matches of this championship to validate selections
    const dbMatches = await Match.find({ championshipId });
    const dbMatchIds = new Set(dbMatches.map(m => m._id.toString()));

    // Validate that all submitted matches belong to this championship
    for (const item of matches) {
      if (!dbMatchIds.has(item.matchId)) {
        return res.status(400).json({ 
          message: `El partido con ID ${item.matchId} no pertenece a este campeonato` 
        });
      }
      if (!['L', 'E', 'V'].includes(item.selection)) {
        return res.status(400).json({ 
          message: `Selección inválida ('${item.selection}') para el partido ${item.matchId}. Debe ser L, E o V.` 
        });
      }
    }

    // If attempting to confirm, check if it's 100% complete
    if (isConfirmed) {
      if (matches.length < dbMatches.length) {
        return res.status(400).json({ 
          message: `Pronóstico incompleto. Debes pronosticar los ${dbMatches.length} partidos para confirmar.` 
        });
      }
      // Ensure all matches are indeed covered
      const submittedMatchIds = new Set(matches.map(m => m.matchId));
      for (const dbMatch of dbMatches) {
        if (!submittedMatchIds.has(dbMatch._id.toString())) {
          return res.status(400).json({ 
            message: `Falta pronosticar el partido: ${dbMatch.localTeam} vs ${dbMatch.visitorTeam}` 
          });
        }
      }
    }

    // Upsert the forecast
    let forecast = existingForecast;
    if (!forecast) {
      forecast = new Forecast({
        userId: req.user._id,
        championshipId
      });
    }

    forecast.matches = matches.map(m => ({
      matchId: m.matchId,
      selection: m.selection
    }));
    forecast.isConfirmed = !!isConfirmed;
    if (isConfirmed) {
      forecast.confirmedAt = new Date();
    }

    await forecast.save();

    res.json({
      message: isConfirmed 
        ? '¡Pronóstico confirmado y bloqueado con éxito! Mucha suerte.' 
        : 'Borrador guardado con éxito. Recuerda confirmar antes del inicio del campeonato.',
      forecast
    });

  } catch (error) {
    console.error('Error saving forecast:', error);
    res.status(500).json({ message: 'Error al procesar el pronóstico' });
  }
});

module.exports = router;
