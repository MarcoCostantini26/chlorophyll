const express = require('express');
const router = express.Router();
const Tree = require('../models/Tree');
const ActionLog = require('../models/ActionLog');

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
    const logs = await ActionLog.find()
      .sort({ timestamp: -1 })
      .limit(20) // Limitiamo a 20 per non appesantire
      .populate('user', 'username')
      .populate('tree', 'name');
    res.json(logs);
  } catch (e) { res.status(500).json({ error: "Errore log" }); }
});

// DELETE /api/admin/logs (Pulisci registro)
router.delete('/logs', async (req, res) => {
  try {
    await ActionLog.deleteMany({});
    res.json({ success: true, message: 'Registro attività pulito!' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante la pulizia dei log' });
  }
});

module.exports = router;