const Tree = require('../models/Tree');
const { ACTION_VALUES, THRESHOLDS } = require('../config/constants');

const calculateStatus = (level) => {
  if (level >= THRESHOLDS.healthy) return 'healthy';
  if (level > THRESHOLDS.thirsty) return 'thirsty';
  return 'critical';
};

// Funzione helper per gestire lo storico (1 punto al minuto)
const addHistoryPoint = (tree, newVal, date = new Date()) => {
  const lastEntry = tree.history.length > 0 ? tree.history[tree.history.length - 1] : null;
  let isSameMinute = false;

  if (lastEntry) {
    const lastDate = new Date(lastEntry.date);
    if (lastDate.getFullYear() === date.getFullYear() &&
        lastDate.getMonth() === date.getMonth() &&
        lastDate.getDate() === date.getDate() &&
        lastDate.getHours() === date.getHours() &&
        lastDate.getMinutes() === date.getMinutes()) {
       isSameMinute = true;
    }
  }

  if (isSameMinute) {
    lastEntry.val = newVal;
    lastEntry.date = date;
  } else {
    tree.history.push({ val: newVal, date });
  }

  // Manteniamo lo storico pulito (ultimi 50 punti per sicurezza operativa)
  if (tree.history.length > 50) tree.history.shift();
};

exports.waterTreeLogic = async (treeId, amount = null) => {
  const tree = await Tree.findById(treeId);
  if (!tree) throw new Error('Albero non trovato');

  const now = new Date();
  const wasCritical = tree.waterLevel <= THRESHOLDS.thirsty;
  
  // Se 'amount' non è specificato (admin), usa il valore standard della categoria
  const healthGain = amount !== null ? amount : (ACTION_VALUES[tree.category] || ACTION_VALUES.default);
  
  let newLevel = tree.waterLevel + healthGain;
  // Clamp tra 0 e 100
  newLevel = Math.min(Math.max(newLevel, 0), 100);

  // Aggiorna storico
  addHistoryPoint(tree, newLevel, now);

  // Aggiorna stato
  tree.waterLevel = newLevel;
  tree.lastWatered = now;
  tree.status = calculateStatus(newLevel);

  await tree.save();

  return { tree, wasCritical, healthGain };
};