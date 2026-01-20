const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');

// GET /api/groups - Lista gruppi
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('creator', 'username')
      .sort({ eventDate: 1 });
    res.json(groups);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/groups - Crea gruppo
router.post('/', async (req, res) => {
  try {
    const { name, description, location, eventDate, userId } = req.body;
    const newGroup = await Group.create({
      name, description, location, eventDate,
      creator: userId,
      members: [userId] // Il creatore è automaticamente membro
    });
    res.json(newGroup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/groups/:id/join - Unisciti
router.post('/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: userId } }, // Evita duplicati
      { new: true }
    );
    res.json(group);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/groups/:id/messages - Leggi chat
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await GroupMessage.find({ group: req.params.id })
      .populate('user', 'username')
      .sort({ timestamp: 1 });
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/groups/:id/messages - Scrivi messaggio
router.post('/:id/messages', async (req, res) => {
  try {
    const { userId, text } = req.body;
    const msg = await GroupMessage.create({
      group: req.params.id,
      user: userId,
      text
    });
    
    // Popoliamo subito per il frontend
    const fullMsg = await GroupMessage.findById(msg._id).populate('user', 'username');
    
    // 🔥 USIAMO IL TUO MIDDLEWARE SOCKET ESISTENTE
    // Questo permette l'aggiornamento real-time se implementeremo l'ascolto sul client
    req.io.emit(`group_message_${req.params.id}`, fullMsg);
    
    res.json(fullMsg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;