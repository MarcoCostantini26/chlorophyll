// Carica le variabili d'ambiente dal file .env
require('dotenv').config(); 

const mongoose = require('mongoose');
const Tree = require('./models/Tree');

// --- PRENDE L'INDIRIZZO DAL TUO FILE .ENV ---
// Assicurati che nel file .env la variabile si chiami MONGO_URI
// Se si chiama diversamente (es. DB_URL), cambia 'process.env.MONGO_URI' qui sotto.
const MONGO_URI = process.env.MONGO_URI; 

const TICK_RATE = 600000; // 10 Minuti

const repairHistory = async () => {
  try {
    const trees = await Tree.find();
    console.log(`🔍 Analisi di ${trees.length} alberi su Atlas...`);

    for (const tree of trees) {
      if (!tree.history || tree.history.length < 2) continue;

      tree.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      const newHistory = [];
      let pointsAdded = 0;

      for (let i = 0; i < tree.history.length - 1; i++) {
        const currentPoint = tree.history[i];
        const nextPoint = tree.history[i+1];
        
        newHistory.push(currentPoint);

        const currentDate = new Date(currentPoint.date);
        const nextDate = new Date(nextPoint.date);
        const diffMs = nextDate - currentDate;

        // Se il buco è > 15 minuti
        if (diffMs > (TICK_RATE * 1.5)) {
          const missingPoints = Math.floor(diffMs / TICK_RATE);
          const valueDiff = nextPoint.val - currentPoint.val;
          const stepValue = valueDiff / missingPoints;

          for (let j = 1; j < missingPoints; j++) {
            const interpolatedDate = new Date(currentDate.getTime() + (j * TICK_RATE));
            const interpolatedVal = currentPoint.val + (stepValue * j);

            newHistory.push({
              val: Math.round(interpolatedVal),
              date: interpolatedDate
            });
            pointsAdded++;
          }
        }
      }
      newHistory.push(tree.history[tree.history.length - 1]);

      if (pointsAdded > 0) {
        tree.history = newHistory; 
        await tree.save();
        console.log(`🛠️  Riparato ${tree.name}: Aggiunti ${pointsAdded} punti mancanti.`);
      }
    }
    console.log('🎉 Database riparato con successo!');
  } catch (e) {
    console.error('Errore durante la riparazione:', e);
  }
};

const run = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ Errore: Non trovo MONGO_URI nel file .env! Controlla il nome della variabile.");
    }

    console.log('🔌 Connessione a MongoDB Atlas in corso...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connesso ad Atlas. Avvio riparazione...');
    
    await repairHistory();
    
    console.log('👋 Chiusura connessione.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Errore:', err.message);
    process.exit(1);
  }
};

run();