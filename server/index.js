require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Modelli
const Tree = require('./models/Tree');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Configurazione
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Connessione DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso (Atlas)'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// Configurazione Socket.io
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// --- LOGICA WEBSOCKET ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // Evento: Innaffia Albero
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      // 1. Aggiorna Albero
      const tree = await Tree.findById(treeId);
      if (!tree) return;

      // Aumenta acqua (+20%) senza superare 100
      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);

      // Aggiorna stato salute in base all'acqua
      if (tree.waterLevel > 60) tree.status = 'healthy';
      else if (tree.waterLevel > 30) tree.status = 'thirsty';
      else tree.status = 'critical';

      await tree.save();
      
      // Notifica TUTTI i client dell'aggiornamento albero
      io.emit('tree_updated', tree);

      // 2. Gamification (Aggiorna Utente)
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.xp += 15; // +15 XP per azione
          
          // Calcolo Livello (1 livello ogni 100 XP)
          const newLevel = Math.floor(user.xp / 100) + 1;
          let leveledUp = false;

          if (newLevel > user.level) {
            user.level = newLevel;
            leveledUp = true;
          }

          await user.save();

          // Notifica SOLO il client che ha fatto l'azione (o broadcast se vuoi classifiche live)
          // Qui usiamo io.emit per semplicità didattica, così si aggiornano tutti i browser aperti con lo stesso utente
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

  socket.on('disconnect', () => console.log('❌ Utente disconnesso'));
});

// --- API REST ---

// Ottieni tutti gli alberi
app.get('/api/trees', async (req, res) => {
  try {
    const trees = await Tree.find();
    res.json(trees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Login (Prende il primo utente disponibile)
app.get('/api/users/mock-login', async (req, res) => {
  try {
    const user = await User.findOne(); // Prende il primo utente a caso
    if (!user) return res.status(404).json({ error: "Nessun utente nel DB. Lancia seed.js!" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Avvio Server
server.listen(PORT, () => {
  console.log(`🚀 Server attivo su http://localhost:${PORT}`);
});