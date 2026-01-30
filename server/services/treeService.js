const Tree = require('../models/Tree');
const { ACTION_VALUES, THRESHOLDS } = require('../config/constants');

const calculateStatus = (level) => {
  if (level >= THRESHOLDS.healthy) return 'healthy';
  if (level > THRESHOLDS.thirsty) return 'thirsty';
  return 'critical';
};

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

  if (tree.history.length > 50) tree.history.shift();
};

exports.waterTreeLogic = async (treeId, amount = null) => {
  const tree = await Tree.findById(treeId);
  if (!tree) throw new Error('Albero non trovato');

  const now = new Date();
  const wasCritical = tree.waterLevel <= THRESHOLDS.thirsty;
  
  const healthGain = amount !== null ? amount : (ACTION_VALUES[tree.category] || ACTION_VALUES.default);
  
  let newLevel = tree.waterLevel + healthGain;
  newLevel = Math.min(Math.max(newLevel, 0), 100);

  addHistoryPoint(tree, newLevel, now);

  tree.waterLevel = newLevel;
  tree.lastWatered = now;
  tree.status = calculateStatus(newLevel);

  await tree.save();

  return { tree, wasCritical, healthGain };
};