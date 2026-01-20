const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const allTrees = await Tree.find();
    
    // 1. Statistiche Totali
    const totalTrees = allTrees.length;
    const criticalTrees = allTrees.filter(t => t.status === 'critical').length;
    const healthyTrees = allTrees.filter(t => t.status === 'healthy').length;
    const thirstyTrees = allTrees.filter(t => t.status === 'thirsty').length;
    
    // 2. Media Acqua
    let sumWater = 0;
    allTrees.forEach(t => sumWater += (t.waterLevel || 0));
    const avgWater = totalTrees > 0 ? Math.round(sumWater / totalTrees) : 0;

    // 3. Dati Dettagliati per Categoria (PER IL GRAFICO STACKED)
    const statsByCategory = {};
    
    allTrees.forEach(t => {
      const cat = t.category || 'tree';
      
      // Inizializza se non esiste
      if (!statsByCategory[cat]) {
        statsByCategory[cat] = { healthy: 0, thirsty: 0, critical: 0 };
      }
      
      // Incrementa il contatore specifico dello stato
      const status = t.status || 'healthy'; // Fallback
      if (statsByCategory[cat][status] !== undefined) {
        statsByCategory[cat][status]++;
      }
    });

    res.json({
      totalTrees,
      criticalTrees,
      healthyTrees,
      thirstyTrees,
      avgWater,
      categories: statsByCategory, // Ora contiene { tree: { healthy: 5, thirsty: 2... }, ... }
      allTrees
    });
  } catch (e) {
    console.error("Errore analytics:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
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

// GET /api/admin/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await ActionLog.find().sort({ timestamp: -1 }).limit(50).populate('user', 'username').populate('tree', 'name');
    res.json(logs);
  } catch (e) { res.status(500).json({ error: "Errore log" }); }
});

// DELETE /api/admin/logs
router.delete('/logs', async (req, res) => {
  await ActionLog.deleteMany({});
  res.json({ success: true });
});

module.exports = router;