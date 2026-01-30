const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false },
  role: { type: String, default: 'green_guardian' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: { type: [String], default: [] },
  avatar: { type: String, default: '👤' },
  stats: { type: Object, default: {} },
  adoptedTrees: { type: [String], default: [] } 
});

module.exports = mongoose.model('User', UserSchema);