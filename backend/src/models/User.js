const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 4
  },
  role: {
    type: String,
    enum: ['player', 'admin', 'superadmin'],
    default: 'player'
  },
  mlId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: 32
  },
  nick: {
    type: String,
    trim: true,
    maxlength: 80
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

userSchema.pre('validate', function(next) {
  if (this.role === 'player') {
    if (!this.mlId || !this.mlId.trim()) {
      this.invalidate('mlId', 'El ID ML es requerido para jugadores');
    }
    if (!this.nick || !this.nick.trim()) {
      this.invalidate('nick', 'El nick es requerido para jugadores');
    }
  }
  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
