require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Groq = require('groq-sdk');

// Import Modelli
const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog');

// IMPORTIAMO LE DUE FUNZIONI DAL SERVIZIO METEO
const { startWeatherSimulation, getCurrentWeather } = require('./weatherService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Configurazione AI
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("🧠 AI Dr. Chlorophyll: ATTIVATA");
} else {
  console.log("⚠️ AI Dr. Chlorophyll: DISATTIVATA (Manca Key)");
}

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Connessione DB
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// Configurazione Socket.io
const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT"] } 
});

// Helper Stato
const calculateStatus = (level) => {
  if (level >= 60) return 'healthy';
  if (level > 20) return 'thirsty';
  return 'critical';
};

// AVVIA IL CICLO METEO
startWeatherSimulation(io);

// --- GESTIONE SOCKET ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // 🔴 PUNTO CRUCIALE: Appena l'utente entra, gli inviamo il meteo attuale!
  const currentW = getCurrentWeather();
  socket.emit('weather_update', currentW);

  // Gestione Innaffiamento
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      
      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      
      io.emit('tree_updated', tree);

      if (userId && userId !== 'guest') {
        await ActionLog.create({ user: userId, tree: treeId, actionType: 'water', details: `Livello portato a ${tree.waterLevel}%` });
        
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
             io.emit('badge_unlocked', { username: user.username, badge: { name: 'Prima Goccia', desc: 'Hai innaffiato il tuo primo albero.' } });
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

// --- API ROUTES ---

// Get Alberi
app.get('/api/trees', async (req, res) => {
  try { const trees = await Tree.find(); res.json(trees); } catch (e) { res.status(500).json({ error: "Errore" }); }
});

// Login
app.post('/api/users/login', async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

// Update Utente (Avatar)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(id, { avatar: avatar }, { new: true });
    if (!updatedUser) return res.status(404).json({ error: "Utente non trovato" });
    
    io.emit('user_updated', updatedUser); // Notifica live
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: "Errore server" }); }
});

// Leaderboard
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ role: 'green_guardian' }).sort({ xp: -1 }).limit(5).select('username xp level avatar');
    res.json(topUsers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI Dr. Chlorophyll
app.post('/api/ai/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    if (groq) {
      try {
        const prompt = `Sei Dr. Chlorophyll. Analizza: ${tree.name}, Acqua: ${tree.waterLevel}%. Consiglio breve e sarcastico.`;
        const chatCompletion = await groq.chat.completions.create({ messages: [{ "role": "user", "content": prompt }], model: "llama-3.3-70b-versatile", temperature: 0.7, max_tokens: 100 });
        const aiMessage = chatCompletion.choices[0]?.message?.content || "Nessun consiglio.";
        return res.json({ message: aiMessage });
      } catch (aiError) { console.error("Errore Groq:", aiError.message); }
    }
    let backupMsg = tree.waterLevel < 30 ? "⚠️ Serve acqua!" : "✅ Tutto ok.";
    res.json({ message: backupMsg });
  } catch (error) { res.status(500).json({ error: "Errore AI" }); }
});

// Stats Admin
app.get('/api/admin/stats', async (req, res) => {
  try {
    const allTrees = await Tree.find();
    const totalTrees = allTrees.length;
    const criticalTrees = allTrees.filter(t => t.status === 'critical').length;
    const healthyTrees = allTrees.filter(t => t.status === 'healthy').length;
    const thirstyTrees = allTrees.filter(t => t.status === 'thirsty').length;
    let sumWater = 0;
    allTrees.forEach(t => sumWater += (t.waterLevel || 0));
    const avgWater = totalTrees > 0 ? Math.round(sumWater / totalTrees) : 0;
    res.json({ totalTrees, criticalTrees, healthyTrees, thirstyTrees, avgWater });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logs Admin
app.get('/api/admin/logs', async (req, res) => {
  try {
    const logs = await ActionLog.find().sort({ timestamp: -1 }).limit(10).populate('user', 'username').populate('tree', 'name');
    res.json(logs);
  } catch (e) { res.status(500).json({ error: "Errore log" }); }
});

server.listen(PORT, () => console.log(`🚀 Server avviato sulla porta ${PORT}`));