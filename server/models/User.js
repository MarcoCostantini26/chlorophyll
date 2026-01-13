const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['green_guardian', 'city_manager', 'public_monitor'], 
    default: 'green_guardian' 
  },
  xp: { type: Number, default: 0 }, // Punti esperienza
  level: { type: Number, default: 1 }, // Livello utente
  adoptedTrees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tree' }] // Alberi adottati
});

module.exports = mongoose.model('User', UserSchema);