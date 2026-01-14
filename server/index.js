require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// IMPORT MODELLI (Assicurati che esistano nella cartella models)
const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog');

// IMPORT SERVIZI
const { startWeatherSimulation } = require('./weatherService');

const app = express();
const server = http.createServer(app);

// CONFIGURAZIONE
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// MIDDLEWARE
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// DB CONNECTION
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso (Atlas)'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// SOCKET.IO
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// HELPER STATUS
const calculateStatus = (level) => {
  if (level >= 70) return 'healthy';
  if (level > 30) return 'thirsty';
  return 'critical';
};

// AVVIO METEO
startWeatherSimulation(io);

// --- WEBSOCKET ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // 1. INNAFFIA STANDARD
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;

      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);
      tree.status = calculateStatus(tree.waterLevel);

      await tree.save();
      io.emit('tree_updated', tree);

      // Log & Gamification
      if (userId && userId !== 'guest') {
        // Log
        await ActionLog.create({
          user: userId,
          tree: treeId,
          actionType: 'water',
          details: `Livello portato a ${tree.waterLevel}%`
        });

        // XP
        const user = await User.findById(userId);
        if (user) {
          user.xp += 15;
          const newLevel = Math.floor(user.xp / 100) + 1;
          
          if (newLevel > user.level) {
            user.level = newLevel;
            io.emit('level_up', { username: user.username, level: user.level });
          }
          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error(e); }
  });

  // 2. ADMIN FORCE (DEBUG)
  socket.on('admin_force_water', async ({ treeId, amount }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;

      let newLevel = tree.waterLevel + amount;
      if (newLevel > 100) newLevel = 100;
      if (newLevel < 0) newLevel = 0;
      
      tree.waterLevel = newLevel;
      tree.status = calculateStatus(tree.waterLevel);

      await tree.save();
      io.emit('tree_updated', tree);
    } catch (e) { console.error(e); }
  });
});

// --- API REST ---

// Alberi
app.get('/api/trees', async (req, res) => {
  const trees = await Tree.find();
  res.json(trees);
});

// Login
app.post('/api/users/login', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  res.json(user);
});

// CLASSIFICA (NUOVO!)
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ role: 'green_guardian' })
      .sort({ xp: -1 })
      .limit(3)
      .select('username xp level');
    res.json(topUsers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI
app.post('/api/ai/consult', async (req, res) => {
  const { treeId } = req.body;
  const tree = await Tree.findById(treeId);
  if (!tree) return res.status(404).json({ error: "No tree" });

  let msg = tree.waterLevel < 30 ? "⚠️ CRITICO" : tree.waterLevel < 70 ? "ℹ️ ASSETATO" : "✅ SANO";
  setTimeout(() => res.json({ message: msg + ` (${tree.waterLevel}%)` }), 1000);
});

// Admin Stats
// ADMIN STATS
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Scarichiamo tutti gli alberi per contare "a mano" ed evitare errori di database
    const allTrees = await Tree.find();
    
    const totalTrees = allTrees.length;
    
    // Contiamo gli stati filtrando l'array
    const criticalTrees = allTrees.filter(t => t.status === 'critical').length;
    const healthyTrees = allTrees.filter(t => t.status === 'healthy').length;
    const thirstyTrees = allTrees.filter(t => t.status === 'thirsty').length;
    
    // Calcolo Media Manuale (Più sicuro)
    let sumWater = 0;
    allTrees.forEach(t => {
      // Assicuriamoci che sia un numero, altrimenti 0
      sumWater += (typeof t.waterLevel === 'number' ? t.waterLevel : 0);
    });
    
    const avgWater = totalTrees > 0 ? Math.round(sumWater / totalTrees) : 0;

    res.json({ totalTrees, criticalTrees, healthyTrees, thirstyTrees, avgWater });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin Logs
app.get('/api/admin/logs', async (req, res) => {
  const logs = await ActionLog.find().sort({ timestamp: -1 }).limit(10).populate('user', 'username').populate('tree', 'name');
  res.json(logs);
});

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));