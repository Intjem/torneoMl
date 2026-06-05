const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

function publicAccount(account, source) {
  return {
    _id: account._id,
    id: account._id,
    email: account.email,
    role: account.role || 'player',
    mlId: account.mlId || '',
    nick: account.nick || '',
    lastLogin: account.lastLogin,
    source
  };
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_change_me');
    let account = null;
    let source = decoded.source || decoded.type || 'user';

    if (source === 'admin') {
      account = await Admin.findById(decoded.id);
    } else {
      account = await User.findById(decoded.id);
      if (!account) {
        account = await Admin.findById(decoded.id);
        source = 'admin';
      }
    }
    
    if (!account) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.account = account;
    req.authSource = source;
    req.user = publicAccount(account, source);
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      req.admin = account;
    }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error in authentication.' });
  }
};

auth.admin = (req, res, next) => {
  auth(req, res, () => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'No tienes permisos de administrador' });
    }
    next();
  });
};

module.exports = auth;
