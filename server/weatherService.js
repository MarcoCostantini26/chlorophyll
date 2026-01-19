const Tree = require('./models/Tree');

// --- CONFIGURAZIONE BOLOGNA ---
const LAT = 44.4949;
const LON = 11.3426;
// API Open-Meteo (Gratuita, No Key)
const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`;

// Variabile di stato globale per il meteo
let currentWeather = 'sunny';

// --- LOGICA DELLE SOGLIE ---
const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';  // Verde
  if (level > 20) return 'thirsty';   // Giallo
  return 'critical';                  // Rosso
};

const startWeatherSimulation = (io) => {
  console.log(`🌦️ Avvio Meteo Reale su BOLOGNA (Lat: ${LAT}, Lon: ${LON})`);

  // Funzione principale che scarica il meteo e aggiorna la vegetazione
  const updateForest = async () => {
    try {
      // 1. SCARICA IL METEO REALE
      const response = await fetch(API_URL);
      const data = await response.json();
      const wmoCode = data.current_weather.weathercode;

      // 2. TRADUCI IL CODICE WMO IN STATO APP
      // 0-1: Sereno | 2-48: Nuvoloso | 51+: Pioggia/Neve
      if (wmoCode === 0 || wmoCode === 1) {
        currentWeather = 'sunny';
      } else if (wmoCode >= 2 && wmoCode <= 48) {
        currentWeather = 'cloudy';
      } else if (wmoCode >= 51) {
        currentWeather = 'rainy';
      }

      // 3. INVIA AGGIORNAMENTO METEO AI CLIENT COLLEGATI
      io.emit('weather_update', currentWeather);
      console.log(`🌍 Meteo Bologna (WMO: ${wmoCode}) -> ${currentWeather}`);

      // 4. AGGIORNA GLI ALBERI IN BASE AL METEO
      const allTrees = await Tree.find();
      let treesChanged = false;

      for (const tree of allTrees) {
        let oldStatus = tree.status;
        let oldWater = tree.waterLevel;

        // --- Logica Ambientale ---
        if (currentWeather === 'rainy') {
          // Se piove a Bologna, gli alberi bevono (+10%)
          tree.waterLevel = Math.min(tree.waterLevel + 10, 100);
        } else if (currentWeather === 'sunny') {
          // Se c'è il sole, evapora più in fretta (-5%)
          tree.waterLevel = Math.max(tree.waterLevel - 5, 0);
        } else {
          // Nuvoloso, evaporazione lenta (-2%)
          tree.waterLevel = Math.max(tree.waterLevel - 2, 0);
        }

        // Ricalcolo Stato (Verde/Giallo/Rosso)
        tree.status = calculateStatus(tree.waterLevel);

        // Salva nel DB solo se ci sono stati cambiamenti
        if (tree.waterLevel !== oldWater || tree.status !== oldStatus) {
          await tree.save();
          treesChanged = true;
        }
      }

      // Se la foresta è cambiata, aggiorna la mappa di tutti i client
      if (treesChanged) {
        const updatedTrees = await Tree.find();
        io.emit('trees_refresh', updatedTrees);
        console.log(`🌲 Vegetazione aggiornata in base al meteo: ${currentWeather}`);
      }

    } catch (err) {
      console.error('❌ Errore aggiornamento meteo/alberi:', err);
    }
  };

  // Esegui subito all'avvio del server
  updateForest();

  // Esegui ogni 10 minuti (600.000 ms)
  setInterval(updateForest, 600000); 
};

// --- NUOVA FUNZIONE EXPORTATA ---
// Serve a index.js per sapere il meteo attuale quando un nuovo utente entra
const getCurrentWeather = () => {
  return currentWeather;
};

module.exports = { startWeatherSimulation, getCurrentWeather };