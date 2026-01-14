const mongoose = require('mongoose');

const ActionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Collega all'utente
    required: false // Se è un ospite o sistema, potrebbe essere null
  },
  tree: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tree', // Collega all'albero
    required: true
  },
  actionType: {
    type: String,
    enum: ['water', 'prune', 'treat', 'report'],
    default: 'water'
  },
  details: { type: String },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActionLog', ActionLogSchema);