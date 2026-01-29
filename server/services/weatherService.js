// 👇 NOTA: Percorso aggiornato per salire di un livello verso models
const Tree = require('../models/Tree');
const { TICK_RATE } = require('../config/constants');

// COORDINATE DI DEFAULT
const DEFAULT_CITY = { lat: 44.4949, lng: 11.3426 }; // Bologna

let currentMap = {}; 

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchCityName = async (lat, lng) => {
  try {
    await sleep(1000); 
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ChlorophyllApp/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Zona Sconosciuta';
  } catch (e) {
    console.error("⚠️ Errore Reverse Geocoding:", e.message);
    return null;
  }
};

const fillMissingHistoryOnStart = async () => {
  console.log("🔄 [Meteo] Backfilling Graduale...");
  try {
    const allTreesIds = await Tree.find({}, '_id'); 
    const now = new Date();

    for (const doc of allTreesIds) {
      const tree = await Tree.findById(doc._id);
      if (!tree || !tree.history || tree.history.length === 0) continue;

      const lastEntry = tree.history[tree.history.length - 1];
      const lastDate = new Date(lastEntry.date);
      const diffMs = now - lastDate;
      const missedTicks = Math.floor(diffMs / TICK_RATE);

      if (missedTicks > 2) {
        const chance = WEATHER_CHANCE[tree.category]?.sunny || WEATHER_CHANCE.default.sunny;
        const totalLoss = Math.floor(missedTicks * chance);

        if (totalLoss > 0) {
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
        }
      }
    }
    console.log(`✅ Backfilling completato.`);
  } catch (e) { console.error("❌ Errore Backfilling:", e); }
};

const processGroupsWeather = async (io) => {
  try {
    const allTreesBasic = await Tree.find({}, 'location city');
    if (allTreesBasic.length === 0) return;

    const groups = {};
    for (const t of allTreesBasic) {
      if (!t.location || !t.location.lat) continue;
      const key = `${t.location.lat.toFixed(1)}_${t.location.lng.toFixed(1)}`;
      
      if (!groups[key]) {
        groups[key] = { lat: t.location.lat, lng: t.location.lng, cityName: t.city, treeIds: [] };
      }
      if (!groups[key].cityName && t.city && t.city !== '⏳ ...') {
        groups[key].cityName = t.city;
      }
      groups[key].treeIds.push(t._id);
    }

    let totalUpdates = 0;
    const cityWeatherMap = {}; 
    let mainWeather = 'sunny'; 

    for (const key in groups) {
      const group = groups[key];
      
      if (!group.cityName || group.cityName === '⏳ ...') {
        const foundName = await fetchCityName(group.lat, group.lng);
        if (foundName) group.cityName = foundName;
      }

      let weather = 'sunny';
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${group.lat}&longitude=${group.lng}&current_weather=true`);
        const data = await response.json();
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          if (code <= 1) weather = 'sunny';
          else if (code <= 48) weather = 'cloudy';
          else weather = 'rainy';
        }
      } catch(err) { console.error("API Meteo Error:", err.message); }

      const mapKey = group.cityName || `Zona ${key}`;
      cityWeatherMap[mapKey] = weather;

      if (Math.abs(group.lat - DEFAULT_CITY.lat) < 0.2 && Math.abs(group.lng - DEFAULT_CITY.lng) < 0.2) {
        mainWeather = weather;
      }

      const freshTrees = await Tree.find({ _id: { $in: group.treeIds } });

      for (const tree of freshTrees) {
        if (group.cityName && (!tree.city || tree.city === '⏳ ...')) tree.city = group.cityName;

        const chances = WEATHER_CHANCE[tree.category] || WEATHER_CHANCE.default;
        let chance = 0, amount = 0;

        if (weather === 'rainy') { chance = chances.rainy; amount = CHANGE_AMOUNT.rainy; }
        else if (weather === 'sunny') { chance = chances.sunny; amount = CHANGE_AMOUNT.sunny; }
        else { chance = chances.cloudy; amount = CHANGE_AMOUNT.cloudy; }

        if (Math.random() <= chance) {
          const oldWater = tree.waterLevel;
          let newVal = Math.min(Math.max(tree.waterLevel + amount, 0), 100);

          if (newVal !== oldWater) {
            tree.waterLevel = newVal;
            tree.status = calculateStatus(newVal);
            if (!tree.history) tree.history = [];
            tree.history.push({ val: newVal, date: new Date() });
            if (tree.history.length > 50) tree.history.shift();
            totalUpdates++;
          }
        }
        if (tree.isModified()) {
          try { await tree.save(); } catch (e) {}
        }
      }
    }

    currentMap = cityWeatherMap; 

    io.emit('weather_map_update', cityWeatherMap);
    
    if (totalUpdates > 0) {
      const updatedTrees = await Tree.find().select('-history');
      io.emit('trees_refresh', updatedTrees);
      console.log(`🌲 Foresta: ${totalUpdates} mod. | Città: ${Object.keys(cityWeatherMap).length}`);
    }
    io.emit('weather_update', mainWeather);

  } catch (e) {
    console.error("❌ Errore ciclo meteo:", e.message);
  }
};

const startWeatherSimulation = async (io) => {
  console.log(`🌦️ Avvio Meteo (Update ogni 10 min)`);
  await fillMissingHistoryOnStart();
  processGroupsWeather(io);
  setInterval(() => processGroupsWeather(io), TICK_RATE); 
};

const getCurrentWeather = () => 'sunny'; 
const getLastWeatherMap = () => currentMap;

module.exports = { startWeatherSimulation, getCurrentWeather, getLastWeatherMap };