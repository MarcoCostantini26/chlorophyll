const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');

// GET /api/trees
router.get('/', async (req, res) => {
  try { 
    const trees = await Tree.find(); 
    res.json(trees); 
  } catch (e) { 
    res.status(500).json({ error: "Errore nel recupero alberi" }); 
  }
});

module.exports = router;