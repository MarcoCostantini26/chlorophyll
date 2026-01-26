const mongoose = require('mongoose');
const User = require('../models/User');
const Tree = require('../models/Tree');

const DB_PASSWORD = 'chlorophyll'; 
const MONGO_URI = `mongodb+srv://admin:${DB_PASSWORD}@cluster0.xscku4p.mongodb.net/chlorophyll?appName=Cluster0`;

// --- NUOVE CITTÀ (Bologna, Cesena, Milano, Torino) ---
const CITIES = [
  { name: 'Bologna', lat: 44.4949, lng: 11.3426 },
  { name: 'Cesena', lat: 44.1396, lng: 12.2432 },
  { name: 'Milano', lat: 45.4642, lng: 9.1900 },
  { name: 'Torino', lat: 45.0703, lng: 7.6869 }
];

// Funzione Random Position
const getRandomPos = (baseLat, baseLng, latSpread = 0.015, lngSpread = 0.025) => {
  return {
    lat: baseLat + (Math.random() - 0.5) * latSpread,
    lng: baseLng + (Math.random() - 0.5) * lngSpread
  };
};

const pickName = (list, index) => list[index % list.length];

// Nomi creativi
const treeNames = ["Quercia Maestosa", "Il Grande Platano", "Tiglio del Nonno", "Acero Rosso", "Ginkgo Biloba"];
const flowerNames = ["Angolo di Tulipani", "Letto di Rose", "Fiori di Campo", "Margherite Selvagge"];
const hedgeNames = ["Muro Verde", "Labirinto di Bosso", "Siepe Geometrica"];
const bushNames = ["Lavanda Profumata", "Rosmarino Selvatico", "Ginestra Gialla"];
const potNames = ["Vaso di Petunie", "Gerani Rossi", "Begonia in Fiore", "Ciclamino"];
const succNames = ["Cactus del Deserto", "Aloe Vera Curativa", "Cuscino della Suocera", "Stella di Giada", "Agave Gigante"];

const seedDB = async () => {
  try {
    console.log('⏳ Connessione al DB...');
    await mongoose.connect(MONGO_URI);
    
    console.log('🧹 Pulizia totale foresta...');
    await Tree.deleteMany({}); 

    // Reset Utenti
    const usersCheck = [
        { u: 'CityManager', e: 'admin@city.it', r: 'city_manager' },
        { u: 'Marco', e: 'marco@unibo.it', r: 'green_guardian', xp: 120 },
        { u: 'Gabriele', e: 'gabriele@unibo.it', r: 'green_guardian', xp: 90 }
    ];

    for (const u of usersCheck) {
        await User.updateOne({ username: u.u }, { $setOnInsert: { email: u.e, role: u.r, xp: u.xp || 0 } }, { upsert: true });
    }
    
    const plantsToCreate = [];

    // --- GENERAZIONE (Target: ~25 piante per città x 4 città = 100 totali) ---
    for (const city of CITIES) {
        console.log(`🌱 Semina in corso a: ${city.name}...`);
        
        // 1. ALBERO SPECIALE (1 per città)
        plantsToCreate.push({
            name: `Grande Albero di ${city.name}`,
            category: 'tree', species: 'Pinus Pinea',
            location: getRandomPos(city.lat, city.lng, 0.002, 0.002),
            waterLevel: 15, status: 'critical' 
        });

        // 2. ALBERI SPARSI (10 per città)
        for (let i = 0; i < 10; i++) {
            plantsToCreate.push({
                name: pickName(treeNames, i),
                category: 'tree', species: i % 2 === 0 ? 'Platanus' : 'Tilia',
                location: getRandomPos(city.lat, city.lng, 0.03, 0.04),
                waterLevel: Math.floor(Math.random() * 80) + 10, 
                status: 'healthy'
            });
        }

        // 3. AIUOLE (5 per città)
        for (let i = 0; i < 5; i++) {
            plantsToCreate.push({
                name: pickName(flowerNames, i),
                category: 'flowerbed', species: 'Tulipa',
                location: getRandomPos(city.lat, city.lng, 0.01, 0.01), 
                waterLevel: 90, status: 'healthy'
            });
        }

        // 4. SIEPI & CESPUGLI (3 per città)
        for (let i = 0; i < 3; i++) {
            const isHedge = i % 2 === 0;
            plantsToCreate.push({
                name: pickName(isHedge ? hedgeNames : bushNames, i),
                category: isHedge ? 'hedge' : 'bush', 
                species: isHedge ? 'Buxus' : 'Lavandula',
                location: getRandomPos(city.lat, city.lng, 0.02, 0.02),
                waterLevel: 50, status: 'thirsty'
            });
        }
        
        // 5. FIORIERE URBANE (3 per città)
        for (let i = 0; i < 3; i++) {
            plantsToCreate.push({
                name: pickName(potNames, i),
                category: 'potted', species: 'Petunia',
                location: getRandomPos(city.lat, city.lng, 0.005, 0.005),
                waterLevel: 10, status: 'critical'
            });
        }

        // 6. PIANTE GRASSE (3 per città - RICHIESTA UTENTE)
        for (let i = 0; i < 3; i++) {
            plantsToCreate.push({
                name: pickName(succNames, i),
                category: 'succulent', species: 'Succulenta Mix',
                location: getRandomPos(city.lat, city.lng, 0.008, 0.008),
                waterLevel: 80, status: 'healthy' // Le grasse partono sane
            });
        }
    }

    await Tree.insertMany(plantsToCreate);
    console.log(`🌿 Generate ${plantsToCreate.length} piante totali (Target 100) su ${CITIES.length} città!`);
    console.log('✅ SEEDING COMPLETATO!');
    process.exit(0);

  } catch (err) {
    console.error('❌ ERRORE:', err);
    process.exit(1);
  }
};

seedDB();