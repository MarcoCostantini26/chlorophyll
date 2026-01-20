const mongoose = require('mongoose');

const TreeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  // Categorie estese per il verde urbano
  category: {
    type: String,
    enum: ['tree', 'flowerbed', 'hedge', 'bush', 'vertical_garden', 'potted', 'succulent'],
    default: 'tree'
  },
  species: { 
    type: String, 
    required: true 
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  waterLevel: { 
    type: Number, 
    default: 100,
    min: 0,
    max: 100
  },
  health: { 
    type: Number, 
    default: 100,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['healthy', 'thirsty', 'critical'],
    default: 'healthy'
  },
  lastWatered: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tree', TreeSchema);