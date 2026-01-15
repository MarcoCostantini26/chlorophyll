require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Groq = require('groq-sdk');

// Import dei Modelli
const Tree = require('./models/Tree');
const User = require('./models/User');
const ActionLog = require('./models/ActionLog');

// Import del servizio Meteo (assicurati di avere il file weatherService.js)
const { startWeatherSimulation } = require('./weatherService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- CONFIGURAZIONE AI (GROQ) ---
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log("🧠 AI Dr. Chlorophyll: ATTIVATA (Groq LPU)");
} else {
  console.log("⚠️ AI Dr. Chlorophyll: MODALITÀ BACKUP (Chiave mancante)");
}

// --- MIDDLEWARE ---
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// --- DATABASE ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('🍃 MongoDB Connesso'))
  .catch(err => console.error('❌ Errore MongoDB:', err));

// --- SOCKET.IO ---
const io = new Server(server, { 
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PUT"] } 
});

// Funzione Helper per calcolare lo stato dell'albero
const calculateStatus = (level) => {
  if (level >= 70) return 'healthy';
  if (level > 30) return 'thirsty';
  return 'critical';
};

// Avvia la simulazione del meteo
startWeatherSimulation(io);

// Gestione Eventi Socket
io.on('connection', (socket) => {
  console.log(`🔌 Utente connesso: ${socket.id}`);

  // Azione: Innaffia Albero
  socket.on('water_tree', async ({ treeId, userId }) => {
    try {
      const tree = await Tree.findById(treeId);
      if (!tree) return;
      
      // Logica Acqua
      tree.waterLevel = Math.min(tree.waterLevel + 20, 100);
      tree.status = calculateStatus(tree.waterLevel);
      await tree.save();
      
      // Avvisa tutti i client
      io.emit('tree_updated', tree);

      // Logica XP Utente
      if (userId && userId !== 'guest') {
        // Crea Log
        await ActionLog.create({ 
          user: userId, 
          tree: treeId, 
          actionType: 'water', 
          details: `Livello portato a ${tree.waterLevel}%` 
        });

        // Aggiorna Utente
        const user = await User.findById(userId);
        if (user) {
          user.xp += 15;
          const newLevel = Math.floor(user.xp / 100) + 1;
          
          if (newLevel > user.level) {
            user.level = newLevel;
            io.emit('level_up', { username: user.username, level: user.level });
            
            // Sblocca Badge "GREEN_THUMB" al livello 5
            if (newLevel === 5 && !user.badges.includes('GREEN_THUMB')) {
              user.badges.push('GREEN_THUMB');
              io.emit('badge_unlocked', { 
                username: user.username, 
                badge: { name: 'Pollice Verde', desc: 'Raggiunto il livello 5!' } 
              });
            }
          }

          // Badge "FIRST_DROP" (Prima Innaffiata)
          if (!user.badges.includes('FIRST_DROP')) {
             user.badges.push('FIRST_DROP');
             io.emit('badge_unlocked', {
               username: user.username,
               badge: { name: 'Prima Goccia', desc: 'Hai innaffiato il tuo primo albero.' }
             });
          }

          await user.save();
          io.emit('user_updated', user);
        }
      }
    } catch (e) { console.error(e); }
  });

  // Azione Admin: Forza Acqua
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

// --- API REST ROUTES ---

// 1. Ottieni Alberi
app.get('/api/trees', async (req, res) => {
  const trees = await Tree.find();
  res.json(trees);
});

// 2. Login Utente
app.post('/api/users/login', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
  if (!user) return res.status(404).json({ error: "Utente non trovato" });
  res.json(user);
});

// 3. Aggiorna Utente (Avatar, ecc.) [NUOVO]
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      id, 
      { avatar: avatar }, 
      { new: true } 
    );

    if (!updatedUser) return res.status(404).json({ error: "Utente non trovato" });

    // Avvisa i socket che l'utente è cambiato
    io.emit('user_updated', updatedUser);

    res.json(updatedUser);
  } catch (e) {
    console.error("Errore update user:", e);
    res.status(500).json({ error: "Errore server" });
  }
});

// 4. Classifica
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ role: 'green_guardian' })
                               .sort({ xp: -1 })
                               .limit(3)
                               .select('username xp level avatar'); 
    res.json(topUsers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. Consulenza AI (Dr. Chlorophyll)
app.post('/api/ai/consult', async (req, res) => {
  try {
    const { treeId } = req.body;
    const tree = await Tree.findById(treeId);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });

    if (groq) {
      try {
        const prompt = `Sei il Dr. Chlorophyll, un botanico saggio e un po' sarcastico. 
        Analizza questo albero:
        - Nome: ${tree.name}
        - Specie: ${tree.species}
        - Acqua: ${tree.waterLevel}%
        - Stato: ${tree.status}
        
        Dai un consiglio brevissimo (max 20 parole) con una emoji finale.`;

        const chatCompletion = await groq.chat.completions.create({
          "messages": [{ "role": "user", "content": prompt }],
          "model": "llama-3.3-70b-versatile",
          "temperature": 0.7,
          "max_tokens": 100
        });

        const aiMessage = chatCompletion.choices[0]?.message?.content || "Nessun consiglio.";
        return res.json({ message: aiMessage });

      } catch (aiError) {
        console.error("Errore Groq:", aiError.message);
      }
    }

    // Fallback se AI non va o manca chiave
    let backupMsg = "";
    if (tree.waterLevel < 30) backupMsg = `⚠️ ${tree.name} sta morendo di sete! Dagli acqua subito!`;
    else if (tree.waterLevel < 70) backupMsg = `ℹ️ ${tree.name} gradirebbe un po' d'acqua.`;
    else backupMsg = `✅ ${tree.name} è in ottima salute. Ottimo lavoro!`;

    res.json({ message: backupMsg });

  } catch (error) { res.status(500).json({ error: "Errore Dr. Chlorophyll" }); }
});

// 6. Admin Stats
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

// 7. Admin Logs
app.get('/api/admin/logs', async (req, res) => {
  const logs = await ActionLog.find()
                              .sort({ timestamp: -1 })
                              .limit(10)
                              .populate('user', 'username')
                              .populate('tree', 'name');
  res.json(logs);
});

// --- AVVIO SERVER ---
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));