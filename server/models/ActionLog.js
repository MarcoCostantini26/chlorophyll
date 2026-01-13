const mongoose = require('mongoose');

const ActionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tree: { type: mongoose.Schema.Types.ObjectId, ref: 'Tree', required: true },
  actionType: { 
    type: String, 
    enum: ['water', 'prune', 'report', 'adopt'], 
    required: true 
  },
  details: { type: String }, // Es. "Aggiunti 5 litri d'acqua"
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActionLog', ActionLogSchema);