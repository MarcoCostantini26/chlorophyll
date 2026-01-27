const mongoose = require('mongoose');

const TreeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['tree', 'flowerbed', 'vertical_garden', 'hedge', 'bush', 'potted', 'succulent'],
    default: 'tree' 
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  
  // 👇 AGGIUNGI QUESTA RIGA QUI! 👇
  city: { type: String, default: null }, 
  // 👆 SENZA QUESTA, IL DB NON SALVA NULLA! 👆

  waterLevel: { type: Number, default: 100 },
  status: { type: String, default: 'healthy' },
  history: [
    {
      val: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  lastWatered: { type: Date, default: Date.now },
  plantedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tree', TreeSchema);