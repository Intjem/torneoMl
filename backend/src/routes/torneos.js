const express = require('express');
const Torneo = require('../models/Torneo');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all torneos (public)
router.get('/', async (req, res) => {
  try {
    const { estado, modalidad } = req.query;
    const filter = {};
    
    if (estado) filter.estado = estado;
    if (modalidad) filter.modalidad = modalidad;
    
    const torneos = await Torneo.find(filter)
      .sort({ createdAt: -1 })
      .populate('bracket.main.registroId', 'teamName players.nick category registeredAt')
      .populate('bracket.waitlist.registroId', 'teamName players.nick category registeredAt');
    
    res.json(torneos);
  } catch (error) {
    console.error('Get torneos error:', error);
    res.status(500).json({ error: 'Server error fetching torneos' });
  }
});

// Get single torneo (public)
router.get('/:id', async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id)
      .populate('bracket.main.registroId', 'teamName players.nick captainPhone category registeredAt')
      .populate('bracket.waitlist.registroId', 'teamName players.nick captainPhone category registeredAt')
      .populate('knockoutBracket.rounds.matches.player1', 'teamName players.nick category')
      .populate('knockoutBracket.rounds.matches.player2', 'teamName players.nick category')
      .populate('knockoutBracket.rounds.matches.winner', 'teamName players.nick category');
    
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }
    
    res.json(torneo);
  } catch (error) {
    console.error('Get torneo error:', error);
    res.status(500).json({ error: 'Server error fetching torneo' });
  }
});

// Create torneo (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const {
      nombre,
      fecha,
      hora,
      tipoFormato,
      modalidad,
      descripcion,
      premios,
      reglas
    } = req.body;

    // Validation
    if (!nombre || !fecha || !hora || !tipoFormato || !modalidad) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('torneo-created', torneo);

    res.status(201).json({
      message: 'Torneo created successfully',
      torneo
    });
  } catch (error) {
    console.error('Create torneo error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error creating torneo' });
  }
});

// Update torneo (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        torneo[key] = updates[key];
      }
    });

    await torneo.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('torneo-updated', torneo);

    res.json({
      message: 'Torneo updated successfully',
      torneo
    });
  } catch (error) {
    console.error('Update torneo error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error updating torneo' });
  }
});

// Delete torneo (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    await Torneo.findByIdAndDelete(req.params.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('torneo-deleted', { id: req.params.id });

    res.json({ message: 'Torneo deleted successfully' });
  } catch (error) {
    console.error('Delete torneo error:', error);
    res.status(500).json({ error: 'Server error deleting torneo' });
  }
});

// Update bracket (admin only)
router.put('/:id/bracket', auth, async (req, res) => {
  try {
    const { bracket } = req.body;
    
    if (!bracket || !bracket.main || !bracket.waitlist) {
      return res.status(400).json({ error: 'Invalid bracket data' });
    }

    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    torneo.bracket = bracket;
    await torneo.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('bracket-updated', torneo);

    res.json({
      message: 'Bracket updated successfully',
      torneo
    });
  } catch (error) {
    console.error('Update bracket error:', error);
    res.status(500).json({ error: 'Server error updating bracket' });
  }
});

// Generate knockout bracket (admin only)
router.post('/:id/knockout', auth, async (req, res) => {
  try {
    const torneo = await Torneo.findById(req.params.id);
    
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    if (torneo.tipoFormato !== 'eliminatoria') {
      return res.status(400).json({ error: 'Torneo must be elimination format' });
    }

    if (torneo.bracket.main.length !== 8) {
      return res.status(400).json({ error: 'Bracket must have exactly 8 main players' });
    }

    // Generate knockout bracket
    const knockoutBracket = generateKnockoutBracket(torneo.bracket.main);
    torneo.knockoutBracket = knockoutBracket;
    await torneo.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('knockout-updated', torneo);

    res.json({
      message: 'Knockout bracket generated successfully',
      torneo
    });
  } catch (error) {
    console.error('Generate knockout error:', error);
    res.status(500).json({ error: 'Server error generating knockout bracket' });
  }
});

// Update knockout results (admin only)
router.put('/:id/knockout/results', auth, async (req, res) => {
  try {
    const { knockoutBracket } = req.body;
    
    const torneo = await Torneo.findById(req.params.id);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    torneo.knockoutBracket = knockoutBracket;
    await torneo.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`torneo-${torneo._id}`).emit('knockout-results-updated', torneo);

    res.json({
      message: 'Knockout results updated successfully',
      torneo
    });
  } catch (error) {
    console.error('Update knockout results error:', error);
    res.status(500).json({ error: 'Server error updating knockout results' });
  }
});

// Helper function to generate knockout bracket
function generateKnockoutBracket(mainPlayers) {
  const rounds = [
    // Quarterfinals
    {
      matches: [
        { player1: mainPlayers[0].registroId, player2: mainPlayers[1].registroId },
        { player1: mainPlayers[2].registroId, player2: mainPlayers[3].registroId },
        { player1: mainPlayers[4].registroId, player2: mainPlayers[5].registroId },
        { player1: mainPlayers[6].registroId, player2: mainPlayers[7].registroId }
      ]
    },
    // Semifinals
    {
      matches: [
        { player1: null, player2: null }, // Winners will be populated after quarterfinals
        { player1: null, player2: null }
      ]
    },
    // Final
    {
      matches: [
        { player1: null, player2: null }
      ]
    }
  ];

  return { rounds };
}

module.exports = router;
