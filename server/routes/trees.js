const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');

// GET /api/trees (Tutti)
router.get('/', async (req, res) => {
  try { 
    const trees = await Tree.find(); 
    res.json(trees); 
  } catch (e) { 
    res.status(500).json({ error: "Errore nel recupero alberi" }); 
  }
});

// GET /api/trees/:id (Singolo con storico completo)
router.get('/:id', async (req, res) => {
  try {
    const tree = await Tree.findById(req.params.id);
    if (!tree) return res.status(404).json({ error: "Albero non trovato" });
    res.json(tree);
  } catch (e) {
    res.status(500).json({ error: "Errore dettaglio albero" });
  }
});

module.exports = router;