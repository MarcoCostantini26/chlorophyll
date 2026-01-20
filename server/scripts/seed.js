const mongoose = require('mongoose');
const User = require('../models/User');
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

const DB_PASSWORD = 'chlorophyll'; 
const MONGO_URI = `mongodb+srv://admin:${DB_PASSWORD}@cluster0.xscku4p.mongodb.net/chlorophyll?appName=Cluster0`;

// Coordinate Bologna Centro
const CENTER_LAT = 44.494887;
const CENTER_LNG = 11.342616;

// Funzione Random Position
const getRandomPos = (baseLat, baseLng, latSpread = 0.015, lngSpread = 0.025) => {
  return {
    lat: baseLat + (Math.random() - 0.5) * latSpread,
    lng: baseLng + (Math.random() - 0.5) * lngSpread
  };
};

// --- NOMI FIGHI PER LE PIANTE ---
const treeNames = ["Quercia Maestosa", "Il Grande Platano", "Tiglio del Nonno", "Acero Rosso", "Ginkgo Biloba", "Castagno Antico", "Betulla Bianca"];
const flowerNames = ["Angolo di Tulipani", "Letto di Rose", "Fiori di Campo", "Margherite Selvagge", "Iris Blu", "Papaveri Rossi", "Violette Profumate"];
const hedgeNames = ["Muro Verde", "Labirinto di Bosso", "Confine Naturale", "Siepe Geometrica", "Barriera di Alloro"];
const bushNames = ["Lavanda Profumata", "Rosmarino Selvatico", "Cespuglio Spinoso", "Ginestra Gialla", "Salvia Ornamentale"];
const verticalNames = ["Cascata di Edera", "Parete Tropicale", "Muschio Verticale", "Felci Pensili"];
const potNames = ["Vaso di Petunie", "Gerani Rossi", "Begonia in Fiore", "Ciclamino Invernale", "Vaso di Basilico"];
const succNames = ["Cactus del Deserto", "Aloe Vera Curativa", "Cuscino della Suocera", "Stella di Giada", "Agave Gigante"];

const pickName = (list, index) => list[index % list.length] + (index >= list.length ? ` ${Math.floor(index/list.length)+1}` : '');

const seedDB = async () => {
  try {
    console.log('⏳ Connessione al DB...');
    await mongoose.connect(MONGO_URI);
    
    console.log('🧹 Ripopolamento foresta con nomi migliori...');
    await Tree.deleteMany({}); // Reset solo piante

    // --- UTENTI (Safe Mode) ---
    const usersCheck = [
        { u: 'CityManager', e: 'admin@city.it', r: 'city_manager' },
        { u: 'Marco', e: 'marco@unibo.it', r: 'green_guardian', xp: 120 },
        { u: 'Gabriele', e: 'gabriele@unibo.it', r: 'green_guardian', xp: 90 }
    ];

    for (const u of usersCheck) {
        await User.updateOne(
            { username: u.u },
            { $setOnInsert: { email: u.e, role: u.r, xp: u.xp || 0 } },
            { upsert: true }
        );
    }
    
    // --- CREAZIONE PIANTE CON NOMI FIGHI ---
    const plantsToCreate = [];

    // 1. IL FAMOSO PINO SOFFERENTE (Deve esistere!)
    plantsToCreate.push({
        name: "Pino Sofferente",
        category: 'tree', species: 'Pinus Pinea',
        location: getRandomPos(CENTER_LAT, CENTER_LNG, 0.005, 0.005),
        waterLevel: 5, status: 'critical' 
    });

    // 2. ALTRI ALBERI
    for (let i = 0; i < 14; i++) {
      plantsToCreate.push({
        name: pickName(treeNames, i),
        category: 'tree', species: i % 2 === 0 ? 'Platanus' : 'Tilia',
        location: getRandomPos(CENTER_LAT, CENTER_LNG, 0.02, 0.03),
        waterLevel: Math.floor(Math.random() * 80) + 10, 
        status: 'healthy'
      });
    }

    // 3. AIUOLE (Giardini)
    for (let i = 0; i < 10; i++) {
      plantsToCreate.push({
        name: pickName(flowerNames, i),
        category: 'flowerbed', species: 'Tulipa',
        location: getRandomPos(CENTER_LAT - 0.005, CENTER_LNG, 0.008, 0.015), 
        waterLevel: 90, status: 'healthy'
      });
    }

    // 4. SIEPI (Uni)
    for (let i = 0; i < 8; i++) {
      plantsToCreate.push({
        name: pickName(hedgeNames, i),
        category: 'hedge', species: 'Buxus',
        location: getRandomPos(CENTER_LAT, CENTER_LNG + 0.005, 0.01, 0.01),
        waterLevel: 45, status: 'thirsty'
      });
    }

    // 5. CESPUGLI
    for (let i = 0; i < 8; i++) {
      plantsToCreate.push({
        name: pickName(bushNames, i),
        category: 'bush', species: 'Lavandula',
        location: getRandomPos(CENTER_LAT, CENTER_LNG, 0.025, 0.035),
        waterLevel: 60, status: 'healthy'
      });
    }

    // 6. GIARDINI VERTICALI
    for (let i = 0; i < 5; i++) {
      plantsToCreate.push({
        name: pickName(verticalNames, i),
        category: 'vertical_garden', species: 'Mix',
        location: getRandomPos(CENTER_LAT, CENTER_LNG, 0.005, 0.005),
        waterLevel: 30, status: 'critical'
      });
    }

    // 7. FIORIERE (Viali)
    for (let i = 0; i < 10; i++) {
      plantsToCreate.push({
        name: pickName(potNames, i),
        category: 'potted', species: 'Petunia',
        location: getRandomPos(CENTER_LAT + 0.01, CENTER_LNG, 0.002, 0.04),
        waterLevel: 10, status: 'critical'
      });
    }

    // 8. PIANTE GRASSE
    for (let i = 0; i < 6; i++) {
      plantsToCreate.push({
        name: pickName(succNames, i),
        category: 'succulent', species: 'Agave',
        location: getRandomPos(CENTER_LAT, CENTER_LNG, 0.015, 0.015),
        waterLevel: 80, status: 'healthy'
      });
    }

    await Tree.insertMany(plantsToCreate);
    console.log(`🌿 Generate ${plantsToCreate.length} piante con nomi unici (incluso il Pino Sofferente)!`);

    console.log('✅ SEEDING COMPLETATO!');
    process.exit(0);

  } catch (err) {
    console.error('❌ ERRORE:', err);
    process.exit(1);
  }
};

seedDB();