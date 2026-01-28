const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

// 1. ENDPOINT ANALYTICS (Per la Control Room)
// Carica i dati ottimizzati: storico tagliato agli ultimi 20 punti.
router.get('/analytics', async (req, res) => {
  try {
    const allTrees = await Tree.find({}, {
      name: 1, 
      category: 1, 
      status: 1, 
      waterLevel: 1, 
      city: 1, 
      location: 1,
      // 🔥 MAGIC TRICK: Prende solo gli ultimi 20 valori dello storico!
      history: { $slice: -20 } 
    });

    const totalTrees = allTrees.length;
    const criticalTrees = allTrees.filter(t => t.status === 'critical').length;
    const thirstyTrees = allTrees.filter(t => t.status === 'thirsty').length;
    const healthyTrees = allTrees.filter(t => t.status === 'healthy').length;

    const totalWater = allTrees.reduce((sum, t) => sum + t.waterLevel, 0);
    const avgWater = totalTrees > 0 ? Math.round(totalWater / totalTrees) : 0;

    // Raggruppa per Categorie
    const categories = {};
    allTrees.forEach(t => {
      const cat = t.category || 'other';
      if (!categories[cat]) categories[cat] = { total: 0, healthy: 0, thirsty: 0, critical: 0 };
      categories[cat].total++;
      categories[cat][t.status]++;
    });

    res.json({
      totalTrees,
      criticalTrees,
      thirstyTrees,
      healthyTrees,
      avgWater,
      categories,
      allTrees // Manda la lista ottimizzata
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. STATISTICHE VELOCI (Per AdminPanel Widget)
router.get('/stats', async (req, res) => {
  try {
    const trees = await Tree.find().select('status waterLevel');
    const totalTrees = trees.length;
    const criticalTrees = trees.filter(t => t.status === 'critical').length;
    const thirstyTrees = trees.filter(t => t.status === 'thirsty').length;
    const healthyTrees = trees.filter(t => t.status === 'healthy').length;
    
    const totalWater = trees.reduce((sum, t) => sum + t.waterLevel, 0);
    const avgWater = totalTrees > 0 ? Math.round(totalWater / totalTrees) : 0;

    res.json({ totalTrees, criticalTrees, thirstyTrees, healthyTrees, avgWater });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. LOG DI SISTEMA
router.get('/logs', async (req, res) => {
  try {
    const logs = await ActionLog.find()
      .populate('user', 'username')
      .populate('tree', 'name')
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/logs', async (req, res) => {
  try {
    await ActionLog.deleteMany({});
    res.json({ message: 'Log svuotati' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;