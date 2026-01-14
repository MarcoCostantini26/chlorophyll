<script setup>
import { ref, onMounted, computed } from 'vue';
import { io } from 'socket.io-client';
import TreeMap from './components/TreeMap.vue';
import Login from './components/Login.vue';
import AdminPanel from './components/AdminPanel.vue';
import Leaderboard from './components/Leaderboard.vue';

const socket = io('http://localhost:3000');

// DATA
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const showLevelUp = ref(false);
const currentWeather = ref('sunny');
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);

// COMPUTED
const canInteract = computed(() => currentUser.value && (currentUser.value.role === 'green_guardian' || currentUser.value.role === 'city_manager'));
const isAdmin = computed(() => currentUser.value && currentUser.value.role === 'city_manager');

// METHODS
const handleLoginSuccess = (user) => currentUser.value = user;
const handleGuestAccess = () => currentUser.value = { _id: 'guest', username: 'Public Monitor', role: 'public_monitor', xp: 0, level: 0 };

const fetchTrees = async () => {
  const res = await fetch('http://localhost:3000/api/trees');
  trees.value = await res.json();
};

const waterTree = (treeId) => {
  if (!canInteract.value) return;
  socket.emit('water_tree', { treeId, userId: currentUser.value._id });
};

const forceWater = (treeId, amount) => {
  socket.emit('admin_force_water', { treeId, amount });
};

const askDrChlorophyll = async (tree) => {
  showAiModal.value = true;
  isAiThinking.value = true;
  aiResponse.value = '';
  try {
    const res = await fetch('http://localhost:3000/api/ai/consult', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ treeId: tree._id })
    });
    const data = await res.json();
    aiResponse.value = data.message;
  } catch (e) { aiResponse.value = "Errore AI"; } 
  finally { isAiThinking.value = false; }
};

onMounted(() => {
  fetchTrees();
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);
  socket.on('tree_updated', (t) => {
    const idx = trees.value.findIndex(x => x._id === t._id);
    if (idx !== -1) trees.value[idx] = t;
  });
  socket.on('trees_refresh', (all) => trees.value = all);
  socket.on('weather_update', (w) => currentWeather.value = w);
  socket.on('user_updated', (u) => {
    if (currentUser.value && currentUser.value._id === u._id) currentUser.value = u;
  });
  socket.on('level_up', () => {
    showLevelUp.value = true;
    setTimeout(() => showLevelUp.value = false, 3000);
  });
});
</script>

