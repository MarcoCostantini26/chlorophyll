<script setup>
import { ref, onMounted, computed } from 'vue';
import { io } from 'socket.io-client';
import TreeMap from './components/TreeMap.vue';
import Login from './components/Login.vue';
import AdminPanel from './components/AdminPanel.vue'; // <--- Importiamo AdminPanel

const socket = io('http://localhost:3000');

// STATO
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const showLevelUp = ref(false);
const currentWeather = ref('sunny');

// STATO AI
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);

// Computed: Chi può interagire
const canInteract = computed(() => {
  return currentUser.value && 
         (currentUser.value.role === 'green_guardian' || currentUser.value.role === 'city_manager');
});

// --- GESTIONE LOGIN ---
const handleLoginSuccess = (user) => {
  currentUser.value = user;
};

const handleGuestAccess = () => {
  currentUser.value = {
    _id: 'guest',
    username: 'Public Monitor',
    role: 'public_monitor',
    xp: 0,
    level: 0
  };
};

// --- API ---
const fetchTrees = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/trees');
    trees.value = await res.json();
  } catch (e) { console.error(e); }
};

// --- AZIONI ---
const waterTree = (treeId) => {
  if (!canInteract.value) return;
  socket.emit('water_tree', { treeId, userId: currentUser.value._id });
};

const askDrChlorophyll = async (tree) => {
  showAiModal.value = true;
  isAiThinking.value = true;
  aiResponse.value = '';

  try {
    const res = await fetch('http://localhost:3000/api/ai/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treeId: tree._id })
    });
    const data = await res.json();
    aiResponse.value = data.message;
  } catch (e) {
    aiResponse.value = "Errore connessione AI.";
  } finally { isAiThinking.value = false; }
};

