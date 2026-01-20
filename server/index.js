require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Modelli (Servono ancora per la logica socket qui sotto)
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

// MIDDLEWARE SPECIALE: Inietta 'io' in ogni richiesta HTTP
// Questo permette ai file in /routes di fare: req.io.emit(...)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- UTILIZZO ROTTE ---
app.use('/api/trees', treesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// --- LOGICA SOCKET.IO (Rimane qui per gestire il real-time diretto) ---

// Helper Stato
const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

// Avvia Meteo
startWeatherSimulation(io);

io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // Meteo iniziale
  socket.emit('weather_update', getCurrentWeather());

  // Gestione Innaffiamento / Azione
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      
      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      
      io.emit('tree_updated', tree);

      if (userId && userId !== 'guest') {
        // Log azione generica (water ora vale per potare/pulire/ecc)
        await ActionLog.create({ 
            user: userId, 
            tree: treeId, 
            actionType: 'water', // Puoi raffinare questo dal client se vuoi
            details: `Azione completata. Livello: ${tree.waterLevel}%` 
        });
        
        const user = await User.findById(userId);
        if (user) {
          user.xp += 15;
          const newLevel = Math.floor(user.xp / 100) + 1;
          
          if (newLevel > user.level) {
            user.level = newLevel;
            io.emit('level_up', { username: user.username, level: user.level });
            
            // Badge Pollice Verde
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
          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error(e); }
  });

  // Admin Force
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