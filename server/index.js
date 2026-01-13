require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// IMPORT MODELLI (Assicurati che esistano nella cartella models!)
const Tree = require('./models/Tree'); 
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Variabili d'ambiente
const PORT = process.env.PORT || 3000;
// NOTA: Qui usa process.env.MONGO_URI che deve essere nel file .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chlorophyll';
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Connessione DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// --- WEBSOCKET ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // 1. ASCOLTA: Richiesta di innaffiare
  socket.on('water_tree', async ({ treeId }) => {
    console.log(`🚿 Innaffio albero: ${treeId}`);
    try {
      const tree = await Tree.findById(treeId);
      if (tree) {
        // Logica: aggiungi acqua ma non superare 100
        tree.waterLevel = Math.min(tree.waterLevel + 10, 100);
        // Aggiorna stato
        if (tree.waterLevel > 50) tree.status = 'healthy';
        else if (tree.waterLevel > 20) tree.status = 'thirsty';
        
        await tree.save();
        
        // 2. RISPONDI: Dillo a tutti
        io.emit('tree_updated', tree);
      }
    } catch (e) {
      console.error(e);
    }
  });
  
  socket.on('disconnect', () => console.log('❌ Utente disconnesso'));
});

// --- API REST (QUESTA È LA PARTE CHE TI MANCAVA!) ---

app.get('/api/trees', async (req, res) => {
  try {
    // Scarica tutti gli alberi dal DB
    const trees = await Tree.find();
    console.log(`📂 Inviati ${trees.length} alberi al frontend`);
    res.json(trees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Rotta di base
app.get('/', (req, res) => res.send('Chlorophyll Backend is running! 🌿'));

// Avvio
server.listen(PORT, () => {
  console.log(`🚀 Server attivo su http://localhost:${PORT}`);
});