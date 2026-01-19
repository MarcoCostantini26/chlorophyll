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
          <div>
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
  animation: fadeIn 0.3s ease;
  /* FIX: Impedisce che il pannello stesso crei scroll indesiderati */
  overflow: hidden; 
}

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f0f2f5; padding-bottom: 10px; }
h3 { margin: 0; color: #27ae60; font-size: 1rem; text-transform: uppercase; font-weight: 800; }
.count { background: #eafaf1; color: #27ae60; padding: 2px 8px; border-radius: 10px; font-size: 0.8rem; font-weight: bold; }

.tree-list { 
  list-style: none; padding: 0; margin: 0; 
  max-height: 400px; 
  overflow-y: auto; 
  /* FIX IMPORTANTE: Nasconde la scrollbar orizzontale */
  overflow-x: hidden; 
}

/* Personalizzazione scrollbar (opzionale, la rende più elegante) */
.tree-list::-webkit-scrollbar { width: 6px; }
.tree-list::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 4px; }
.tree-list::-webkit-scrollbar-track { background: transparent; }

.tree-item { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 12px; border-bottom: 1px solid #f9f9f9; 
  cursor: pointer; 
  transition: background 0.2s; /* Rimosso transition: transform */
  border-left: 4px solid transparent; 
  margin-bottom: 5px;
  background: #fff;
  border-radius: 4px;
}

/* FIX: Rimosso 'transform: translateX(2px)' che causava lo "sminchiamento" */
.tree-item:hover { 
  background: #f8f9fa; 
  /* transform: translateX(2px); <-- CANCELLATO */
}

/* Colori bordo sinistro in base allo stato */
.tree-item.critical { border-left-color: #e74c3c; }
.tree-item.thirsty { border-left-color: #f1c40f; }
.tree-item.healthy { border-left-color: #2ecc71; }

.tree-info { display: flex; gap: 12px; align-items: center; flex: 1; }
.status-icon { font-size: 1.4rem; }
.tree-info strong { display: block; font-size: 0.95rem; color: #2c3e50; margin-bottom: 2px; }

.mini-bar { width: 80px; height: 5px; background: #eee; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #3498db; transition: width 0.5s; }

.water-btn { 
  background: #eafaf1; border: none; cursor: pointer; 
  font-size: 1.1rem; width: 35px; height: 35px; 
  border-radius: 50%; transition: all 0.2s; 
  display: flex; align-items: center; justify-content: center;
}
.water-btn:hover:not(:disabled) { transform: scale(1.1); background: #d5f5e3; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.water-btn:active:not(:disabled) { transform: scale(0.9); }
.water-btn:disabled { opacity: 0.3; cursor: default; filter: grayscale(100%); }

.empty-state { text-align: center; color: #95a5a6; font-size: 0.9rem; padding: 30px 10px; background: #fcfcfc; border-radius: 8px; border: 2px dashed #eee; }
.empty-state small { display: block; margin-top: 5px; color: #bdc3c7; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>