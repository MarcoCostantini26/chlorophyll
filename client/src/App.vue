<script setup>
import { ref, onMounted } from 'vue';
import { io } from 'socket.io-client';

// Collegamento al server
const socket = io('http://localhost:3000');

// Dati
const trees = ref([]);
const isConnected = ref(false);

// 1. Scarica gli alberi dal Database
const fetchTrees = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/trees');
    trees.value = await res.json();
  } catch (e) {
    console.error("Errore caricamento alberi:", e);
  }
};

// 2. Azione: INNAFFIA (Il bottone chiama questa funzione)
const waterTree = (treeId) => {
  console.log("Innaffio albero:", treeId);
  socket.emit('water_tree', { treeId: treeId });
};

onMounted(() => {
  fetchTrees();

  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);

  // 3. Riceve aggiornamento dal server e aggiorna la barra
  socket.on('tree_updated', (updatedTree) => {
    const index = trees.value.findIndex(t => t._id === updatedTree._id);
    if (index !== -1) {
      trees.value[index] = updatedTree; 
    }
  });
});
</script>

<template>
  <div class="container">
    <h1>🍃 Chlorophyll Forest</h1>
    <div :class="['status', isConnected ? 'on' : 'off']">
      Server: {{ isConnected ? 'CONNESSO' : 'DISCONNESSO' }}
    </div>

    <div class="grid">
      <div v-for="tree in trees" :key="tree._id" class="card">
        <h3>{{ tree.name }}</h3>
        <p>Livello Acqua: <strong>{{ tree.waterLevel }}%</strong></p>
        
        <div class="progress-bar">
          <div class="fill" :style="{ width: tree.waterLevel + '%' }"></div>
        </div>

        <button @click="waterTree(tree._id)" :disabled="tree.waterLevel >= 100">
          💧 INNAFFIA
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.status { padding: 10px; color: white; margin-bottom: 20px; border-radius: 5px; text-align: center;}
.on { background: #2ecc71; } .off { background: #e74c3c; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.card { border: 1px solid #ccc; padding: 20px; border-radius: 10px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }

.progress-bar { width: 100%; height: 20px; background: #eee; border-radius: 10px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.3s ease; }

button { width: 100%; padding: 10px; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
button:hover:not(:disabled) { background: #2980b9; }
button:disabled { background: #ccc; cursor: not-allowed; }
</style>