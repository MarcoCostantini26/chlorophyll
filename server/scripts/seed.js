const mongoose = require('mongoose');
// Assicurati che i percorsi dei modelli siano corretti rispetto a dove si trova questo file
const User = require('../models/User');
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

// --- CONFIGURAZIONE CONNESSIONE ---
// Inserisci qui la tua password reale di Atlas
const DB_PASSWORD = 'chlorophyll'; 

// Stringa di connessione completa (nota che ho aggiunto '/chlorophyll' dopo .net)
const MONGO_URI = `mongodb+srv://admin:${DB_PASSWORD}@cluster0.xscku4p.mongodb.net/chlorophyll?appName=Cluster0`;
// ----------------------------------

// Coordinate base (Bologna Centro)
const BOLOGNA_LAT = 44.494887;
const BOLOGNA_LNG = 11.342616;

const seedDB = async () => {
  try {
    console.log('⏳ Tentativo di connessione a MongoDB Atlas...');
    
    // 1. Connessione
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Connesso a Chlorophyll DB su Atlas!');

    // 2. Pulizia Totale
    console.log('🧹 Pulizia delle collezioni precedenti...');
    await User.deleteMany({});
    await Tree.deleteMany({});
    await ActionLog.deleteMany({});
    console.log('✨ Database pulito.');

    // 3. Creazione Utenti
    const users = await User.create([
      { username: 'Marco', email: 'marco@unibo.it', role: 'green_guardian', xp: 120 },
      { username: 'Gabriele', email: 'gabriele@unibo.it', role: 'green_guardian', xp: 90 },
      { username: 'CityManager', email: 'admin@city.it', role: 'city_manager' }
    ]);
    console.log(`👥 ${users.length} Utenti creati.`);

    // 4. Creazione Alberi (Digital Twins)
    const trees = await Tree.create([
      {
        name: 'Grande Quercia Giardini',
        species: 'Quercus',
        location: { lat: BOLOGNA_LAT + 0.001, lng: BOLOGNA_LNG + 0.001 },
        waterLevel: 40,
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
        status: 'critical'
      }
    ]);
    console.log(`🌳 ${trees.length} Alberi piantati.`);

    // 5. Creazione Log (simulazione azioni)
    await ActionLog.create([
      { user: users[0]._id, tree: trees[0]._id, actionType: 'water', details: 'Annaffiatoio standard' },
      { user: users[1]._id, tree: trees[2]._id, actionType: 'report', details: 'Foglie marroni visibili' }
    ]);
    console.log('📝 Log delle azioni registrati.');

    console.log('✅ SEEDING COMPLETATO CON SUCCESSO!');
    process.exit(0);

  } catch (err) {
    console.error('❌ ERRORE DURANTE IL SEEDING:', err);
    process.exit(1);
  }
};

seedDB();