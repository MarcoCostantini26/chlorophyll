require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// IMPORT MODELLI
const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog'); // <--- NUOVO IMPORT

// IMPORT SERVIZI
const { startWeatherSimulation } = require('./weatherService');

const app = express();
const server = http.createServer(app);

// CONFIGURAZIONE VARIABILI
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// MIDDLEWARE
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// CONNESSIONE DATABASE
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso (Atlas)'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// CONFIGURAZIONE SOCKET.IO
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// --- AVVIO SIMULAZIONE METEO ---
startWeatherSimulation(io);


// --- GESTIONE WEBSOCKET (Real-time) ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // EVENTO: Innaffia Albero
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      // 1. Aggiorna Albero
      const tree = await Tree.findById(treeId);
      if (!tree) return;

      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);

      // Aggiorna stato salute
      if (tree.waterLevel > 60) tree.status = 'healthy';
      else if (tree.waterLevel > 30) tree.status = 'thirsty';
      else tree.status = 'critical';

      await tree.save();
      
      // Notifica TUTTI
      io.emit('tree_updated', tree);

      // 2. SALVA IL LOG (Nuovo per Admin)
      if (userId && userId !== 'guest') {
        // Salviamo l'azione nel database per le statistiche
        await ActionLog.create({
          user: userId,
          tree: treeId,
          actionType: 'water',
          details: `Idratazione portata a ${tree.waterLevel}%`
        });
      }

      // 3. Gamification (Solo se l'utente è loggato e non è guest)
      if (userId && userId !== 'guest') {
        const user = await User.findById(userId);
        if (user) {
          user.xp += 15;
          
          const newLevel = Math.floor(user.xp / 100) + 1;
          let leveledUp = false;

          if (newLevel > user.level) {
            user.level = newLevel;
            leveledUp = true;
          }

          await user.save();
          io.emit('user_updated', user);

          if (leveledUp) {
            io.emit('level_up', { username: user.username, level: user.level });
          }
        }
      }

    } catch (e) {
      console.error("Errore water_tree:", e);
    }
  });

  socket.on('disconnect', () => { });
});


// --- API REST ---

// 1. Ottieni tutti gli alberi
app.get('/api/trees', async (req, res) => {
  try {
    const trees = await Tree.find();
    res.json(trees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. LOGIN UTENTE
app.post('/api/users/login', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Errore server login" });
  }
});

// 3. AI CONSULTATION (Dr. Chlorophyll)
app.post('/api/ai/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    let diagnosis = "";
    if (tree.waterLevel < 20) {
      diagnosis = `⚠️ CRITICO: ${tree.species} a rischio. Innaffiare immediatamente!`;
    } else if (tree.waterLevel < 50) {
      diagnosis = `ℹ️ ATTENZIONE: ${tree.species} ha sete. Monitorare la situazione.`;
    } else {
      diagnosis = `✅ OTTIMO: ${tree.species} in perfetta salute.`;
    }

    setTimeout(() => res.json({ message: diagnosis }), 1500);
  } catch (error) {
    res.status(500).json({ error: "Dr. Chlorophyll non disponibile." });
  }
});

// 4. ADMIN STATS (Nuovo)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalTrees = await Tree.countDocuments();
    const criticalTrees = await Tree.countDocuments({ status: 'critical' });
    const healthyTrees = await Tree.countDocuments({ status: 'healthy' });
    const thirstyTrees = await Tree.countDocuments({ status: 'thirsty' });
    
    // Media Idratazione
    const aggregate = await Tree.aggregate([{ $group: { _id: null, avgWater: { $avg: "$waterLevel" } } }]);
    const avgWater = aggregate.length > 0 ? Math.round(aggregate[0].avgWater) : 0;

    res.json({ totalTrees, criticalTrees, healthyTrees, thirstyTrees, avgWater });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. ADMIN LOGS (Nuovo)
app.get('/api/admin/logs', async (req, res) => {
  try {
    const logs = await ActionLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('user', 'username')
      .populate('tree', 'name');
    
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server attivo su http://localhost:${PORT}`);
});