<template>
  <Login v-if="!currentUser" @login-success="handleLoginSuccess" @guest-access="handleGuestAccess" />

  <div v-else class="container">
    
    <div class="dashboard-top">
      <div class="left-col">
        <header class="user-header">
          <div class="user-info">
            <h2>👤 {{ currentUser.username }}</h2>
            <span class="role-badge" :class="currentUser.role">{{ currentUser.role.replace('_', ' ') }}</span>
          </div>
          
          <div v-if="currentUser.role !== 'public_monitor'" class="user-stats">
            <div class="xp-bar">
              <div class="xp-fill" :style="{ width: (currentUser.xp % 100) + '%' }"></div>
            </div>
            <p class="xp-text">Livello <strong>{{ currentUser.level }}</strong> ({{ currentUser.xp }} XP)</p>
          </div>
        </header>

        <div class="weather-widget" :class="currentWeather">
          <div v-if="currentWeather === 'sunny'">☀️ SOLE <small>(Evaporazione)</small></div>
          <div v-if="currentWeather === 'cloudy'">☁️ NUVOLOSO <small>(Stabile)</small></div>
          <div v-if="currentWeather === 'rainy'">🌧️ PIOGGIA <small>(Auto-Innaffio)</small></div>
        </div>
      </div>
      
      <div class="right-col">
        <Leaderboard />
      </div>
    </div>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    <h1 class="main-title">🍃 Chlorophyll Forest</h1>
    <div :class="['status-dot', isConnected ? 'online' : 'offline']" title="Server"></div>

    <AdminPanel v-if="isAdmin" />
    <TreeMap :trees="trees" @water-action="waterTree" /> 
    
    <div class="separator">Vista Dettagliata</div>

    <div class="grid">
      <div v-for="tree in trees" :key="tree._id" class="card" :class="tree.status">
        <div class="card-header"><h3>{{ tree.name }}</h3></div>
        <div class="progress-container">
          <div class="progress-bar"><div class="fill" :style="{ width: tree.waterLevel + '%' }"></div></div>
          <small>{{ tree.waterLevel }}%</small>
        </div>

        <div class="actions">
          <button @click="waterTree(tree._id)" :disabled="!canInteract || tree.waterLevel >= 100" :class="{ 'btn-disabled': !canInteract }">
            {{ canInteract ? '💧 Innaffia' : '🔒 Solo Guardian' }}
          </button>
          <button @click="askDrChlorophyll(tree)" class="btn-ai">🤖 AI</button>
        </div>

        <div v-if="isAdmin" class="debug-controls">
          <small>Admin Test</small>
          <div class="debug-buttons">
            <button class="btn-debug minus" @click="forceWater(tree._id, -20)">-20%</button>
            <button class="btn-debug plus" @click="forceWater(tree._id, 20)">+20%</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAiModal" class="ai-modal-overlay" @click.self="showAiModal = false">
      <div class="ai-modal">
        <div class="ai-header"><h3>🤖 Dr. Chlorophyll</h3><button @click="showAiModal = false" class="close-btn">✖</button></div>
        <div class="ai-body">
          <div v-if="isAiThinking" class="thinking">...Analisi...</div>
          <p v-else>{{ aiResponse }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- FIX COLORI UTENTE --- */
.user-info h2 { 
  margin: 0; 
  font-size: 1.3rem; 
  color: #2c3e50; /* BLU SCURO QUASI NERO - Ora si vede! */
  font-weight: 800;
}

.xp-text {
  color: #2c3e50; /* BLU SCURO QUASI NERO - Ora si vede! */
  font-size: 0.9rem;
  margin: 5px 0 0 0;
  font-weight: 600;
}

/* Resto dello stile */
.dashboard-top { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
.left-col { flex: 2; min-width: 300px; }
.right-col { flex: 1; min-width: 200px; }
.role-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; color: white; font-weight: bold; text-transform: uppercase; }
.role-badge.green_guardian { background: #27ae60; }
.role-badge.city_manager { background: #8e44ad; }
.role-badge.public_monitor { background: #7f8c8d; }
.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }
.debug-controls { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; text-align: center; }
.debug-buttons { display: flex; gap: 5px; justify-content: center; margin-top: 5px; }
.btn-debug { padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; color: white; font-weight: bold; }
.btn-debug.minus { background: #e74c3c; }
.btn-debug.plus { background: #3498db; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; position: relative; }
.user-header { display: flex; justify-content: space-between; background: white; padding: 15px; border-radius: 12px; border: 1px solid #eee; margin-bottom: 10px; }
.weather-widget { padding: 15px; border-radius: 12px; color: white; font-weight: bold; text-align: center; margin-bottom: 10px; }
.weather-widget.sunny { background: linear-gradient(to right, #f2994a, #f2c94c); }
.weather-widget.cloudy { background: linear-gradient(to right, #bdc3c7, #2c3e50); }
.weather-widget.rainy { background: linear-gradient(to right, #373b44, #4286f4); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; border-left: 6px solid #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.card.healthy { border-left-color: #2ecc71; }
.card.thirsty { border-left-color: #f39c12; }
.card.critical { border-left-color: #e74c3c; }
.progress-bar { width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.3s; }
.actions { display: flex; gap: 10px; }
button { width: 100%; padding: 10px; border: none; background: #2ecc71; color: white; border-radius: 6px; cursor: pointer; }
.btn-ai { background: #8e44ad; width: 40%; }
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.ai-modal { background: white; width: 90%; max-width: 400px; border-radius: 15px; padding: 0; overflow: hidden; }
.ai-header { background: #8e44ad; color: white; padding: 15px; display: flex; justify-content: space-between; }
.ai-body { padding: 20px; color: #333; } /* Anche qui testo scuro */
.close-btn { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; }
.main-title { text-align: center; color: #27ae60; }
.status-dot { width: 10px; height: 10px; border-radius: 50%; position: absolute; top: 25px; right: 25px; }
.online { background: #2ecc71; } .offline { background: #e74c3c; }
.xp-bar { width: 100px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; margin-left: auto; }
.xp-fill { height: 100%; background: #f1c40f; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px; border-radius: 30px; font-size: 2rem; z-index: 3000; font-weight: bold; }
</style>