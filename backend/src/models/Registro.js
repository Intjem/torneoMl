const mongoose = require('mongoose');
const validator = require('validator');

const registroSchema = new mongoose.Schema({
  // Información básica
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
  
  // Jugadores
  players: [{
    mlId: {
      type: String,
      required: true,
      trim: true
    },
    nick: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    role: {
      type: String,
      enum: ['tank', 'fighter', 'assassin', 'mage', 'marksman', 'support'],
      default: null
    }
  }],
  
  // Contacto
  captainPhone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return validator.isMobilePhone(v, 'any', { strictMode: false });
      },
      message: 'Número de teléfono no válido'
    }
  },
  
  // Estado
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  
  // Metadata
  registeredAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500
  }
});

// Validar cantidad de jugadores según categoría
registroSchema.pre('save', function(next) {
  const categoryPlayerCount = {
    'individual': 1,
    '1v1': 1,
    '2v2': 2,
    '4v4': 4
  };
  
  const expectedCount = categoryPlayerCount[this.category];
  if (this.players.length !== expectedCount) {
    const error = new Error(`La categoría ${this.category} requiere ${expectedCount} jugadores`);
    return next(error);
  }
  
  next();
});

// Índices para mejor rendimiento
registroSchema.index({ torneoId: 1, registeredAt: 1 });
registroSchema.index({ category: 1, status: 1 });
registroSchema.index({ 'players.mlId': 1 });

module.exports = mongoose.model('Registro', registroSchema);
