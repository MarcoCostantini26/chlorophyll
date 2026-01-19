const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false }, // Aggiunto come richiesto
  role: { type: String, default: 'green_guardian' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }, // Perfetto, è "level"
  badges: { type: [String], default: [] },
  avatar: { type: String, default: '👤' },
  stats: { type: Object, default: {} }, // Aggiunto come richiesto
  adoptedTrees: { type: [String], default: [] } 
});

module.exports = mongoose.model('User', UserSchema);