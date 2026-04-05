const express = require('express');
const Registro = require('../models/Registro');
const Torneo = require('../models/Torneo');
const auth = require('../middleware/auth');
const router = express.Router();

// IMPORTANT: specific routes before parameterized routes

// Get registration statistics (admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Registro.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const torneoStats = await Registro.aggregate([
      {
        $lookup: {
          from: 'torneos',
          localField: 'torneoId',
          foreignField: '_id',
          as: 'torneo'
        }
      },
      {
        $group: {
          _id: '$torneoId',
          torneoName: { $first: { $arrayElemAt: ['$torneo.nombre', 0] } },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byCategory: stats,
      byTorneo: torneoStats,
      total: await Registro.countDocuments()
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Get registros by torneo (public) — before /:id to avoid conflict
router.get('/torneo/:torneoId', async (req, res) => {
  try {
    const { torneoId } = req.params;
    const { category } = req.query;

    const filter = { torneoId };
    if (category) filter.category = category;

    const registros = await Registro.find(filter)
      .sort({ registeredAt: 1 })
      .select('-captainPhone -notes');

    res.json(registros);
  } catch (error) {
    console.error('Get registros by torneo error:', error);
    res.status(500).json({ error: 'Error obteniendo registros del torneo' });
  }
});

// Get all registros (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const { torneoId, category, status } = req.query;
    const filter = {};

    if (torneoId) filter.torneoId = torneoId;
    if (category) filter.category = category;
    if (status) filter.status = status;

    const registros = await Registro.find(filter)
      .populate('torneoId', 'nombre fecha hora tipoFormato modalidad estado')
      .sort({ registeredAt: -1 });

    res.json(registros);
  } catch (error) {
    console.error('Get registros error:', error);
    res.status(500).json({ error: 'Error obteniendo registros' });
  }
});

// Get single registro (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id)
      .populate('torneoId', 'nombre fecha hora tipoFormato modalidad estado');

    if (!registro) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json(registro);
  } catch (error) {
    console.error('Get registro error:', error);
    res.status(500).json({ error: 'Error obteniendo registro' });
  }
});

// Create registro (public — anyone can register)
router.post('/', async (req, res) => {
  try {
    const { category, torneoId, teamName, players, captainPhone, notes } = req.body;

    if (!category || !torneoId || !players || !captainPhone) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Validate torneo exists and accepts this category
    const torneo = await Torneo.findById(torneoId);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.modalidad && torneo.modalidad !== category) {
      return res.status(400).json({ error: 'Este torneo no acepta esa categoría' });
    }

    if (torneo.estado !== 'inscripcion') {
      return res.status(400).json({ error: 'Este torneo ya no acepta inscripciones' });
    }

    // Check for duplicate ML IDs in the same torneo
    const existingRegistros = await Registro.find({ torneoId });
    const existingMlIds = new Set();
    existingRegistros.forEach(reg => {
      reg.players.forEach(player => {
        if (player.mlId) existingMlIds.add(player.mlId.toLowerCase());
      });
    });

    for (const player of players) {
      if (!player.mlId) continue;
      const mlIdLower = player.mlId.toLowerCase();
      if (existingMlIds.has(mlIdLower)) {
        return res.status(400).json({
          error: `El ID ML "${player.mlId}" ya está registrado en este torneo`
        });
      }
    }

    const registro = new Registro({
      category,
      torneoId,
      teamName: teamName ? teamName.trim() : null,
      players,
      captainPhone: captainPhone.trim(),
      notes: notes ? notes.trim() : null
    });

    await registro.save();

    // Populate torneo info for response
    await registro.populate('torneoId', 'nombre fecha hora tipoFormato modalidad estado');

    const io = req.app.get('io');
    io.emit('registro-created', registro);
    io.to(`torneo-${torneoId}`).emit('new-registration', registro);

    res.status(201).json({ message: 'Inscripción exitosa', registro });
  } catch (error) {
    console.error('Create registro error:', error);
    if (error.message && (error.message.includes('capitán') || error.message.includes('jugadores'))) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error creando registro' });
  }
});

// Update registro (admin only) — with field whitelist
router.put('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id);
    if (!registro) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    // Whitelist: only allow status and notes updates
    const allowed = ['status', 'notes'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        registro[key] = req.body[key];
      }
    });

    await registro.save();

    const io = req.app.get('io');
    io.to(`torneo-${registro.torneoId}`).emit('registro-updated', registro);

    res.json({ message: 'Registro actualizado', registro });
  } catch (error) {
    console.error('Update registro error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error actualizando registro' });
  }
});

// Delete registro (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id);
    if (!registro) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const torneoId = registro.torneoId;
    await Registro.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    io.emit('registro-deleted', { id: req.params.id, torneoId });
    io.to(`torneo-${torneoId}`).emit('registration-deleted', { id: req.params.id });

    res.json({ message: 'Registro eliminado' });
  } catch (error) {
    console.error('Delete registro error:', error);
    res.status(500).json({ error: 'Error eliminando registro' });
  }
});

module.exports = router;
