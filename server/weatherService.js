const Tree = require('./models/Tree');

const WEATHER_TYPES = ['sunny', 'cloudy', 'rainy'];
let currentWeather = 'sunny';

// --- LOGICA DELLE SOGLIE ---
// Qui decidiamo esattamente quando cambia colore
const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';  // Solo sopra il 60% è verde
  if (level > 20) return 'thirsty';   // Tra 21% e 59% è giallo
  return 'critical';                  // Sotto il 20% è rosso
};

const startWeatherSimulation = (io) => {
  console.log('🌦️ Simulazione Meteo avviata...');

  // Cambiamo meteo ogni 10 secondi per testare velocemente
  setInterval(async () => {
    
    // 1. Decidiamo il meteo
    const randomIndex = Math.floor(Math.random() * WEATHER_TYPES.length);
    currentWeather = WEATHER_TYPES[randomIndex];
    
    // Inviamo l'aggiornamento meteo al frontend
    io.emit('weather_update', currentWeather);

    try {
      // Prendiamo TUTTI gli alberi per analizzarli uno a uno
      const allTrees = await Tree.find();
      let treesChanged = false;

      for (const tree of allTrees) {
        let oldStatus = tree.status;
        let oldWater = tree.waterLevel;

        // --- CASO PIOGGIA 🌧️ ---
        if (currentWeather === 'rainy') {
          // Aumenta l'acqua di 10 (senza superare 100)
          tree.waterLevel = Math.min(tree.waterLevel + 10, 100);
        } 
        
        // --- CASO SOLE ☀️ ---
        else if (currentWeather === 'sunny') {
          // Diminuisce l'acqua di 5 (senza scendere sotto 0)
          tree.waterLevel = Math.max(tree.waterLevel - 5, 0);
        }
        
        // --- CASO NUVOLOSO ☁️ ---
        else {
          // Opzionale: evaporazione leggera o nulla
          tree.waterLevel = Math.max(tree.waterLevel - 1, 0);
        }

        // --- RICALCOLO DELLO STATO ---
        // Applico la funzione rigorosa scritta sopra
        tree.status = calculateStatus(tree.waterLevel);

        // Se è cambiato qualcosa (acqua o stato), salvo e segno che devo aggiornare il client
        if (tree.waterLevel !== oldWater || tree.status !== oldStatus) {
          await tree.save();
          treesChanged = true;
        }
      }

      // Se almeno un albero è cambiato, invio la lista aggiornata a tutti
      if (treesChanged) {
        // Ricarico gli alberi freschi dal DB per sicurezza
        const updatedTrees = await Tree.find();
        io.emit('trees_refresh', updatedTrees);
        // console.log(`🌍 Aggiornamento Foresta inviato (Meteo: ${currentWeather})`);
      }

    } catch (err) {
      console.error('Errore simulazione meteo:', err);
    }

  }, 10000); // Ogni 10 secondi
};

module.exports = { startWeatherSimulation };