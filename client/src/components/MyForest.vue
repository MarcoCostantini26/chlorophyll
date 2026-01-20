<script setup>
const props = defineProps(['myTrees']);
const emit = defineEmits(['water', 'focus-map']);

// --- LOGICA CATEGORIE E AZIONI ---
const getPlantConfig = (category) => {
  const cat = category || 'tree';

  // 1. POTA ✂️
  if (['hedge', 'bush'].includes(cat)) {
    return {
      plantEmoji: cat === 'hedge' ? '✂️' : '🌾', 
      actionIcon: '✂️', 
      actionColor: '#d35400', 
      tooltip: 'Pota'
    };
  }

  // 2. CONCIMA 🍂
  if (cat === 'potted') {
    return {
      plantEmoji: '🏺',
      actionIcon: '🍂',
      actionColor: '#8e44ad', 
      tooltip: 'Concima'
    };
  }

  // 3. PULISCI 🧹
  if (cat === 'succulent') {
    return {
      plantEmoji: '🌵',
      actionIcon: '🧹',
      actionColor: '#1abc9c', 
      tooltip: 'Pulisci'
    };
  }

  // 4. INNAFFIA 💧
  const emojis = { tree: '🌲', flowerbed: '🌻', vertical_garden: '🧱' };
  return {
    plantEmoji: emojis[cat] || '🌲',
    actionIcon: '💧',
    actionColor: '#2ecc71', 
    tooltip: 'Innaffia'
  };
};

const getStatusEmoji = (status) => {
  if (status === 'healthy') return '😊';
  if (status === 'thirsty') return '😟';
  return '💀';
};
</script>

<template>
  <div class="my-forest-panel">
    <div class="header">
      <h3>🌲 La Mia Foresta</h3>
      <span class="count">{{ myTrees.length }} Piante</span>
    </div>

    <div v-if="myTrees.length === 0" class="empty-state">
      <p>Non hai ancora adottato nessuna pianta.</p>
      <small>Clicca su una pianta nella mappa e premi "Adotta"!</small>
    </div>

    <ul v-else class="tree-list">
      <li v-for="tree in myTrees" :key="tree._id" class="tree-item" :class="tree.status">
        
        <div class="tree-info" @click="$emit('focus-map', tree)">
          <div class="plant-avatar">
            {{ getPlantConfig(tree.category).plantEmoji }}
          </div>

          <div class="text-data">
            <div class="name-row">
              <strong>{{ tree.name }}</strong>
              <span class="status-mini">{{ getStatusEmoji(tree.status) }}</span>
            </div>
            
            <div class="mini-bar">
              <div class="fill" 
                   :style="{ 
                     width: tree.waterLevel + '%',
                     background: tree.waterLevel < 30 ? '#e74c3c' : '#3498db'
                   }">
              </div>
            </div>
            <small class="pct-text">{{ Math.round(tree.waterLevel) }}%</small>
          </div>
        </div>

        <button 
          class="action-btn" 
          @click.stop="$emit('water', tree._id)" 
          :disabled="tree.waterLevel >= 100"
          :title="getPlantConfig(tree.category).tooltip"
          :style="{ 
             backgroundColor: tree.waterLevel >= 100 ? '#ecf0f1' : '#fff',
             borderColor: tree.waterLevel >= 100 ? '#ccc' : getPlantConfig(tree.category).actionColor,
             color: tree.waterLevel >= 100 ? '#ccc' : getPlantConfig(tree.category).actionColor
          }"
        >
          {{ getPlantConfig(tree.category).actionIcon }}
        </button>

      </li>
    </ul>
  </div>
</template>

<style scoped>
/* STILI INVARIATI */
.my-forest-panel { background: white; border-radius: 12px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee; display: flex; flex-direction: column; height: 100%; max-height: 500px; overflow: hidden; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f0f2f5; padding-bottom: 10px; flex-shrink: 0; }
h3 { margin: 0; color: #27ae60; font-size: 1rem; text-transform: uppercase; font-weight: 800; }
.count { background: #eafaf1; color: #27ae60; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }
.tree-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; overflow-x: hidden; flex-grow: 1; }
.tree-list::-webkit-scrollbar { width: 6px; }
.tree-list::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }
.tree-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f9f9f9; cursor: pointer; transition: background 0.2s; border-left: 4px solid transparent; margin-bottom: 5px; background: #fff; border-radius: 4px; }
.tree-item:hover { background: #f8f9fa; }
.tree-item.critical { border-left-color: #e74c3c; }
.tree-item.thirsty { border-left-color: #f1c40f; }
.tree-item.healthy { border-left-color: #2ecc71; }
.tree-info { display: flex; gap: 12px; align-items: center; flex: 1; min-width: 0; }
.plant-avatar { font-size: 1.5rem; background: #f4f6f7; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.text-data { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.tree-info strong { font-size: 0.9rem; color: #2c3e50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-mini { font-size: 0.8rem; margin-left: 5px; }
.mini-bar { width: 100%; height: 4px; background: #eee; border-radius: 2px; overflow: hidden; }
.fill { height: 100%; transition: width 0.5s; }
.pct-text { font-size: 0.7rem; color: #95a5a6; display: block; margin-top: 2px; text-align: right;}
.action-btn { width: 40px !important; height: 40px !important; border-radius: 50% !important; flex: 0 0 40px !important; display: flex; align-items: center; justify-content: center; margin-left: 10px; font-size: 1.2rem; background: white; border: 2px solid #ccc; cursor: pointer; transition: all 0.2s; }
.action-btn:hover:not(:disabled) { transform: scale(1.1); background-color: #fefefe !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.action-btn:active:not(:disabled) { transform: scale(0.95); }
.action-btn:disabled { opacity: 0.5; cursor: default; filter: grayscale(100%); }
.empty-state { text-align: center; color: #95a5a6; font-size: 0.9rem; padding: 30px 10px; background: #fcfcfc; border-radius: 8px; border: 2px dashed #eee; }
.empty-state small { display: block; margin-top: 5px; color: #bdc3c7; }
</style>