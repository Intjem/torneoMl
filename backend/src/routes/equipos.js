const express  = require('express');
const router   = express.Router();
const Equipo   = require('../models/Equipo');
const Torneo   = require('../models/Torneo');
const auth     = require('../middleware/auth');

const { MAX_TITULARS, MAX_SUBS } = require('../models/Equipo');

// ── GET all equipos (public) ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, category, torneoId } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (torneoId === 'null') filter.torneoId = null;
    else if (torneoId)       filter.torneoId = torneoId;

    const equipos = await Equipo.find(filter)
      .populate('torneoId', 'nombre fecha hora modalidad estado')
      .sort({ createdAt: -1 });

    // Attach slot info
    const withSlots = equipos.map(eq => {
      const obj = eq.toObject({ virtuals: true });
      obj.slots = eq.getSlots();
      return obj;
    });

    res.json(withSlots);
  } catch (err) {
    console.error('Get equipos error:', err);
    res.status(500).json({ error: 'Error obteniendo equipos' });
  }
});

// ── GET single equipo (public) ────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const equipo = await Equipo.findById(req.params.id)
      .populate('torneoId', 'nombre fecha hora modalidad estado');
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    const obj = equipo.toObject({ virtuals: true });
    obj.slots = equipo.getSlots();
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo equipo' });
  }
});

// ── POST create equipo (captain) ───────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { teamName, category, captainPhone } = req.body;

    if (!category)    return res.status(400).json({ error: 'La categoría es requerida' });
    if (!req.user.mlId) return res.status(400).json({ error: 'Debes tener un ID ML en tu perfil' });
    if (!req.user.nick) return res.status(400).json({ error: 'Debes tener un nick en tu perfil' });
    if (!captainPhone)return res.status(400).json({ error: 'El teléfono de contacto es requerido' });

    // Prevent duplicate captain in same category (optional: allow multiple teams)
    // Skipped for flexibility

    const equipo = new Equipo({
      teamName: teamName ? teamName.trim() : undefined,
      category,
      captain: {
        mlId:  req.user.mlId,
        nick:  req.user.nick,
        phone: captainPhone.trim()
      },
      players: [],
      status: 'formando'
    });

    await equipo.save();

    const obj = equipo.toObject({ virtuals: true });
    obj.slots = equipo.getSlots();
    res.status(201).json({ message: 'Equipo creado exitosamente', equipo: obj });
  } catch (err) {
    console.error('Create equipo error:', err);
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Error creando equipo' });
  }
});

// ── POST join equipo (any player) ─────────────────────────────────────────────
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { substitute } = req.body;
    const { mlId, nick } = req.user;
    
    if (!mlId || !nick) return res.status(400).json({ error: 'Necesitas tener ID ML y nick en tu perfil para unirte' });

    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    if (equipo.status === 'inscrito') {
      return res.status(400).json({ error: 'Este equipo ya está inscrito en un torneo y no acepta más jugadores' });
    }

    const mlIdTrim = mlId.trim();

    // Avoid duplicates
    if (equipo.captain.mlId === mlIdTrim) {
      return res.status(409).json({ error: 'Ya eres el capitán de este equipo' });
    }
    if (equipo.players.some(p => p.mlId === mlIdTrim)) {
      return res.status(409).json({ error: 'Ya estás registrado en este equipo' });
    }

    const isSub = !!substitute;
    const slots = equipo.getSlots();

    if (isSub) {
      if (slots.subsLeft <= 0) return res.status(400).json({ error: 'No hay cupos de suplente disponibles' });
    } else {
      if (slots.titularsLeft <= 0) return res.status(400).json({ error: 'No hay cupos de titular disponibles' });
    }

    equipo.players.push({ mlId: mlIdTrim, nick: nick.trim(), substitute: isSub });
    await equipo.save();

    const obj = equipo.toObject({ virtuals: true });
    obj.slots = equipo.getSlots();
    res.json({ message: 'Te has unido al equipo exitosamente', equipo: obj });
  } catch (err) {
    console.error('Join equipo error:', err);
    res.status(500).json({ error: 'Error uniéndose al equipo' });
  }
});

// ── POST inscribir equipo a torneo (captain only, verified by mlId) ────────────
router.post('/:id/inscribir', auth, async (req, res) => {
  try {
    const { torneoId } = req.body;
    const captainMlId = req.user.mlId;
    
    if (!torneoId)    return res.status(400).json({ error: 'Selecciona un torneo' });
    if (!captainMlId) return res.status(400).json({ error: 'Necesitas un ID ML en tu cuenta' });

    const equipo = await Equipo.findById(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });

    // Verify captain identity
    if (equipo.captain.mlId !== captainMlId.trim()) {
      return res.status(403).json({ error: 'Solo el capitán puede inscribir el equipo (ID ML no coincide con tu cuenta)' });
    }

    if (equipo.status === 'inscrito') {
      return res.status(400).json({ error: 'Este equipo ya está inscrito en un torneo' });
    }

    // Validate torneo
    const torneo = await Torneo.findById(torneoId);
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' });
    if (torneo.estado !== 'inscripcion') {
      return res.status(400).json({ error: 'Este torneo ya no acepta inscripciones' });
    }
    if (torneo.modalidad && torneo.modalidad !== equipo.category) {
      return res.status(400).json({ error: `Este torneo es solo para categoría "${torneo.modalidad}", tu equipo es "${equipo.category}"` });
    }

    equipo.torneoId = torneoId;
    equipo.status   = 'inscrito';
    await equipo.save();
    await equipo.populate('torneoId', 'nombre fecha hora modalidad');

    const obj = equipo.toObject({ virtuals: true });
    obj.slots = equipo.getSlots();

    // Notify via socket if available
    try {
      const io = req.app.get('io');
      if (io) io.emit('equipo-inscrito', obj);
    } catch (_) {}

    res.json({ message: '¡Equipo inscrito al torneo exitosamente!', equipo: obj });
  } catch (err) {
    console.error('Inscribir equipo error:', err);
    res.status(500).json({ error: 'Error inscribiendo el equipo' });
  }
});

// ── DELETE equipo (admin only) ────────────────────────────────────────────────
router.delete('/:id', auth.admin, async (req, res) => {
  try {
    const equipo = await Equipo.findByIdAndDelete(req.params.id);
    if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json({ message: 'Equipo eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando equipo' });
  }
});

module.exports = router;
