const express = require('express');
const Torneo = require('../models/Torneo');
const auth = require('../middleware/auth');
const router = express.Router();

// Allowed fields for update (whitelist)
const TORNEO_UPDATE_FIELDS = [
  'nombre', 'fecha', 'hora', 'tipoFormato', 'modalidad',
  'estado', 'descripcion', 'premios', 'reglas'
];

// Get all torneos (public)
router.get('/', async (req, res) => {
  try {
    const { estado, modalidad } = req.query;
    const filter = {};

    if (estado) filter.estado = estado;
    if (modalidad) filter.modalidad = modalidad;

    const torneos = await Torneo.find(filter).sort({ createdAt: -1 });
    res.json(torneos);
  } catch (error) {
    console.error('Get torneos error:', error);
    res.status(500).json({ error: 'Error obteniendo torneos' });
  }
});

// Get single torneo (public)
router.get('/:id', async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);

    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    res.json(torneo);
  } catch (error) {
    console.error('Get torneo error:', error);
    res.status(500).json({ error: 'Error obteniendo torneo' });
  }
});

// Create torneo (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, fecha, hora, tipoFormato, modalidad, descripcion, premios, reglas } = req.body;

    if (!nombre || !fecha || !hora || !tipoFormato || !modalidad) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const torneo = new Torneo({
      nombre: nombre.trim(),
      fecha: fecha.trim(),
      hora: hora.trim(),
      tipoFormato,
      modalidad,
      descripcion,
      premios,
      reglas
    });

    await torneo.save();

    const io = req.app.get('io');
    io.emit('torneo-created', torneo);

    res.status(201).json({ message: 'Torneo creado', torneo });
  } catch (error) {
    console.error('Create torneo error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error creando torneo' });
  }
});

// Update torneo (admin only) — with field whitelist
router.put('/:id', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    // Only allow whitelisted fields
    TORNEO_UPDATE_FIELDS.forEach(key => {
      if (req.body[key] !== undefined) {
        torneo[key] = req.body[key];
      }
    });

    await torneo.save();

    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('torneo-updated', torneo);
    io.emit('torneo-list-changed', { id: torneo._id });

    res.json({ message: 'Torneo actualizado', torneo });
  } catch (error) {
    console.error('Update torneo error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error actualizando torneo' });
  }
});

// Delete torneo (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    await Torneo.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    io.emit('torneo-deleted', { id: req.params.id });

    res.json({ message: 'Torneo eliminado' });
  } catch (error) {
    console.error('Delete torneo error:', error);
    res.status(500).json({ error: 'Error eliminando torneo' });
  }
});

// Update bracket (admin only)
router.put('/:id/bracket', auth, async (req, res) => {
  try {
    const { bracket } = req.body;
    if (!bracket || !bracket.main || !bracket.waitlist) {
      return res.status(400).json({ error: 'Datos de bracket inválidos' });
    }

    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    torneo.bracket = bracket;
    await torneo.save();

    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('bracket-updated', torneo);

    res.json({ message: 'Bracket actualizado', torneo });
  } catch (error) {
    console.error('Update bracket error:', error);
    res.status(500).json({ error: 'Error actualizando bracket' });
  }
});

// Generate knockout bracket (admin only)
router.post('/:id/knockout', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.tipoFormato !== 'eliminatoria') {
      return res.status(400).json({ error: 'El torneo debe ser formato eliminatoria' });
    }

    if (torneo.bracket.main.length !== 8) {
      return res.status(400).json({ error: 'Se necesitan exactamente 8 participantes en el grupo principal' });
    }

    const knockoutBracket = generateKnockoutBracket(torneo.bracket.main);
    torneo.knockoutBracket = knockoutBracket;
    await torneo.save();

    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('knockout-updated', torneo);

    res.json({ message: 'Llaves generadas', torneo });
  } catch (error) {
    console.error('Generate knockout error:', error);
    res.status(500).json({ error: 'Error generando llaves' });
  }
});

// Update knockout results (admin only)
router.put('/:id/knockout/results', auth, async (req, res) => {
  try {
    const { knockoutBracket } = req.body;

    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    torneo.knockoutBracket = knockoutBracket;
    await torneo.save();

    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('knockout-results-updated', torneo);

    res.json({ message: 'Resultados actualizados', torneo });
  } catch (error) {
    console.error('Update knockout results error:', error);
    res.status(500).json({ error: 'Error actualizando resultados' });
  }
});

// Helper: generate 8-player single elimination bracket
function generateKnockoutBracket(mainPlayers) {
  const s = mainPlayers.map(p => p.registroId);
  return {
    rounds: [
      {
        label: 'Cuartos de final',
        matches: [
          { player1: s[0], player2: s[7], winner: null, score1: 0, score2: 0, finished: false },
          { player1: s[3], player2: s[4], winner: null, score1: 0, score2: 0, finished: false },
          { player1: s[2], player2: s[5], winner: null, score1: 0, score2: 0, finished: false },
          { player1: s[1], player2: s[6], winner: null, score1: 0, score2: 0, finished: false }
        ]
      },
      {
        label: 'Semifinales',
        matches: [
          { player1: null, player2: null, winner: null, score1: 0, score2: 0, finished: false },
          { player1: null, player2: null, winner: null, score1: 0, score2: 0, finished: false }
        ]
      },
      {
        label: 'Final',
        matches: [
          { player1: null, player2: null, winner: null, score1: 0, score2: 0, finished: false }
        ]
      }
    ]
  };
}

module.exports = router;
