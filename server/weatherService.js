const Tree = require('./models/Tree');

// CONFIGURAZIONE BOLOGNA
const LAT = 44.4949;
const LON = 11.3426;
const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`;

// Intervallo di aggiornamento simulazione (in millisecondi)
// Metti 600000 per 10 minuti, o 30000 per i test veloci
const TICK_RATE = 600000; 

let currentWeather = 'sunny';

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

const WEATHER_COEFF = {
  tree:            { sunny: -5,  cloudy: -2, rainy: +10 },
  flowerbed:       { sunny: -6,  cloudy: -3, rainy: +12 },
  vertical_garden: { sunny: -6,  cloudy: -3, rainy: +10 }, 
  hedge:           { sunny: -4,  cloudy: -1, rainy: +8 },
  bush:            { sunny: -4,  cloudy: -1, rainy: +8 },
  potted:          { sunny: -8,  cloudy: -4, rainy: +5 },
  succulent:       { sunny: -1,  cloudy: -0, rainy: +2 },
  default:         { sunny: -5,  cloudy: -2, rainy: +10 }
};

// --- NUOVA FUNZIONE: RECUPERO DATI PERSI ---
const fillMissingHistoryOnStart = async () => {
  console.log("🔄 Controllo buchi temporali (Backfilling)...");
  
  const allTrees = await Tree.find();
  const now = new Date();
  let totalPointsAdded = 0;

  for (const tree of allTrees) {
    // Se l'albero non ha storico, ignoralo
    if (!tree.history || tree.history.length === 0) continue;

    // Prendi la data dell'ultimo aggiornamento registrato
    const lastEntry = tree.history[tree.history.length - 1];
    const lastDate = new Date(lastEntry.date);
    
    // Calcola quanto tempo è passato (in ms) da quando il server è stato spento
    const diffMs = now - lastDate;
    
    // Quanti "tick" (aggiornamenti) ci siamo persi?
    const missedTicks = Math.floor(diffMs / TICK_RATE);

    if (missedTicks > 0) {
      // console.log(`⏳ Albero ${tree.name}: persi ${missedTicks} aggiornamenti.`);
      
      let currentVal = tree.waterLevel;
      // Usiamo un coefficiente medio (Sunny) per simulare il passato
      // (Non possiamo sapere il meteo esatto del passato senza API storiche complesse)
      const coeffs = WEATHER_COEFF[tree.category] || WEATHER_COEFF.default;
      const decay = coeffs.sunny; // Assumiamo sia stato sereno (scenario peggiore)

      // Generiamo i punti mancanti
      for (let i = 1; i <= missedTicks; i++) {
        // Non esageriamo: se è stato spento un mese, limitiamo a ultimi 50 punti
        if (i > 50) break; 

        // Calcola il tempo di quel punto nel passato
        const historicalDate = new Date(lastDate.getTime() + (i * TICK_RATE));
        
        // Simula il calo d'acqua
        currentVal = Math.min(Math.max(currentVal + decay, 0), 100);
        
        tree.history.push({ val: currentVal, date: historicalDate });
        totalPointsAdded++;
      }

      // Aggiorniamo lo stato attuale dell'albero all'ultimo valore calcolato
      tree.waterLevel = currentVal;
      tree.status = calculateStatus(currentVal);
      
      // Limitiamo l'array per non esplodere
      if (tree.history.length > 50) {
        tree.history = tree.history.slice(-50);
      }

      await tree.save();
    }
  }

  if (totalPointsAdded > 0) {
    console.log(`✅ Backfilling completato: Aggiunti ${totalPointsAdded} punti storici.`);
  } else {
    console.log(`✅ Nessun buco temporale rilevato.`);
  }
};

// --- FUNZIONE NORMALE DI AGGIORNAMENTO (con Retry) ---
const applyWeatherChange = async (treeId, category) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return null;

      const coeffs = WEATHER_COEFF[category] || WEATHER_COEFF.default;
      let change = 0;

      if (currentWeather === 'rainy') change = coeffs.rainy;
      else if (currentWeather === 'sunny') change = coeffs.sunny;
      else change = coeffs.cloudy;

      if (change === 0) return null;

      const oldWater = tree.waterLevel;
      const oldStatus = tree.status;
      
      tree.waterLevel = Math.min(Math.max(tree.waterLevel + change, 0), 100);
      tree.status = calculateStatus(tree.waterLevel);

      if (tree.waterLevel === oldWater && tree.status === oldStatus) return null;

      if (!tree.history) tree.history = [];
      if (tree.history.length > 50) tree.history.shift(); // Teniamo 50 punti
      tree.history.push({ val: tree.waterLevel, date: new Date() });

      await tree.save();
      return tree; 

    } catch (err) {
      if (err.name === 'VersionError') attempts++;
      else break;
    }
  }
};

const startWeatherSimulation = async (io) => {
  console.log(`🌦️ Avvio Meteo Reale su BOLOGNA (Lat: ${LAT}, Lon: ${LON})`);

  // 1. ESEGUI BACKFILLING ALL'AVVIO
  // Questo riempie i buchi creati mentre il server era spento
  await fillMissingHistoryOnStart();

  const updateForest = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      
      if (!data || !data.current_weather) return;

      const wmoCode = data.current_weather.weathercode;
      if (wmoCode <= 1) currentWeather = 'sunny';
      else if (wmoCode <= 48) currentWeather = 'cloudy';
      else currentWeather = 'rainy';

      io.emit('weather_update', currentWeather);

      const allTreesBasic = await Tree.find({}, '_id category'); 
      const updates = allTreesBasic.map(t => applyWeatherChange(t._id, t.category));
      
      const results = await Promise.all(updates);
      
      if (results.some(r => r !== null)) {
        const updatedTrees = await Tree.find(); 
        io.emit('trees_refresh', updatedTrees);
      }

    } catch (err) {
      console.error('❌ Errore aggiornamento meteo:', err.message);
    }
  };

  updateForest();
  setInterval(updateForest, TICK_RATE); 
};

const getCurrentWeather = () => currentWeather;

module.exports = { startWeatherSimulation, getCurrentWeather };