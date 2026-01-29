require('dotenv').config({ path: '../.env' }); // Carica .env dalla root (opzionale se lanci dalla root)
const mongoose = require('mongoose');

// 👇 MODIFICA QUI: Percorso aggiornato (sali di un livello con ../)
const Tree = require('../models/Tree'); 

const MONGO_URI = process.env.MONGO_URI;

const cleanupHistory = async () => {
  try {
    console.log("🔌 Connessione al DB in corso...");
    await mongoose.connect(MONGO_URI);
    console.log("🍃 DB Connesso. Inizio pulizia grafici...");

    const trees = await Tree.find();
    let totalRemoved = 0;

    for (const tree of trees) {
      if (!tree.history || tree.history.length === 0) continue;

      const originalLength = tree.history.length;
      
      // 1. Ordina per data
      tree.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 2. Mappa per rimuovere duplicati nello stesso minuto
      const uniqueHistoryMap = new Map();

      tree.history.forEach(entry => {
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
        uniqueHistoryMap.set(key, entry);
      });

      const cleanedHistory = Array.from(uniqueHistoryMap.values());

      if (cleanedHistory.length < originalLength) {
        const removedCount = originalLength - cleanedHistory.length;
        totalRemoved += removedCount;
        console.log(`🌲 ${tree.name}: Rimossi ${removedCount} punti.`);
        tree.history = cleanedHistory;
        await tree.save();
      }
    }

    console.log(`✅ COMPLETATO! Totale rimossi: ${totalRemoved}`);

  } catch (error) {
    console.error("❌ Errore:", error);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
};

cleanupHistory();