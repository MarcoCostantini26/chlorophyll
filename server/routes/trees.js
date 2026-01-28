const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');

// GET ALL TREES (Per Dashboard e Mappa)
// Velocissimo: Scarica 0 storico.
router.get('/', async (req, res) => {
  try {
    const trees = await Tree.find().select('-history'); 
    res.json(trees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET SINGLE TREE (Per Dettaglio Albero)
// Completo: Scarica tutto lo storico per i grafici grandi.
router.get('/:id', async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);
    if (!tree) return res.status(404).json({ message: 'Albero non trovato' });
    res.json(tree);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE TREE
router.post('/', async (req, res) => {
  const tree = new Tree({
    name: req.body.name,
    category: req.body.category || 'tree',
    location: req.body.location,
    city: req.body.city || null
  });

  try {
    const newTree = await tree.save();
    // Aggiorna tutti con lista leggera
    req.io.emit('trees_refresh', await Tree.find().select('-history'));
    res.status(201).json(newTree);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE TREE
router.delete('/:id', async (req, res) => {
  try {
    await Tree.findByIdAndDelete(req.params.id);
    req.io.emit('trees_refresh', await Tree.find().select('-history'));
    res.json({ message: 'Albero eliminato' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;