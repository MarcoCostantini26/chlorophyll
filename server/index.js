require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// 1. IMPORTIAMO GROQ
const Groq = require('groq-sdk');

const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog');
const { startWeatherSimulation } = require('./weatherService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// 2. CONFIGURAZIONE GROQ
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("🧠 AI Dr. Chlorophyll: ATTIVATA (Groq LPU)");
} else {
  console.log("🧠 AI Dr. Chlorophyll: MODALITÀ BACKUP (Chiave mancante)");
}

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

const io = new Server(server, { cors: { origin: CLIENT_URL, methods: ["GET", "POST"] } });

const calculateStatus = (level) => {
  if (level >= 70) return 'healthy';
  if (level > 30) return 'thirsty';
  return 'critical';
};

startWeatherSimulation(io);

// --- WEBSOCKET ---
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

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
          }
          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error(e); }
  });

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

app.get('/api/trees', async (req, res) => {
  const trees = await Tree.find();
  res.json(trees);
});

app.post('/api/users/login', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  res.json(user);
});

app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ role: 'green_guardian' }).sort({ xp: -1 }).limit(3).select('username xp level');
    res.json(topUsers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- 3. INTEGRAZIONE AI (GROQ) ---
app.post('/api/ai/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    // A. SE GROQ È ATTIVO
    if (groq) {
      try {
        const prompt = `Sei il Dr. Chlorophyll, un botanico sarcastico e divertente. 
        Analizza questo albero: ${tree.name} (${tree.species}), Acqua: ${tree.waterLevel}%, Stato: ${tree.status}.
        Dammi un consiglio brevissimo (max 20 parole) con emoji.
        poi fammi una breve descrizione del tipo di albero`;

        const chatCompletion = await groq.chat.completions.create({
          "messages": [{ "role": "user", "content": prompt }],
          "model": "llama-3.3-70b-versatile",
          "temperature": 0.7,
          "max_tokens": 100
        });

        const aiMessage = chatCompletion.choices[0]?.message?.content || "Nessun consiglio.";
        return res.json({ message: aiMessage });

      } catch (aiError) {
        console.error("Errore Groq (Fallback):", aiError.message);
      }
    }

    // B. BACKUP SYSTEM
    let backupMsg = "";
    if (tree.waterLevel < 30) backupMsg = `⚠️ [BACKUP] ${tree.species} sta morendo (${tree.waterLevel}%). Acqua!`;
    else if (tree.waterLevel < 70) backupMsg = `ℹ️ [BACKUP] ${tree.species} ha sete (${tree.waterLevel}%).`;
    else backupMsg = `✅ [BACKUP] ${tree.species} sta una meraviglia (${tree.waterLevel}%).`;

    setTimeout(() => res.json({ message: backupMsg }), 1000);

  } catch (error) {
    res.status(500).json({ error: "Errore Dr. Chlorophyll" });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const allTrees = await Tree.find();
    const totalTrees = allTrees.length;
    const criticalTrees = allTrees.filter(t => t.status === 'critical').length;
    const healthyTrees = allTrees.filter(t => t.status === 'healthy').length;
    const thirstyTrees = allTrees.filter(t => t.status === 'thirsty').length;
    let sumWater = 0;
    allTrees.forEach(t => { sumWater += (typeof t.waterLevel === 'number' ? t.waterLevel : 0); });
    const avgWater = totalTrees > 0 ? Math.round(sumWater / totalTrees) : 0;
    res.json({ totalTrees, criticalTrees, healthyTrees, thirstyTrees, avgWater });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
  const logs = await ActionLog.find().sort({ timestamp: -1 }).limit(10).populate('user', 'username').populate('tree', 'name');
  res.json(logs);
});

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));