const treeService = require('../services/treeService');
const gameService = require('../services/gameService');
const { getCurrentWeather, getLastWeatherMap } = require('../services/weatherService');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Utente connesso: ${socket.id}`);

    socket.emit('weather_update', getCurrentWeather());
    socket.emit('weather_map_update', getLastWeatherMap());

    socket.on('water_tree', async ({ treeId, userId }) => {
      try {
        const { tree, wasCritical, healthGain } = await treeService.waterTreeLogic(treeId);
        
        io.emit('tree_updated', tree);

        if (userId) {
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
            if (result.newLevel) {
              io.emit('level_up', { username: result.user.username, level: result.newLevel });
            }
            result.unlockedBadges.forEach(badge => {
              io.emit('badge_unlocked', { username: result.user.username, badge });
            });
            
            io.emit('user_updated', result.user);
          }
        }

      } catch (e) {
        console.error("❌ Errore water_tree:", e.message);
      }
    });

    socket.on('admin_force_water', async ({ treeId, amount }) => {
      try {
        const { tree } = await treeService.waterTreeLogic(treeId, amount);
        io.emit('tree_updated', tree);
      } catch (e) { 
        console.error("❌ Errore admin_force_water:", e.message); 
      }
    });
  });
};