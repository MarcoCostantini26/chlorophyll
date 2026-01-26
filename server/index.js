require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Modelli
const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog');

// Import Routes
const treesRoutes = require('./routes/trees');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Servizio Meteo
const { startWeatherSimulation, getCurrentWeather } = require('./weatherService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware Base
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Connessione DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// Configurazione Socket.io
const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT", "DELETE"] } 
});

// Middleware Socket injection
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- UTILIZZO ROTTE ---
app.use('/api/trees', treesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// --- LOGICA DI GIOCO (GAME BALANCE) ---
const ACTION_VALUES = {
  tree: 20,             // Innaffia
  flowerbed: 20,        // Innaffia
  vertical_garden: 20,  // Innaffia
  hedge: 30,            // Pota
  bush: 30,             // Pota
  potted: 40,           // Concima
  succulent: 15,        // Pulisci
  default: 20           // Fallback
};

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

startWeatherSimulation(io);

io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);
  socket.emit('weather_update', getCurrentWeather());

  // --- AZIONE INNAFFIA (CON LOGICA BADGE) ---
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      
      // 1. Definisci wasCritical PRIMA di modificare l'acqua (FIX IMPORTANTE)
      const wasCritical = tree.waterLevel <= 20;

      // 2. Determina il guadagno di salute
      const healthGain = ACTION_VALUES[tree.category] || ACTION_VALUES.default;
      
      // 3. Applica l'incremento
      tree.waterLevel = Math.min(tree.waterLevel + healthGain, 100);
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      
      io.emit('tree_updated', tree);

      // 4. Log e XP Utente
      if (userId && userId !== 'guest') {
        
        // Logica nome azione
        let actionName = 'water';
        if (['hedge', 'bush'].includes(tree.category)) actionName = 'prune';
        else if (['potted', 'succulent'].includes(tree.category)) actionName = 'treat';

        await ActionLog.create({ 
            user: userId, 
            tree: treeId, 
            actionType: actionName, 
            details: `Salute +${healthGain}% (Livello: ${tree.waterLevel}%)` 
        });
        
        const user = await User.findById(userId);
        if (user) {
          // --- PULIZIA DUPLICATI (FIX "10 BADGE") ---
          // Rimuove i duplicati dall'array dei badge
          user.badges = [...new Set(user.badges)];
          
          // Assegnazione XP
          user.xp += 15;
          const newLevel = Math.floor(user.xp / 100) + 1;
          
          // LEVEL UP
          if (newLevel > user.level) {
            user.level = newLevel;
            io.emit('level_up', { username: user.username, level: user.level });
            
            // Badge Livello 5
            if (newLevel >= 5 && !user.badges.includes('GREEN_THUMB')) {
              user.badges.push('GREEN_THUMB');
              io.emit('badge_unlocked', { username: user.username, badge: { name: 'Pollice Verde', desc: 'Raggiunto il livello 5!' } });
            }
          }

          // Badge Prima Goccia
          if (!user.badges.includes('FIRST_DROP')) {
             user.badges.push('FIRST_DROP');
             io.emit('badge_unlocked', { username: user.username, badge: { name: 'Prima Goccia', desc: 'Hai curato la tua prima pianta.' } });
          }

          // Badge Soccorritore (Se era critico)
          if (wasCritical && !user.badges.includes('SAVER')) {
            user.badges.push('SAVER');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Soccorritore', desc: 'Hai salvato una pianta critica!' } });
          }

          // Badge Gufo Notturno (22:00 - 05:00)
          const hour = new Date().getHours();
          if ((hour >= 22 || hour < 5) && !user.badges.includes('NIGHT_OWL')) {
            user.badges.push('NIGHT_OWL');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Gufo Notturno', desc: 'Cura notturna effettuata.' } });
          }

          // Badge Veterano (20 Azioni totali)
          const actionCount = await ActionLog.countDocuments({ user: userId, actionType: 'water' });
          if (actionCount >= 20 && !user.badges.includes('VETERAN')) {
            user.badges.push('VETERAN');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Veterano', desc: '20 Innaffiature completate!' } });
          }

          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error(e); }
  });

  // --- AZIONE ADMIN ---
  socket.on('admin_force_water', async ({ treeId, amount }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      let newLevel = Math.min(Math.max(tree.waterLevel + amount, 0), 100);
      tree.waterLevel = newLevel;
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      io.emit('tree_updated', tree);
    } catch (e) { console.error(e); }
  });
});

server.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));