const mongoose = require('mongoose');

const torneoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  fecha: {
    type: String,
    required: true
  },
  hora: {
    type: String,
    required: true
  },
  tipoFormato: {
    type: String,
    enum: ['eliminatoria', 'liga'],
    required: true
  },
  modalidad: {
    type: String,
    enum: ['individual', '1v1', '2v2', '4v4'],
    required: true
  },
  estado: {
    type: String,
    enum: ['inscripcion', 'en_curso', 'finalizado'],
    default: 'inscripcion'
  },
  descripcion: {
    type: String,
    maxlength: 500
  },
  premios: {
    type: String,
    maxlength: 300
  },
  reglas: {
    type: String,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  bracket: {
    main: [{
      registroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registro' },
      position: Number
    }],
    waitlist: [{
      registroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registro' },
      position: Number
    }]
  },
  knockoutBracket: {
    rounds: [{
      matches: [{
        player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Registro' },
        player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Registro' },
        winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Registro' },
        score1: { type: Number, default: 0 },
        score2: { type: Number, default: 0 },
        finished: { type: Boolean, default: false }
      }]
    }]
  }
});

// Update timestamp on save
torneoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
torneoSchema.index({ estado: 1, modalidad: 1 });
torneoSchema.index({ fecha: 1 });

module.exports = mongoose.model('Torneo', torneoSchema);
