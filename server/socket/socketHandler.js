const treeService = require('../services/treeService');
const gameService = require('../services/gameService');
const { getCurrentWeather, getLastWeatherMap } = require('../services/weatherService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Utente connesso: ${socket.id}`);

    // Init Immediato Meteo
    socket.emit('weather_update', getCurrentWeather());
    socket.emit('weather_map_update', getLastWeatherMap());

    // --- AZIONE INNAFFIA (USER) ---
    socket.on('water_tree', async ({ treeId, userId }) => {
      try {
        // 1. Logica Albero (Service)
        const { tree, wasCritical, healthGain } = await treeService.waterTreeLogic(treeId);
        
        // 2. Notifica a TUTTI (solo l'albero aggiornato)
        io.emit('tree_updated', tree);

        // 3. Logica Gioco (XP, Badge) - Solo se è un utente registrato
        if (userId) {
          // Determina tipo azione per il log
          let actionType = 'water';
          if (['hedge', 'bush'].includes(tree.category)) actionType = 'prune';
          else if (['potted', 'succulent'].includes(tree.category)) actionType = 'treat';

          const result = await gameService.handleUserAction(
            userId, 
            treeId, 
            actionType, 
            `Salute +${healthGain}%`, 
            wasCritical
          );
          
          if (result) {
            // Notifiche specifiche per l'utente (Level Up, Badge)
            if (result.newLevel) {
              io.emit('level_up', { username: result.user.username, level: result.newLevel });
            }
            result.unlockedBadges.forEach(badge => {
              io.emit('badge_unlocked', { username: result.user.username, badge });
            });
            
            // Aggiorna l'interfaccia utente con nuovi XP/Badge
            io.emit('user_updated', result.user);
          }
        }

      } catch (e) {
        console.error("❌ Errore water_tree:", e.message);
      }
    });

    // --- AZIONE FORCE WATER (ADMIN) ---
    socket.on('admin_force_water', async ({ treeId, amount }) => {
      try {
        const { tree } = await treeService.waterTreeLogic(treeId, amount);
        // Notifica tutti
        io.emit('tree_updated', tree);
      } catch (e) { 
        console.error("❌ Errore admin_force_water:", e.message); 
      }
    });
  });
};