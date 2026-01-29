module.exports = {
  // Tempo di aggiornamento meteo (10 minuti)
  TICK_RATE: 600000, 
  
  // Quanto guadagna una pianta in salute quando innaffiata
  ACTION_VALUES: {
    tree: 20, 
    flowerbed: 20, 
    vertical_garden: 20,
    hedge: 30, 
    bush: 30, 
    potted: 40, 
    succulent: 15, 
    default: 20
  },

  // Soglie di stato
  THRESHOLDS: {
    healthy: 60,
    thirsty: 20
  }
};