// --- LIFECYCLE ---
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
  <Login 
    v-if="!currentUser" 
    @login-success="handleLoginSuccess"
    @guest-access="handleGuestAccess"
  />

  <div v-else class="container">
    
    <header class="user-header">
      <div class="user-info">
        <h2>👤 {{ currentUser.username }}</h2>
        <span class="role-badge" :class="currentUser.role">{{ currentUser.role.replace('_', ' ') }}</span>
      </div>
      
      <div v-if="currentUser.role !== 'public_monitor'" class="user-stats">
        <div class="xp-bar">
          <div class="xp-fill" :style="{ width: (currentUser.xp % 100) + '%' }"></div>
        </div>
        <p>Livello <strong>{{ currentUser.level }}</strong> ({{ currentUser.xp }} XP)</p>
      </div>
      <div v-else class="user-stats">
        <small>Modalità Osservatore</small>
      </div>
    </header>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    <h1 class="main-title">🍃 Chlorophyll Forest</h1>
    <div :class="['status-dot', isConnected ? 'online' : 'offline']" title="Server"></div>

    <div class="weather-widget" :class="currentWeather">
      <div v-if="currentWeather === 'sunny'">☀️ SOLE <small>(Evaporazione)</small></div>
      <div v-if="currentWeather === 'cloudy'">☁️ NUVOLOSO <small>(Stabile)</small></div>
      <div v-if="currentWeather === 'rainy'">🌧️ PIOGGIA <small>(Auto-Innaffio)</small></div>
    </div>

    <AdminPanel v-if="currentUser.role === 'city_manager'" />

    <TreeMap :trees="trees" @water-action="waterTree" /> 
    
    <div class="separator">👇 Vista Dettagliata 👇</div>

    <div class="grid">
      <div v-for="tree in trees" :key="tree._id" class="card" :class="tree.status">
        <div class="card-header">
          <h3>{{ tree.name }}</h3>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div class="fill" :style="{ width: tree.waterLevel + '%' }"></div>
          </div>
          <small>{{ tree.waterLevel }}% Idratazione</small>
        </div>

        <div class="actions">
          <button 
            @click="waterTree(tree._id)" 
            :disabled="!canInteract || tree.waterLevel >= 100"
            :class="{ 'btn-disabled': !canInteract }"
          >
            {{ canInteract ? '💧 Innaffia' : '🔒 Solo Guardian' }}
          </button>
          
          <button @click="askDrChlorophyll(tree)" class="btn-ai">
            🤖 Consulto
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAiModal" class="ai-modal-overlay" @click.self="showAiModal = false">
      <div class="ai-modal">
        <div class="ai-header">
          <h3>🤖 Dr. Chlorophyll</h3>
          <button @click="showAiModal = false" class="close-btn">✖</button>
        </div>
        <div class="ai-body">
          <div v-if="isAiThinking" class="thinking">
            <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
            <p>Analisi parametri vitali in corso...</p>
          </div>
          <p v-else class="ai-text">{{ aiResponse }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Ruoli */
.role-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; color: white; font-weight: bold; }
.role-badge.green_guardian { background: #27ae60; }
.role-badge.city_manager { background: #8e44ad; }
.role-badge.public_monitor { background: #7f8c8d; }

.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }

/* Styles Base */
.container { max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; position: relative; }
.user-header { display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee; }
.user-info h2 { margin: 0; font-size: 1.3rem; color: #2c3e50; }
.user-stats { text-align: right; width: 200px; }
.xp-bar { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 5px; }
.xp-fill { height: 100%; background: #f1c40f; transition: width 0.5s ease-out; }
.weather-widget { text-align: center; padding: 15px; margin-bottom: 20px; border-radius: 12px; font-weight: bold; font-size: 1.1rem; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: all 0.5s ease; }
.weather-widget.sunny { background: linear-gradient(to right, #f2994a, #f2c94c); }
.weather-widget.cloudy { background: linear-gradient(to right, #bdc3c7, #2c3e50); }
.weather-widget.rainy { background: linear-gradient(to right, #373b44, #4286f4); animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }
.main-title { text-align: center; color: #27ae60; margin-bottom: 20px; }
.separator { text-align: center; margin: 20px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; }
.status-dot { width: 12px; height: 12px; border-radius: 50%; position: absolute; top: 25px; right: 25px; }
.online { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; }
.offline { background: #e74c3c; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 6px solid #ccc; transition: transform 0.2s;}
.card:hover { transform: translateY(-3px); }
.card.healthy { border-left-color: #2ecc71; }
.card.thirsty { border-left-color: #f39c12; }
.card.critical { border-left-color: #e74c3c; }
.card-header h3 { margin: 0 0 15px 0; font-size: 1.1rem; color: #34495e; }
.progress-container { margin-bottom: 15px; }
.progress-bar { width: 100%; height: 12px; background: #ecf0f1; border-radius: 6px; overflow: hidden; }
.fill { height: 100%; background: #3498db; transition: width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); }
button { width: 100%; padding: 12px; border: none; background: #2ecc71; color: white; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.95rem; transition: background 0.2s; }
button:hover:not(:disabled) { background: #27ae60; }
button:disabled { background: #bdc3c7; cursor: not-allowed; opacity: 0.7; }
.actions { display: flex; gap: 10px; margin-top: 15px; }
.btn-ai { background: #8e44ad; width: 40%; }
.btn-ai:hover { background: #9b59b6; }
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.ai-modal { background: white; width: 90%; max-width: 400px; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; }
.ai-header { background: #8e44ad; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
.ai-header h3 { margin: 0; }
.close-btn { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; width: auto; padding: 0;}
.ai-body { padding: 20px; min-height: 100px; font-size: 1.1rem; line-height: 1.5; color: #333; }
.thinking { text-align: center; color: #888; font-style: italic; }
.dot { animation: blink 1.4s infinite both; font-size: 2rem; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.level-up-modal { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: #fff; padding: 20px 40px; font-size: 2rem; font-weight: 800; border-radius: 50px; box-shadow: 0 10px 30px rgba(241, 196, 15, 0.6); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 999; }
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
</style>