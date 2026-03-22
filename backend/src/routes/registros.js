const express = require('express');
const Registro = require('../models/Registro');
const Torneo = require('../models/Torneo');
const auth = require('../middleware/auth');
const router = express.Router();

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
    res.status(500).json({ error: 'Server error fetching registros' });
  }
});

// Get single registro (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id)
      .populate('torneoId', 'nombre fecha hora tipoFormato modalidad estado');
    
    if (!registro) {
      return res.status(404).json({ error: 'Registro not found' });
    }
    
    res.json(registro);
  } catch (error) {
    console.error('Get registro error:', error);
    res.status(500).json({ error: 'Server error fetching registro' });
  }
});

// Create registro (public)
router.post('/', async (req, res) => {
  try {
    const {
      category,
      torneoId,
      teamName,
      players,
      captainPhone,
      notes
    } = req.body;

    // Validation
    if (!category || !torneoId || !players || !captainPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate torneo exists and accepts this category
    const torneo = await Torneo.findById(torneoId);
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo not found' });
    }

    if (torneo.modalidad && torneo.modalidad !== category) {
      return res.status(400).json({ error: 'Torneo does not accept this category' });
    }

    if (torneo.estado !== 'inscripcion') {
      return res.status(400).json({ error: 'Torneo is not accepting registrations' });
    }

    // Check for duplicate ML IDs in the same torneo
    const existingRegistros = await Registro.find({ torneoId });
    const existingMlIds = new Set();
    existingRegistros.forEach(reg => {
      reg.players.forEach(player => {
        existingMlIds.add(player.mlId.toLowerCase());
      });
    });

    const newMlIds = new Set();
    players.forEach(player => {
      const mlIdLower = player.mlId.toLowerCase();
      if (existingMlIds.has(mlIdLower) || newMlIds.has(mlIdLower)) {
        throw new Error(`Duplicate ML ID: ${player.mlId}`);
      }
      newMlIds.add(mlIdLower);
    });

    // Create registro
    const registro = new Registro({
      category,
      torneoId,
      teamName: teamName?.trim(),
      players,
      captainPhone: captainPhone.trim(),
      notes: notes?.trim()
    });

    await registro.save();

    // Populate torneo info for response
    await registro.populate('torneoId', 'nombre fecha hora tipoFormato modalidad estado');

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('registro-created', registro);
    io.to(`torneo-${torneoId}`).emit('new-registration', registro);

    res.status(201).json({
      message: 'Registration successful',
      registro
    });
  } catch (error) {
    console.error('Create registro error:', error);
    if (error.message.includes('Duplicate ML ID')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error creating registro' });
  }
});

// Update registro (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id);
    
    if (!registro) {
      return res.status(404).json({ error: 'Registro not found' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (key !== 'torneoId' && updates[key] !== undefined) { // Prevent changing torneoId
        registro[key] = updates[key];
      }
    });

    await registro.save();

    // Emit real-time update
    const io = req.app.get('io');
    io.to(`torneo-${registro.torneoId}`).emit('registro-updated', registro);

    res.json({
      message: 'Registro updated successfully',
      registro
    });
  } catch (error) {
    console.error('Update registro error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error updating registro' });
  }
});

// Delete registro (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const registro = await Registro.findById(req.params.id);
    
    if (!registro) {
      return res.status(404).json({ error: 'Registro not found' });
    }

    const torneoId = registro.torneoId;
    await Registro.findByIdAndDelete(req.params.id);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('registro-deleted', { id: req.params.id, torneoId });
    io.to(`torneo-${torneoId}`).emit('registration-deleted', { id: req.params.id });

    res.json({ message: 'Registro deleted successfully' });
  } catch (error) {
    console.error('Delete registro error:', error);
    res.status(500).json({ error: 'Server error deleting registro' });
  }
});

// Get registros by torneo (public)
router.get('/torneo/:torneoId', async (req, res) => {
  try {
    const { torneoId } = req.params;
    const { category } = req.query;
    
    const filter = { torneoId };
    if (category) filter.category = category;
    
    const registros = await Registro.find(filter)
      .sort({ registeredAt: 1 })
      .select('-captainPhone -notes'); // Don't expose sensitive info publicly
    
    res.json(registros);
  } catch (error) {
    console.error('Get registros by torneo error:', error);
    res.status(500).json({ error: 'Server error fetching registros' });
  }
});

// Get registration statistics (admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Registro.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
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
          torneoName: { $first: '$torneo.nombre' },
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
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

module.exports = router;
