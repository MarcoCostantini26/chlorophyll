const Tree = require('./models/Tree');

// INTERVALLO: 10 MINUTI
const TICK_RATE = 600000; 

// COORDINATE DI DEFAULT (Per l'icona della UI principale)
const DEFAULT_CITY = { lat: 44.4949, lng: 11.3426 }; // Bologna

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

// CONFIGURAZIONE PROBABILITÀ
const WEATHER_CHANCE = {
  tree:            { sunny: 0.15,  cloudy: 0.05,  rainy: 1.0 }, 
  flowerbed:       { sunny: 0.20,  cloudy: 0.10,  rainy: 1.0 },
  vertical_garden: { sunny: 0.20,  cloudy: 0.10,  rainy: 1.0 },
  hedge:           { sunny: 0.10,  cloudy: 0.02,  rainy: 1.0 },
  bush:            { sunny: 0.10,  cloudy: 0.02,  rainy: 1.0 },
  potted:          { sunny: 0.25,  cloudy: 0.15,  rainy: 1.0 }, 
  succulent:       { sunny: 0.02,  cloudy: 0.00,  rainy: 0.5 }, 
  default:         { sunny: 0.15,  cloudy: 0.05,  rainy: 1.0 }
};

const CHANGE_AMOUNT = {
  sunny: -1,  cloudy: -1, rainy: +3   
};

// --- BACKFILLING GRADUALE (Recupero Offline) ---
const fillMissingHistoryOnStart = async () => {
  console.log("🔄 [Meteo] Backfilling Graduale...");
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

      if (missedTicks > 2) {
        // Simuliamo scenario 'sunny' per penalità offline
        const chance = WEATHER_CHANCE[tree.category]?.sunny || WEATHER_CHANCE.default.sunny;
        const totalLoss = Math.floor(missedTicks * chance);

        if (totalLoss > 0) {
          // Creiamo un punto ogni ORA circa (6 tick)
          const pointsToCreate = Math.ceil(missedTicks / 6); 
          const lossPerPoint = totalLoss / pointsToCreate;
          const timeStep = diffMs / pointsToCreate;
          
          let simVal = lastEntry.val;
          let currentVal = tree.waterLevel;

          for (let i = 1; i <= pointsToCreate; i++) {
            const simDate = new Date(lastDate.getTime() + (i * timeStep));
            simVal = Math.max(simVal - lossPerPoint, 0);
            const finalVal = Math.round(simVal * 100) / 100;
            
            tree.history.push({ val: finalVal, date: simDate });
            currentVal = finalVal;
          }

          tree.waterLevel = currentVal;
          tree.status = calculateStatus(currentVal);
          tree.lastWatered = now;
          
          if (tree.history.length > 100) tree.history = tree.history.slice(-100);
          
          await tree.save();
          totalPointsAdded += pointsToCreate;
        }
      }
    }
    console.log(`✅ Backfilling: Generati ${totalPointsAdded} punti interpolati.`);
  } catch (e) {
    console.error("❌ Errore Backfilling:", e);
  }
};

// --- LOGICA MULTI-CITTÀ ---
const processGroupsWeather = async (io) => {
  try {
    const allTrees = await Tree.find();
    if (allTrees.length === 0) return;

    // 1. Raggruppa alberi per coordinate simili (Arrotondate a 1 decimale ~= 10km)
    const groups = {};
    for (const tree of allTrees) {
      if (!tree.location || !tree.location.lat) continue;
      // Chiave univoca per zona (es: "45.5_9.2" per Milano)
      const key = `${tree.location.lat.toFixed(1)}_${tree.location.lng.toFixed(1)}`;
      if (!groups[key]) groups[key] = { lat: tree.location.lat, lng: tree.location.lng, trees: [] };
      groups[key].trees.push(tree);
    }

    let totalUpdates = 0;
    let mainWeather = 'sunny'; // Meteo di default per la UI

    // 2. Processa ogni gruppo
    for (const key in groups) {
      const group = groups[key];
      
      // Chiamata API per questo gruppo
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${group.lat}&longitude=${group.lng}&current_weather=true`);
      const data = await response.json();
      
      let weather = 'sunny';
      if (data && data.current_weather) {
        const code = data.current_weather.weathercode;
        if (code <= 1) weather = 'sunny';
        else if (code <= 48) weather = 'cloudy';
        else weather = 'rainy';
      }

      // Se questo gruppo è vicino alle coordinate di default (Bologna), usalo per la UI
      if (Math.abs(group.lat - DEFAULT_CITY.lat) < 0.2 && Math.abs(group.lng - DEFAULT_CITY.lng) < 0.2) {
        mainWeather = weather;
      }

      // Applica effetti agli alberi del gruppo
      for (const tree of group.trees) {
        const chances = WEATHER_CHANCE[tree.category] || WEATHER_CHANCE.default;
        let chance = 0, amount = 0;

        if (weather === 'rainy') { chance = chances.rainy; amount = CHANGE_AMOUNT.rainy; }
        else if (weather === 'sunny') { chance = chances.sunny; amount = CHANGE_AMOUNT.sunny; }
        else { chance = chances.cloudy; amount = CHANGE_AMOUNT.cloudy; }

        if (Math.random() > chance) continue; // Dado

        const oldWater = tree.waterLevel;
        let newVal = Math.min(Math.max(tree.waterLevel + amount, 0), 100);

        if (newVal !== oldWater) {
          tree.waterLevel = newVal;
          tree.status = calculateStatus(newVal);
          if (!tree.history) tree.history = [];
          tree.history.push({ val: newVal, date: new Date() });
          if (tree.history.length > 50) tree.history.shift();
          await tree.save();
          totalUpdates++;
        }
      }
    }

    // 3. Eventi
    if (totalUpdates > 0) {
      const updatedTrees = await Tree.find();
      io.emit('trees_refresh', updatedTrees);
      console.log(`🌍 Meteo Applicato: ${totalUpdates} alberi aggiornati.`);
    }
    
    // Manda sempre un meteo "generale" per non rompere l'icona in alto a destra
    io.emit('weather_update', mainWeather);

  } catch (e) {
    console.error("❌ Errore ciclo meteo:", e.message);
  }
};

const startWeatherSimulation = async (io) => {
  console.log(`🌦️ Avvio Meteo Geografico (Update ogni 10 min)`);
  await fillMissingHistoryOnStart();
  
  processGroupsWeather(io);
  setInterval(() => processGroupsWeather(io), TICK_RATE); 
};

// Export dummy per compatibilità
const getCurrentWeather = () => 'sunny'; 

module.exports = { startWeatherSimulation, getCurrentWeather };