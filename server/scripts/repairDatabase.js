require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const Tree = require('../models/Tree');

const MONGO_URI = process.env.MONGO_URI; 
const TICK_RATE = 600000; 

const repairHistory = async () => {
  try {
    const trees = await Tree.find();
    console.log(`Analisi di ${trees.length} alberi...`);

    for (const tree of trees) {
      if (!tree.history || tree.history.length < 2) continue;

      tree.history.sort((a, b) => new Date(a.date) - new Date(b.date));

      const newHistory = [];
      let pointsAdded = 0;

      for (let i = 0; i < tree.history.length - 1; i++) {
        const currentPoint = tree.history[i];
        const nextPoint = tree.history[i+1];
        
        newHistory.push(currentPoint);

        const diffMs = new Date(nextPoint.date) - new Date(currentPoint.date);

        if (diffMs > (TICK_RATE * 1.5)) {
          const missingPoints = Math.floor(diffMs / TICK_RATE);
          const stepValue = (nextPoint.val - currentPoint.val) / missingPoints;

          for (let j = 1; j < missingPoints; j++) {
            newHistory.push({
              val: Math.round(currentPoint.val + (stepValue * j)),
              date: new Date(new Date(currentPoint.date).getTime() + (j * TICK_RATE))
            });
            pointsAdded++;
          }
        }
      }
      newHistory.push(tree.history[tree.history.length - 1]);

      if (pointsAdded > 0) {
        tree.history = newHistory; 
        await tree.save();
        console.log(`🛠️ ${tree.name}: Riparati ${pointsAdded} punti.`);
      }
    }
    console.log('Database riparato.');
  } catch (e) {
    console.error('Errore:', e);
  }
};

const run = async () => {
  try {
    if (!MONGO_URI) throw new Error("Manca MONGO_URI!");
    await mongoose.connect(MONGO_URI);
    await repairHistory();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();