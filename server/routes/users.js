const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
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

// PUT /api/users/:id (Modifica Profilo)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar, username } = req.body;
    
    const updateData = {};
    if (avatar) updateData.avatar = avatar;
    if (username) updateData.username = username;

    if (username) {
      const exists = await User.findOne({ username, _id: { $ne: id } });
      if (exists) return res.status(400).json({ error: "Username già in uso!" });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!updatedUser) return res.status(404).json({ error: "Utente non trovato" });
    
    req.io.emit('user_updated', updatedUser); 
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/adopt (CON LOGICA BADGE GUARDIANO)
router.post('/adopt', async (req, res) => {
  try {
    const { userId, treeId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    if (!user.adoptedTrees) user.adoptedTrees = [];
    const index = user.adoptedTrees.indexOf(treeId);
    
    if (index > -1) {
      // Rimozione adozione
      user.adoptedTrees.splice(index, 1);
    } else {
      // Nuova Adozione
      user.adoptedTrees.push(treeId);

      // BADGE: GUARDIANO
      if (!user.badges.includes('GUARDIAN')) {
        user.badges.push('GUARDIAN');
        if (req.io) {
          req.io.emit('badge_unlocked', { 
            username: user.username, 
            badge: { name: 'Guardiano', desc: 'Hai adottato il tuo primo albero.' } 
          });
        }
      }
    }

    user.markModified('adoptedTrees');
    await user.save();
    
    req.io.emit('user_updated', user);
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Errore adozione" }); }
});

module.exports = router;