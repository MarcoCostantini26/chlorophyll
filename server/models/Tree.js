const mongoose = require('mongoose');

const TreeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Es. "Quercia di Piazza Verdi"
  species: { type: String, required: true }, // Es. "Quercus Robur"
  
  // Posizione per la Mappa (Leaflet usa [lat, lng])
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },

  // Stato Vitale (Il "Digital Twin")
  health: { type: Number, default: 100, min: 0, max: 100 }, // 100 = Ottimo
  waterLevel: { type: Number, default: 80, min: 0, max: 100 }, // Umidità simulata
  lastWatered: { type: Date, default: Date.now },
  
  // Per l'AI e lo stato
  status: { 
    type: String, 
    enum: ['healthy', 'thirsty', 'critical', 'danger'], 
    default: 'healthy' 
  },

  // Gestione Concorrenza (Thread-Safety simulata)
  isLocked: { type: Boolean, default: false }, // Se true, qualcuno sta interagendo
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lockedAt: { type: Date, default: null } // Per scadenza lock automatico
});

module.exports = mongoose.model('Tree', TreeSchema);