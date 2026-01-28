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

// Import Meteo (Tutte le funzioni)
const { startWeatherSimulation, getCurrentWeather, getLastWeatherMap } = require('./weatherService'); 

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// --- CONNESSIONE DB ---
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('🍃 MongoDB Connesso');
  })
  .catch(err => console.error('❌ Errore MongoDB:', err));

const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT", "DELETE"] } 
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/trees', treesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

const ACTION_VALUES = {
  tree: 20, flowerbed: 20, vertical_garden: 20,
  hedge: 30, bush: 30, potted: 40, succulent: 15, default: 20
};

const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

// Avvia il meteo
startWeatherSimulation(io);

io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // Manda Meteo SUBITO (senza attesa)
  socket.emit('weather_update', getCurrentWeather());
  const currentMap = getLastWeatherMap();
  socket.emit('weather_map_update', currentMap);

  // --- AZIONE INNAFFIA ---
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      
      const now = new Date();
      const wasCritical = tree.waterLevel <= 20;
      const healthGain = ACTION_VALUES[tree.category] || ACTION_VALUES.default;
      
      let newLevel = tree.waterLevel + healthGain;
      if (newLevel > 100) newLevel = 100;

      // Gestione Storico (1 punto al minuto)
      const lastEntry = tree.history.length > 0 ? tree.history[tree.history.length - 1] : null;
      let isSameMinute = false;

      if (lastEntry) {
        const lastDate = new Date(lastEntry.date);
        if (lastDate.getFullYear() === now.getFullYear() &&
            lastDate.getMonth() === now.getMonth() &&
            lastDate.getDate() === now.getDate() &&
            lastDate.getHours() === now.getHours() &&
            lastDate.getMinutes() === now.getMinutes()) {
              isSameMinute = true;
        }
      }

      if (isSameMinute) {
        lastEntry.val = newLevel;
        lastEntry.date = now;
      } else {
        tree.history.push({ val: newLevel, date: now });
      }

      tree.waterLevel = newLevel;
      tree.lastWatered = now;
      tree.status = calculateStatus(newLevel);

      if (tree.history.length > 50) tree.history.shift();

      await tree.save();
      
      // ⚡ OTTIMIZZAZIONE: Mandiamo SOLO questo albero aggiornato!
      io.emit('tree_updated', tree);

      // Gestione XP e Badge
      if (userId && userId !== 'guest') {
        let actionName = 'water';
        if (['hedge', 'bush'].includes(tree.category)) actionName = 'prune';
        else if (['potted', 'succulent'].includes(tree.category)) actionName = 'treat';

        await ActionLog.create({ 
            user: userId, tree: treeId, actionType: actionName, 
            details: `Salute +${healthGain}%` 
        });
        
        const user = await User.findById(userId);
        if (user) {
          user.badges = [...new Set(user.badges)];
          user.xp += 15;
          const userNewLevel = Math.floor(user.xp / 100) + 1;
          
          if (userNewLevel > user.level) {
            user.level = userNewLevel;
            io.emit('level_up', { username: user.username, level: user.level });
            if (userNewLevel >= 5 && !user.badges.includes('GREEN_THUMB')) {
              user.badges.push('GREEN_THUMB');
              io.emit('badge_unlocked', { username: user.username, badge: { name: 'Pollice Verde', desc: 'Raggiunto il livello 5!' } });
            }
          }
          if (!user.badges.includes('FIRST_DROP')) {
             user.badges.push('FIRST_DROP');
             io.emit('badge_unlocked', { username: user.username, badge: { name: 'Prima Goccia', desc: 'Hai curato la tua prima pianta.' } });
          }
          if (wasCritical && !user.badges.includes('SAVER')) {
            user.badges.push('SAVER');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Soccorritore', desc: 'Hai salvato una pianta critica!' } });
          }
          const hour = now.getHours();
          if ((hour >= 22 || hour < 5) && !user.badges.includes('NIGHT_OWL')) {
            user.badges.push('NIGHT_OWL');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Gufo Notturno', desc: 'Cura notturna effettuata.' } });
          }
          const actionCount = await ActionLog.countDocuments({ user: userId, actionType: 'water' });
          if (actionCount >= 20 && !user.badges.includes('VETERAN')) {
            user.badges.push('VETERAN');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Veterano', desc: '20 Innaffiature completate!' } });
          }
          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error("Errore water_tree:", e); }
  });

  // --- AZIONE ADMIN (Force Water) ---
  socket.on('admin_force_water', async ({ treeId, amount }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;

      const now = new Date();
      let newLevel = Math.min(Math.max(tree.waterLevel + amount, 0), 100);
      
      const lastEntry = tree.history.length > 0 ? tree.history[tree.history.length - 1] : null;
      let isSameMinute = false;

      if (lastEntry) {
        const lastDate = new Date(lastEntry.date);
        if (lastDate.getMinutes() === now.getMinutes() && lastDate.getHours() === now.getHours() && lastDate.getDate() === now.getDate()) {
           isSameMinute = true;
        }
      }

      if (isSameMinute) {
        lastEntry.val = newLevel;
        lastEntry.date = now;
      } else {
        tree.history.push({ val: newLevel, date: now });
      }

      tree.waterLevel = newLevel;
      tree.lastWatered = now;
      tree.status = calculateStatus(tree.waterLevel);
      
      if (tree.history.length > 50) tree.history.shift();

      await tree.save();
      
      // ⚡ OTTIMIZZAZIONE
      io.emit('tree_updated', tree);
      
    } catch (e) { console.error(e); }
  });
});

server.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));