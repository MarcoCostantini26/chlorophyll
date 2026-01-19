<script setup>
const props = defineProps(['myTrees']);
const emit = defineEmits(['water', 'focus-map']);

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
      <span class="count">{{ myTrees.length }} Alberi</span>
    </div>

    <div v-if="myTrees.length === 0" class="empty-state">
      <p>Non hai ancora adottato nessun albero.</p>
      <small>Clicca su un albero nella mappa e premi "Adotta"!</small>
    </div>

    <ul v-else class="tree-list">
      <li v-for="tree in myTrees" :key="tree._id" class="tree-item" :class="tree.status">
        
        <div class="tree-info" @click="$emit('focus-map', tree)">
          <span class="status-icon">{{ getStatusEmoji(tree.status) }}</span>
          <div class="text-data">
            <strong>{{ tree.name }}</strong>
            <div class="mini-bar">
              <div class="fill" :style="{ width: tree.waterLevel + '%' }"></div>
            </div>
          </div>
        </div>

        <button class="water-btn" @click.stop="$emit('water', tree._id)" :disabled="tree.waterLevel >= 100">
          💧
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.my-forest-panel {
  background: white; border-radius: 12px; padding: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee;
  display: flex; flex-direction: column; height: 100%; max-height: 500px;
  overflow: hidden;
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f0f2f5; padding-bottom: 10px; flex-shrink: 0; }
h3 { margin: 0; color: #27ae60; font-size: 1rem; text-transform: uppercase; font-weight: 800; }
.count { background: #eafaf1; color: #27ae60; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }

.tree-list { 
  list-style: none; padding: 0; margin: 0; 
  overflow-y: auto; overflow-x: hidden; 
  flex-grow: 1;
}
.tree-list::-webkit-scrollbar { width: 6px; }
.tree-list::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }

.tree-item { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 12px; border-bottom: 1px solid #f9f9f9; 
  cursor: pointer; transition: background 0.2s; 
  border-left: 4px solid transparent; 
  margin-bottom: 5px; background: #fff; border-radius: 4px;
}
.tree-item:hover { background: #f8f9fa; }
.tree-item.critical { border-left-color: #e74c3c; }
.tree-item.thirsty { border-left-color: #f1c40f; }
.tree-item.healthy { border-left-color: #2ecc71; }

.tree-info { display: flex; gap: 10px; align-items: center; flex: 1; min-width: 0; }
.status-icon { font-size: 1.4rem; flex-shrink: 0; }
.text-data { flex: 1; min-width: 0; }
.tree-info strong { display: block; font-size: 0.95rem; color: #2c3e50; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.mini-bar { width: 80px; height: 5px; background: #eee; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #3498db; transition: width 0.5s; }

/* --- IL TUO BOTTONE TONDO (PROTETTO) --- */
.water-btn { 
  background: #eafaf1; border: none; cursor: pointer; 
  
  /* Blocco dimensione con !important per vincere su tutto */
  width: 40px !important; 
  height: 40px !important; 
  border-radius: 50% !important;
  
  /* Flex magic: impedisce schiacciamento */
  flex: 0 0 40px !important; 
  
  display: flex; align-items: center; justify-content: center;
  padding: 0 !important; margin: 0 0 0 10px !important;
  font-size: 1.2rem;
  transition: transform 0.2s;
}
.water-btn:hover:not(:disabled) { transform: scale(1.1); background: #d5f5e3; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.water-btn:active:not(:disabled) { transform: scale(0.95); }
.water-btn:disabled { opacity: 0.3; cursor: default; filter: grayscale(100%); }

.empty-state { text-align: center; color: #95a5a6; font-size: 0.9rem; padding: 30px 10px; background: #fcfcfc; border-radius: 8px; border: 2px dashed #eee; }
.empty-state small { display: block; margin-top: 5px; color: #bdc3c7; }
</style>