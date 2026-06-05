const mongoose = require('mongoose');

// Max non-captain players per category
const MAX_TITULARS = { individual: 0, '1v1': 0, '2v2': 1, '4v4': 3 };
const MAX_SUBS     = { individual: 0, '1v1': 0, '2v2': 0, '4v4': 3 };

const playerSchema = new mongoose.Schema({
  mlId:      { type: String, required: true, trim: true, maxlength: 32 },
  nick:      { type: String, required: true, trim: true, maxlength: 80 },
  substitute:{ type: Boolean, default: false }
}, { _id: false });

const equipoSchema = new mongoose.Schema({
  teamName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['individual', '1v1', '2v2', '4v4'],
    required: true
  },
  captain: {
    mlId:  { type: String, required: true, trim: true, maxlength: 32 },
    nick:  { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 }
  },
  // Non-captain players (titulars + substitutes)
  players: [playerSchema],
  torneoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Torneo',
    default: null
  },
  status: {
    type: String,
    enum: ['formando', 'inscrito'],
    default: 'formando'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual: total slots used
equipoSchema.virtual('totalMembers').get(function() {
  return 1 + this.players.length; // captain + players
});

// Helper to check remaining slots
equipoSchema.methods.getSlots = function() {
  const maxT = MAX_TITULARS[this.category] || 0;
  const maxS = MAX_SUBS[this.category] || 0;
  const usedT = this.players.filter(p => !p.substitute).length;
  const usedS = this.players.filter(p =>  p.substitute).length;
  return {
    titularsLeft:   maxT - usedT,
    subsLeft:       maxS - usedS,
    maxTitulars: maxT,
    maxSubs:     maxS
  };
};

equipoSchema.index({ status: 1, category: 1, createdAt: -1 });
equipoSchema.index({ 'captain.mlId': 1 });
equipoSchema.index({ torneoId: 1 });

module.exports = mongoose.model('Equipo', equipoSchema);
module.exports.MAX_TITULARS = MAX_TITULARS;
module.exports.MAX_SUBS     = MAX_SUBS;
