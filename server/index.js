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

// --- LOGICA SOCKET.IO ---
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
      
      // 1. Check stato critico PRIMA dell'aggiornamento (Badge Saver)
      const wasCritical = tree.waterLevel <= 20;

      // 2. Aggiorna Albero
      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      
      io.emit('tree_updated', tree);

      // 3. Logica Utente (XP e Badge)
      if (userId && userId !== 'guest') {
        // Log azione nel DB
        await ActionLog.create({ 
            user: userId, tree: treeId, actionType: 'water', 
            details: `Azione completata. Livello: ${tree.waterLevel}%` 
        });
        
        const user = await User.findById(userId);
        if (user) {
          // Aumento XP
          user.xp += 15;
          const newLevel = Math.floor(user.xp / 100) + 1;
          
          // LEVEL UP
          if (newLevel > user.level) {
            user.level = newLevel;
            io.emit('level_up', { username: user.username, level: user.level });
            
            // BADGE: POLLICE VERDE (Livello 5)
            if (newLevel >= 5 && !user.badges.includes('GREEN_THUMB')) {
              user.badges.push('GREEN_THUMB');
              io.emit('badge_unlocked', { username: user.username, badge: { name: 'Pollice Verde', desc: 'Raggiunto il livello 5!' } });
            }
          }

          // BADGE: PRIMA GOCCIA
          if (!user.badges.includes('FIRST_DROP')) {
             user.badges.push('FIRST_DROP');
             io.emit('badge_unlocked', { username: user.username, badge: { name: 'Prima Goccia', desc: 'Hai curato la tua prima pianta.' } });
          }

          // BADGE: SOCCORRITORE (Se era critico)
          if (wasCritical && !user.badges.includes('SAVER')) {
            user.badges.push('SAVER');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Soccorritore', desc: 'Hai salvato una pianta critica!' } });
          }

          // BADGE: GUFO NOTTURNO (Tra le 22:00 e le 05:00)
          const hour = new Date().getHours();
          if ((hour >= 22 || hour < 5) && !user.badges.includes('NIGHT_OWL')) {
            user.badges.push('NIGHT_OWL');
            io.emit('badge_unlocked', { username: user.username, badge: { name: 'Gufo Notturno', desc: 'Cura notturna effettuata.' } });
          }

          // BADGE: VETERANO (20 Azioni totali)
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

  // --- AZIONE ADMIN (FORZA ACQUA) ---
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