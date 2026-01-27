require('dotenv').config();
const mongoose = require('mongoose');
const Tree = require('./models/Tree'); // Assicurati che il percorso sia giusto

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
      
      // 1. Ordiniamo per data (dal più vecchio al più recente) per sicurezza
      tree.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 2. Usiamo una Mappa per tenere SOLO L'ULTIMO punto per ogni minuto
      const uniqueHistoryMap = new Map();

      tree.history.forEach(entry => {
        const d = new Date(entry.date);
        // Creiamo una chiave unica per quel minuto (es: "2023-10-27 10:05")
        // Nota: Ignoriamo i secondi e i millisecondi
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
        
        // La Map sovrascrive automaticamente i valori con la stessa chiave.
        // Siccome stiamo ciclando in ordine cronologico, rimarrà sempre L'ULTIMO punto di quel minuto.
        uniqueHistoryMap.set(key, entry);
      });

      // 3. Convertiamo la mappa di nuovo in array
      const cleanedHistory = Array.from(uniqueHistoryMap.values());

      // 4. Salviamo solo se abbiamo effettivamente rimosso qualcosa
      if (cleanedHistory.length < originalLength) {
        const removedCount = originalLength - cleanedHistory.length;
        totalRemoved += removedCount;
        
        console.log(`🌲 ${tree.name}: Rimossi ${removedCount} punti duplicati (Da ${originalLength} a ${cleanedHistory.length})`);
        
        tree.history = cleanedHistory;
        await tree.save();
      }
    }

    console.log("------------------------------------------------");
    if (totalRemoved > 0) {
      console.log(`✅ PULIZIA COMPLETATA! Rimossi totale ${totalRemoved} punti superflui.`);
      console.log(`📈 I tuoi grafici ora dovrebbero essere perfetti.`);
    } else {
      console.log(`✅ Il database era già pulito. Nessuna modifica.`);
    }

  } catch (error) {
    console.error("❌ Errore durante la pulizia:", error);
  } finally {
    // Chiudiamo la connessione alla fine
    mongoose.connection.close();
    process.exit();
  }
};

// Esegui la funzione
cleanupHistory();