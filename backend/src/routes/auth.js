const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

function accountPayload(account, source) {
  return {
    id: account._id,
    email: account.email,
    role: account.role || 'player',
    mlId: account.mlId || '',
    nick: account.nick || '',
    lastLogin: account.lastLogin,
    source
  };
}

function signToken(account, source) {
  return jwt.sign(
    {
      id: account._id,
      email: account.email,
      role: account.role || 'player',
      source
    },
    process.env.JWT_SECRET || 'fallback_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function hasAdmin() {
  const [userAdminCount, legacyAdminCount] = await Promise.all([
    User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
    Admin.countDocuments()
  ]);
  return userAdminCount + legacyAdminCount > 0;
}

// Player registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, mlId, nick } = req.body;

    if (!email || !password || !mlId || !nick) {
      return res.status(400).json({ error: 'Email, contraseña, ID ML y nick son requeridos' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedMlId = String(mlId).trim();

    const [existingUser, existingAdmin, existingMlId] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail }),
      User.findOne({ mlId: normalizedMlId })
    ]);

    if (existingUser || existingAdmin) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    if (existingMlId) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese ID ML' });
    }

    const user = new User({
      email: normalizedEmail,
      password,
      role: 'player',
      mlId: normalizedMlId,
      nick: nick.trim()
    });

    await user.save();
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user, 'user');
    const payload = accountPayload(user, 'user');

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      token,
      user: payload
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya existe una cuenta con esos datos' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// General login: players and admins use the same endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let account = await User.findOne({ email: normalizedEmail });
    let source = 'user';

    if (!account) {
      account = await Admin.findOne({ email: normalizedEmail });
      source = 'admin';
    }

    if (!account) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    account.lastLogin = new Date();
    await account.save();

    const token = signToken(account, source);
    const payload = accountPayload(account, source);

    res.json({
      message: 'Login exitoso',
      token,
      user: payload,
      admin: payload.role === 'admin' || payload.role === 'superadmin' ? payload : undefined
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Current logged-in account
router.get('/me', auth, async (req, res) => {
  res.json({
    user: req.user,
    admin: req.user.role === 'admin' || req.user.role === 'superadmin' ? req.user : undefined
  });
});

// List registered players (admin only)
router.get('/players', auth.admin, async (req, res) => {
  try {
    const players = await User.find({ role: 'player' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Error obteniendo jugadores' });
  }
});

// Logout
router.post('/logout', auth, async (req, res) => {
  res.json({ message: 'Logout exitoso' });
});

// Check if admin setup is done
router.get('/status', async (req, res) => {
  try {
    res.json({ hasAdmin: await hasAdmin() });
  } catch (error) {
    res.status(500).json({ error: 'Error comprobando estado' });
  }
});

// Create initial admin - only works if NO admins exist
router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    if (await hasAdmin()) {
      return res.status(403).json({ error: 'Ya existe un administrador. Usa el login general.' });
    }

    const admin = new User({
      email: email.toLowerCase().trim(),
      password,
      role: 'admin'
    });

    await admin.save();

    res.status(201).json({
      message: 'Administrador creado exitosamente',
      admin: accountPayload(admin, 'user')
    });
  } catch (error) {
    console.error('Setup error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Change password for current account
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
    }

    const isMatch = await req.account.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    req.account.password = newPassword;
    await req.account.save();

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
