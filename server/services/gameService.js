const User = require('../models/User');
const ActionLog = require('../models/ActionLog');

exports.handleUserAction = async (userId, treeId, actionType, details, wasCritical) => {
  if (!userId || userId === 'guest') return null;

  const user = await User.findById(userId);
  if (!user) return null;

  await ActionLog.create({ 
    user: userId, 
    tree: treeId, 
    actionType, 
    details 
  });

  const xpGain = 15;
  user.xp += xpGain;
  const newLevel = Math.floor(user.xp / 100) + 1;
  let levelUpOccurred = false;

  const unlockedBadges = [];

  const unlockBadge = (code, name, desc) => {
    if (!user.badges.includes(code)) {
      user.badges.push(code);
      unlockedBadges.push({ name, desc });
    }
  };

  if (newLevel > user.level) {
    user.level = newLevel;
    levelUpOccurred = true;
    if (newLevel >= 5) unlockBadge('GREEN_THUMB', 'Pollice Verde', 'Raggiunto il livello 5!');
  }

  if (wasCritical) {
    unlockBadge('SAVER', 'Soccorritore', 'Hai salvato una pianta critica!');
  }
  
  unlockBadge('FIRST_DROP', 'Prima Goccia', 'Hai curato la tua prima pianta.');

  const now = new Date();
  const hour = now.getHours();
  if (hour >= 22 || hour < 5) {
    unlockBadge('NIGHT_OWL', 'Gufo Notturno', 'Cura notturna effettuata.');
  }

  const actionCount = await ActionLog.countDocuments({ user: userId, actionType: 'water' });
  if (actionCount >= 20) {
    unlockBadge('VETERAN', 'Veterano', '20 Innaffiature completate!');
  }

  user.badges = [...new Set(user.badges)];
  
  await user.save();

  return { 
    user, 
    unlockedBadges, 
    newLevel: levelUpOccurred ? newLevel : null 
  };
};