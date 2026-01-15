const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: 'green_guardian' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  
  badges: [{ type: String }],
  stats: {
    waterCount: { type: Number, default: 0 }, // Totale volte innaffiato
    savedTrees: { type: Number, default: 0 }  // Alberi salvati da morte certa
  }
});

module.exports = mongoose.model('User', UserSchema);