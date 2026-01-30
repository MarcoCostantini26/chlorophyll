const mongoose = require('mongoose');

const ActionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  tree: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tree',
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