const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    // Cerca case-insensitive
    const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ role: 'green_guardian' })
      .sort({ xp: -1 })
      .limit(5)
      .select('username xp level avatar');
    res.json(topUsers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id (Aggiorna Avatar)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar } = req.body;
    const updatedUser = await User.findByIdAndUpdate(id, { avatar: avatar }, { new: true });
    
    if (!updatedUser) return res.status(404).json({ error: "Utente non trovato" });
    
    // Notifica Socket tramite req.io
    req.io.emit('user_updated', updatedUser); 
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: "Errore server" }); }
});

// POST /api/users/adopt (Adotta/Abbandona)
router.post('/adopt', async (req, res) => {
  try {
    const { userId, treeId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    if (!user.adoptedTrees) user.adoptedTrees = [];

    const index = user.adoptedTrees.indexOf(treeId);
    if (index > -1) {
      user.adoptedTrees.splice(index, 1); // Rimuovi
    } else {
      user.adoptedTrees.push(treeId); // Aggiungi
    }

    user.markModified('adoptedTrees');
    await user.save();
    
    // Notifica Socket
    req.io.emit('user_updated', user);
    
    res.json(user);
  } catch (e) {
    console.error("Errore adozione:", e);
    res.status(500).json({ error: "Errore adozione" });
  }
});

module.exports = router;