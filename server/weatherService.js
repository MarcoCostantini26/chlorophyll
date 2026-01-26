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

// --- LOGICA DI REAZIONE AL METEO PER CATEGORIA ---
// Definisce quanto cambia l'acqua per ogni Tick (10 min)
const WEATHER_COEFF = {
  // Categoria: { sunny: perdita, cloudy: perdita, rainy: guadagno }
  tree:            { sunny: -5,  cloudy: -2, rainy: +10 }, // Standard
  flowerbed:       { sunny: -6,  cloudy: -3, rainy: +12 }, // Delicata
  vertical_garden: { sunny: -6,  cloudy: -3, rainy: +10 }, 
  
  hedge:           { sunny: -4,  cloudy: -1, rainy: +8 },  // Resistente
  bush:            { sunny: -4,  cloudy: -1, rainy: +8 },
  
  potted:          { sunny: -8,  cloudy: -4, rainy: +5 },  // Si asciuga SUBITO (poco terreno), beve poco
  succulent:       { sunny: -1,  cloudy: -0, rainy: +2 },  // Highlander: ignora il sole, beve piano
  
  default:         { sunny: -5,  cloudy: -2, rainy: +10 }
};

const startWeatherSimulation = (io) => {
  console.log(`🌦️ Avvio Meteo Reale su BOLOGNA (Lat: ${LAT}, Lon: ${LON})`);

  // Funzione principale che scarica il meteo e aggiorna la vegetazione
  const updateForest = async () => {
    try {
      // 1. SCARICA IL METEO REALE
      const response = await fetch(API_URL);
      const data = await response.json();
      
      // Controllo sicurezza dati
      if (!data || !data.current_weather) {
        console.error("⚠️ API Meteo non risponde correttamente.");
        return;
      }

      const wmoCode = data.current_weather.weathercode;

      // 2. TRADUCI IL CODICE WMO IN STATO APP
      // 0-1: Sereno | 2-48: Nuvoloso | 51+: Pioggia/Neve
      if (wmoCode <= 1) {
        currentWeather = 'sunny';
      } else if (wmoCode <= 48) {
        currentWeather = 'cloudy';
      } else {
        currentWeather = 'rainy'; // Include pioggia (51+), neve, temporali
      }

      // 3. INVIA AGGIORNAMENTO METEO AI CLIENT
      io.emit('weather_update', currentWeather);
      console.log(`🌍 Meteo Bologna (WMO: ${wmoCode}) -> ${currentWeather.toUpperCase()}`);

      // 4. AGGIORNA GLI ALBERI IN BASE AL METEO E ALLA CATEGORIA
      const allTrees = await Tree.find();
      let treesChanged = false;

      for (const tree of allTrees) {
        let oldStatus = tree.status;
        let oldWater = tree.waterLevel;

        // Recupera i coefficienti per questa pianta (o usa default)
        const coeffs = WEATHER_COEFF[tree.category] || WEATHER_COEFF.default;
        
        let change = 0;

        // Applica logica differenziata
        if (currentWeather === 'rainy') {
          change = coeffs.rainy;
        } else if (currentWeather === 'sunny') {
          change = coeffs.sunny; // Valore negativo
        } else {
          change = coeffs.cloudy; // Valore negativo
        }

        // Applica il cambio mantenendo i limiti 0-100
        tree.waterLevel = Math.min(Math.max(tree.waterLevel + change, 0), 100);

        // Ricalcolo Stato
        tree.status = calculateStatus(tree.waterLevel);

        // --- AGGIORNAMENTO STORICO ---
        // Aggiungi snapshot solo se è cambiato qualcosa o per tenere traccia
        // Limitiamo lo storico agli ultimi 24 punti (es. 4 ore se aggiorni ogni 10 min) per non intasare il DB
        if (!tree.history) tree.history = [];
        if (tree.history.length > 24) tree.history.shift(); // Rimuovi il più vecchio
        
        // Aggiungiamo il punto allo storico
        tree.history.push({ val: tree.waterLevel, date: new Date() });

        // Salva solo se è cambiato qualcosa (o se vuoi salvare lo storico ogni volta, togli la condizione oldWater)
        // Qui salviamo se cambia l'acqua o lo stato per ottimizzare, ma aggiorniamo comunque history in memoria
        if (tree.waterLevel !== oldWater || tree.status !== oldStatus) {
          await tree.save();
          treesChanged = true;
        } else if (tree.history.length > 0) {
           // Se non cambia livello ma vogliamo salvare lo storico (opzionale, qui salviamo per sicurezza)
           await tree.save();
        }
      }

      // Se la foresta è cambiata, aggiorna la mappa di tutti i client
      if (treesChanged) {
        const updatedTrees = await Tree.find();
        io.emit('trees_refresh', updatedTrees);
      }

    } catch (err) {
      console.error('❌ Errore aggiornamento meteo/alberi:', err);
    }
  };

  // Esegui subito all'avvio
  updateForest();

  // Esegui ogni 10 minuti (600.000 ms)
  setInterval(updateForest, 600000); 
};

// Getter per index.js
const getCurrentWeather = () => {
  return currentWeather;
};

module.exports = { startWeatherSimulation, getCurrentWeather };