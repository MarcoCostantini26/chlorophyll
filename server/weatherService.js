const Tree = require('./models/Tree');

// CONFIGURAZIONE BOLOGNA
const LAT = 44.4949;
const LON = 11.3426;
const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`;

// INTERVALLO: 10 MINUTI (Non toccare, serve per la reattività del meteo reale)
const TICK_RATE = 600000; 

let currentWeather = 'sunny';

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

// --- CONFIGURAZIONE PROBABILITÀ (0.10 = 10% di possibilità) ---
// Questo determina QUANTE VOLTE viene applicato il -1 o il +1.
// Esempio: "sunny: 0.15" significa che ogni 10 minuti c'è il 15% di probabilità che perda 1%.
const WEATHER_CHANCE = {
  tree:            { sunny: 0.15,  cloudy: 0.05,  rainy: 1.0 }, // 1.0 = Piove sempre quando è rainy
  flowerbed:       { sunny: 0.20,  cloudy: 0.10,  rainy: 1.0 },
  vertical_garden: { sunny: 0.20,  cloudy: 0.10,  rainy: 1.0 },
  hedge:           { sunny: 0.10,  cloudy: 0.02,  rainy: 1.0 },
  bush:            { sunny: 0.10,  cloudy: 0.02,  rainy: 1.0 },
  potted:          { sunny: 0.25,  cloudy: 0.15,  rainy: 1.0 }, // Vasi si asciugano più spesso
  succulent:       { sunny: 0.02,  cloudy: 0.00,  rainy: 0.5 }, // Grasse resistentissime
  default:         { sunny: 0.15,  cloudy: 0.05,  rainy: 1.0 }
};

// Valore fisso di cambio quando il dado "vince" (sempre Interi!)
const CHANGE_AMOUNT = {
  sunny: -1,  // Perde 1%
  cloudy: -1, // Perde 1%
  rainy: +3   // Guadagna 3% (la pioggia è efficace)
};

// --- BACKFILLING (Recupero Offline basato sulla media statistica) ---
const fillMissingHistoryOnStart = async () => {
  console.log("🔄 [Meteo] Backfilling Statistico (Server avviato)...");
  
  try {
    const allTreesIds = await Tree.find({}, '_id'); 
    const now = new Date();
    let totalPointsAdded = 0;

    for (const doc of allTreesIds) {
      const tree = await Tree.findById(doc._id);
      if (!tree || !tree.history || tree.history.length === 0) continue;

      const lastEntry = tree.history[tree.history.length - 1];
      const lastDate = new Date(lastEntry.date);
      const diffMs = now - lastDate;
      const missedTicks = Math.floor(diffMs / TICK_RATE);

      if (missedTicks > 0) {
        let currentVal = tree.waterLevel;
        
        // Prendiamo la chance media per il tipo di pianta (scenario Sunny)
        const chance = WEATHER_CHANCE[tree.category]?.sunny || WEATHER_CHANCE.default.sunny;
        
        // Calcolo Statistico: Se sono passati 100 tick con il 15% di chance,
        // statisticamente hai perso 15 punti.
        // Math.floor(100 * 0.15) = 15 punti persi.
        const totalLoss = Math.floor(missedTicks * chance);

        if (totalLoss > 0) {
          // Creiamo solo un punto finale per non intasare il DB
          currentVal = Math.max(currentVal - totalLoss, 0);
          
          tree.history.push({ val: currentVal, date: now });
          tree.waterLevel = currentVal;
          tree.status = calculateStatus(currentVal);
          tree.lastWatered = now;
          
          if (tree.history.length > 50) tree.history = tree.history.slice(-50);
          
          await tree.save();
          totalPointsAdded++;
          console.log(`🌲 [Offline] ${tree.name}: Persi ${totalLoss}% (in ${missedTicks} cicli mancati)`);
        }
      }
    }

    if (totalPointsAdded > 0) console.log(`✅ Backfilling completato.`);
    else console.log(`✅ Nessun cambiamento rilevante durante l'offline.`);

  } catch (e) {
    console.error("❌ Errore Backfilling:", e);
  }
};

// --- AGGIORNAMENTO CICLICO (Probabilistico) ---
const applyWeatherChange = async (treeId, category) => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return null;

      // 1. Recupera la probabilità (Chance)
      const chances = WEATHER_CHANCE[category] || WEATHER_CHANCE.default;
      let chanceThreshold = 0;
      let amount = 0;

      if (currentWeather === 'rainy') {
        chanceThreshold = chances.rainy; // Di solito 1.0 (100%)
        amount = CHANGE_AMOUNT.rainy;
      } else if (currentWeather === 'sunny') {
        chanceThreshold = chances.sunny; // Es. 0.15 (15%)
        amount = CHANGE_AMOUNT.sunny;
      } else {
        chanceThreshold = chances.cloudy; // Es. 0.05 (5%)
        amount = CHANGE_AMOUNT.cloudy;
      }

      // 2. LANCIO DEL DADO (0.0 a 1.0)
      const diceRoll = Math.random();

      // Se il dado è maggiore della soglia, NON succede nulla.
      // Es: Soglia 0.15. Dado esce 0.80 -> Niente acqua persa.
      if (diceRoll > chanceThreshold) return null;

      // 3. Se vince, applica il cambiamento intero (+3 o -1)
      const oldWater = tree.waterLevel;
      let newVal = tree.waterLevel + amount;

      // Limiti 0-100
      if (newVal > 100) newVal = 100;
      if (newVal < 0) newVal = 0;

      if (newVal === oldWater) return null;

      tree.waterLevel = newVal;
      tree.status = calculateStatus(tree.waterLevel);

      // Aggiorna storico
      if (!tree.history) tree.history = [];
      tree.history.push({ val: tree.waterLevel, date: new Date() });
      if (tree.history.length > 50) tree.history.shift(); 

      await tree.save();
      return tree; 

    } catch (err) {
      if (err.name === 'VersionError') {
        attempts++;
        await new Promise(res => setTimeout(res, 200)); 
      } else {
        break;
      }
    }
  }
  return null;
};

const startWeatherSimulation = async (io) => {
  console.log(`🌦️ Avvio Meteo BOLOGNA (Probabilistico - Numeri Interi)`);

  await fillMissingHistoryOnStart();

  const updateForest = async () => {
    try {
      // 1. Fetch Meteo Reale
      const response = await fetch(API_URL);
      const data = await response.json();
      
      if (data && data.current_weather) {
        const wmoCode = data.current_weather.weathercode;
        if (wmoCode <= 1) currentWeather = 'sunny';
        else if (wmoCode <= 48) currentWeather = 'cloudy';
        else currentWeather = 'rainy';
        
        io.emit('weather_update', currentWeather);
      }

      // 2. Applica effetti probabilistici
      const allTreesBasic = await Tree.find({}, '_id category'); 
      const updates = allTreesBasic.map(t => applyWeatherChange(t._id, t.category));
      
      const results = await Promise.all(updates);
      
      // 3. Notifica client se qualcuno è cambiato
      const changedTrees = results.filter(r => r !== null);
      if (changedTrees.length > 0) {
        const updatedTrees = await Tree.find(); 
        io.emit('trees_refresh', updatedTrees);
        // console.log(`🎲 Dado lanciato: ${changedTrees.length} piante modificate.`);
      }

    } catch (err) {
      console.error('❌ Errore ciclo meteo:', err.message);
    }
  };

  updateForest();
  setInterval(updateForest, TICK_RATE); 
};

const getCurrentWeather = () => currentWeather;

module.exports = { startWeatherSimulation, getCurrentWeather };