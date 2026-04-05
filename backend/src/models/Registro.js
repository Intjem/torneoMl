const mongoose = require('mongoose');

const registroSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['individual', '1v1', '2v2', '4v4'],
    required: true
  },
  torneoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Torneo',
    required: true
  },
  teamName: {
    type: String,
    trim: true,
    maxlength: 100
  },

  players: [{
    mlId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32
    },
    nick: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    role: {
      type: String,
      enum: ['captain', 'player'],
      default: 'player'
    },
    substitute: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20
    }
  }],

  captainPhone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },

  registeredAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  }
});

// Validate player count per category (titulares + optional subs)
registroSchema.pre('save', function(next) {
  const minPlayers = { individual: 1, '1v1': 1, '2v2': 2, '4v4': 4 };
  const maxPlayers = { individual: 1, '1v1': 1, '2v2': 2, '4v4': 7 };

  const min = minPlayers[this.category] || 1;
  const max = maxPlayers[this.category] || 7;

  if (this.players.length < min || this.players.length > max) {
    return next(new Error(
      `La categoría ${this.category} requiere entre ${min} y ${max} jugadores, recibió ${this.players.length}`
    ));
  }

  // Ensure exactly one captain
  const captains = this.players.filter(p => p.role === 'captain');
  if (captains.length !== 1) {
    return next(new Error('Debe haber exactamente un capitán'));
  }

  // Captain cannot be substitute
  if (captains[0].substitute) {
    return next(new Error('El capitán no puede ser suplente'));
  }

  next();
});

registroSchema.index({ torneoId: 1, registeredAt: 1 });
registroSchema.index({ category: 1, status: 1 });
registroSchema.index({ 'players.mlId': 1 });

module.exports = mongoose.model('Registro', registroSchema);
