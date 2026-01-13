require('dotenv').config({ path: '../.env' }); // Carica variabili d'ambiente
const mongoose = require('mongoose');
const User = require('../models/User');
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

// Coordinate base (Es. Bologna Centro)
const BOLOGNA_LAT = 44.494887;
const BOLOGNA_LNG = 11.342616;

const seedDB = async () => {
  try {
    // 1. Connessione
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chlorophyll');
    console.log('🌱 Connesso per il seeding...');

    // 2. Pulizia Totale
    await User.deleteMany({});
    await Tree.deleteMany({});
    await ActionLog.deleteMany({});
    console.log('🧹 Database pulito.');

    // 3. Creazione Utenti
    const users = await User.create([
      { username: 'Marco', email: 'marco@unibo.it', role: 'green_guardian', xp: 120 },
      { username: 'Gabriele', email: 'gabriele@unibo.it', role: 'green_guardian', xp: 90 },
      { username: 'CityManager', email: 'admin@city.it', role: 'city_manager' }
    ]);
    console.log('👥 Utenti creati.');

    // 4. Creazione Alberi (Digital Twins)
    const trees = await Tree.create([
      {
        name: 'Grande Quercia Giardini',
        species: 'Quercus',
        location: { lat: BOLOGNA_LAT + 0.001, lng: BOLOGNA_LNG + 0.001 },
        waterLevel: 40, // Un po' assetata
        status: 'thirsty'
      },
      {
        name: 'Tiglio di Via Zamboni',
        species: 'Tilia',
        location: { lat: BOLOGNA_LAT - 0.002, lng: BOLOGNA_LNG - 0.001 },
        waterLevel: 90,
        status: 'healthy'
      },
      {
        name: 'Pino Sofferente',
        species: 'Pinus',
        location: { lat: BOLOGNA_LAT + 0.003, lng: BOLOGNA_LNG - 0.002 },
        waterLevel: 10,
        health: 30,
        status: 'critical' // Perfetto per testare l'AI
      }
    ]);
    console.log('🌳 Alberi piantati.');

    // 5. Creazione Log finti (per l'AI Admin)
    await ActionLog.create([
      { user: users[0]._id, tree: trees[0]._id, actionType: 'water', details: 'Annaffiatoio standard' },
      { user: users[1]._id, tree: trees[2]._id, actionType: 'report', details: 'Foglie marroni visibili' }
    ]);

    console.log('✅ Seeding completato con successo!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedDB();