const Tree = require('./models/Tree');

// Stati meteo possibili
const WEATHER_TYPES = ['sunny', 'cloudy', 'rainy'];

let currentWeather = 'sunny';

const startWeatherSimulation = (io) => {
  console.log('🌦️ Simulazione Meteo avviata...');

  // Ogni 20 secondi cambia il tempo
  setInterval(async () => {
    // 1. Cambia Meteo in modo casuale
    const randomIndex = Math.floor(Math.random() * WEATHER_TYPES.length);
    currentWeather = WEATHER_TYPES[randomIndex];
    
    console.log(`🌍 CAMBIO METEO: Ora è ${currentWeather.toUpperCase()}`);

    // Avvisa i client che il tempo è cambiato
    io.emit('weather_update', currentWeather);

    // 2. SE PIOVE: Innaffia tutti gli alberi!
    if (currentWeather === 'rainy') {
      try {
        console.log('🌧️ Sta piovendo! Innaffio automatico foresta...');
        
        // Trova alberi non pieni e aggiungi acqua
        const result = await Tree.updateMany(
          { waterLevel: { $lt: 100 } }, // Filtro: solo quelli non pieni
          { 
            $inc: { waterLevel: 10 }, // Incrementa acqua
            $set: { status: 'healthy' } // La pioggia fa bene
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`🌲 ${result.modifiedCount} alberi beneficiati dalla pioggia.`);
          
          // Dobbiamo rimandare i dati aggiornati al frontend
          const updatedTrees = await Tree.find();
          io.emit('trees_refresh', updatedTrees); // Nuovo evento per ricaricare tutto
        }

      } catch (err) {
        console.error('Errore pioggia:', err);
      }
    }

    // 3. SE C'È IL SOLE: L'acqua evapora un po' (Opzionale, per realismo)
    if (currentWeather === 'sunny') {
       await Tree.updateMany({ waterLevel: { $gt: 0 } }, { $inc: { waterLevel: -2 } });
       // Non emettiamo update continuo per non intasare, aggiorneranno al prossimo click o refresh
    }

  }, 20000); // 20 secondi
};

module.exports = { startWeatherSimulation };