<script setup>
import { ref, onMounted, computed } from 'vue';
import { io } from 'socket.io-client';
import TreeMap from './components/TreeMap.vue';
import Login from './components/Login.vue';
import AdminPanel from './components/AdminPanel.vue';
import Leaderboard from './components/Leaderboard.vue';

const socket = io('http://localhost:3000');
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const showLevelUp = ref(false);
const currentWeather = ref('sunny');
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);

// NUOVO: Stato dei permessi notifiche
const notificationPermission = ref(Notification.permission);

const canInteract = computed(() => currentUser.value && (currentUser.value.role === 'green_guardian' || currentUser.value.role === 'city_manager'));
const isAdmin = computed(() => currentUser.value && currentUser.value.role === 'city_manager');

const handleLoginSuccess = (user) => {
  currentUser.value = user;
  // Proviamo a chiedere il permesso subito dopo il login
  if (Notification.permission === 'default') {
    requestNotificationPermission();
  }
};

const handleGuestAccess = () => currentUser.value = { _id: 'guest', username: 'Public Monitor', role: 'public_monitor', xp: 0, level: 0 };

// NUOVO: Funzione per chiedere permesso
const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  notificationPermission.value = permission;
  if (permission === 'granted') {
    new Notification("Notifiche Attivate! 🔔", { body: "Ti avviseremo se la foresta ha bisogno di te." });
  }
};

// NUOVO: Funzione per inviare notifica
const sendNotification = (title, body) => {
  if (notificationPermission.value === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' }); // Usa l'icona di default di Vite
  }
};

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
    // Controllo se l'albero è appena diventato critico per notificare
    if (idx !== -1) {
      // NUOVO: Se l'albero diventa critico, manda notifica
      if (t.status === 'critical' && trees.value[idx].status !== 'critical') {
        sendNotification("⚠️ ALBERO CRITICO!", `${t.name} sta morendo di sete! Corri a innaffiare!`);
      }
      trees.value[idx] = t;
    }
  });

  socket.on('trees_refresh', (all) => trees.value = all);
  socket.on('weather_update', (w) => {
    // NUOVO: Notifica cambio meteo
    if (w !== currentWeather.value) {
      if (w === 'rainy') sendNotification("🌧️ Sta piovendo!", "La natura innaffia gli alberi per te.");
      currentWeather.value = w;
    }
  });

  socket.on('user_updated', (u) => { if (currentUser.value && currentUser.value._id === u._id) currentUser.value = u; });
  
  socket.on('level_up', (data) => { 
    showLevelUp.value = true; 
    // NUOVO: Notifica Level UP
    sendNotification("🎉 LEVEL UP!", `Congratulazioni! Ora sei al livello ${data.level}!`);
    setTimeout(() => showLevelUp.value = false, 3000); 
  });
});
</script>

<template>
  <Login v-if="!currentUser" @login-success="handleLoginSuccess" @guest-access="handleGuestAccess" />

  <div v-else class="container">
    <div class="title-section">
      <h1 class="main-title">🍃 Chlorophyll Forest</h1>
      <div :class="['status-dot', isConnected ? 'online' : 'offline']" title="Server"></div>
      
      <button v-if="notificationPermission === 'default'" @click="requestNotificationPermission" class="btn-notif">
        🔔 Attiva Notifiche
      </button>
    </div>

    <div class="dashboard-top-flex">
      <div class="top-left-group">
        <header class="user-header">
          <div class="user-info">
            <h2>👤 {{ currentUser.username }}</h2>
            <span class="role-badge" :class="currentUser.role">{{ currentUser.role.replace('_', ' ') }}</span>
          </div>
          <div v-if="currentUser.role !== 'public_monitor'" class="user-stats">
            <div class="xp-bar"><div class="xp-fill" :style="{ width: (currentUser.xp % 100) + '%' }"></div></div>
            <p class="xp-text">Livello <strong>{{ currentUser.level }}</strong> ({{ currentUser.xp }} XP)</p>
          </div>
        </header>

        <div class="weather-widget" :class="currentWeather">
          <div v-if="currentWeather === 'sunny'">☀️ SOLE <small>(Evaporazione)</small></div>
          <div v-if="currentWeather === 'cloudy'">☁️ NUVOLOSO <small>(Stabile)</small></div>
          <div v-if="currentWeather === 'rainy'">🌧️ PIOGGIA <small>(Auto-Innaffio)</small></div>
        </div>
      </div>
      
      <div class="top-right-group"><Leaderboard /></div>
    </div>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    
    <AdminPanel v-if="isAdmin" />
    <TreeMap :trees="trees" @water-action="waterTree" /> 
    <div class="separator">👇 DETTAGLIO FORESTA 👇</div>

    <div class="grid">
      <div v-for="tree in trees" :key="tree._id" class="card" :class="tree.status">
        <div class="card-header"><h3>{{ tree.name }}</h3></div>
        <div class="progress-container">
          <div class="progress-bar"><div class="fill" :style="{ width: tree.waterLevel + '%' }"></div></div>
          <small>{{ tree.waterLevel }}% Idratazione</small>
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
/* BASE STYLES */
.container { max-width: 1400px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
.dashboard-top-flex { display: flex; gap: 20px; margin-bottom: 30px; align-items: stretch; }
.top-left-group { flex: 3; display: flex; gap: 20px; }
.top-right-group { flex: 1; min-width: 280px; }
.user-header, .weather-widget { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.user-header { background: white; padding: 20px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.user-info h2 { margin: 0; color: #2c3e50; font-size: 1.4rem; font-weight: 800; }
.xp-text { color: #2c3e50; margin-top: 5px; font-weight: 600; }
.weather-widget { padding: 20px; border-radius: 12px; color: white; font-weight: bold; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
.weather-widget.sunny { background: linear-gradient(to right, #f2994a, #f2c94c); }
.weather-widget.cloudy { background: linear-gradient(to right, #bdc3c7, #2c3e50); }
.weather-widget.rainy { background: linear-gradient(to right, #373b44, #4286f4); }
.title-section { text-align: center; margin-bottom: 30px; }
.main-title { color: #27ae60; font-size: 2.5rem; margin: 0; }
.status-dot { width: 15px; height: 15px; border-radius: 50%; display: inline-block; margin-left: 10px; vertical-align: middle; }
.online { background: #2ecc71; box-shadow: 0 0 10px #2ecc71; }
.offline { background: #e74c3c; }

/* Nuovo bottone notifiche */
.btn-notif { background: #f39c12; color: white; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; margin-top: 10px; font-size: 0.8rem; display: inline-block; }
.btn-notif:hover { background: #d35400; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
.card { background: white; padding: 25px; border-radius: 12px; border-left: 8px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.role-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; color: white; font-weight: bold; text-transform: uppercase; }
.role-badge.green_guardian { background: #27ae60; }
.role-badge.city_manager { background: #8e44ad; }
.role-badge.public_monitor { background: #7f8c8d; }
.xp-bar { width: 100%; height: 8px; background: #eee; border-radius: 3px; overflow: hidden; margin-top: 10px; }
.xp-fill { height: 100%; background: #f1c40f; }
.separator { text-align: center; margin: 30px 0; color: #95a5a6; font-size: 0.9rem; letter-spacing: 2px; text-transform: uppercase; }
.actions { display: flex; gap: 10px; margin-top: 15px; }
button { width: 100%; padding: 12px; border: none; background: #2ecc71; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-ai { background: #8e44ad; width: 40%; }
.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }
.debug-controls { margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; text-align: center; }
.debug-buttons { display: flex; gap: 5px; justify-content: center; margin-top: 5px; }
.btn-debug { padding: 5px 10px; }
.card.healthy { border-left-color: #2ecc71; }
.card.thirsty { border-left-color: #f39c12; }
.card.critical { border-left-color: #e74c3c; }
.progress-bar { width: 100%; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.3s; }
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; }
.ai-modal { background: white; width: 100%; max-width: 400px; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.ai-header { background: #8e44ad; color: white; padding: 15px; display: flex; justify-content: space-between; }
.ai-body { padding: 20px; color: #333; line-height: 1.5; }
.close-btn { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; width: auto; padding: 0; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px; border-radius: 30px; font-size: 2rem; z-index: 3000; font-weight: bold; text-align: center; width: 80%; }

@media (max-width: 768px) {
  .container { padding: 10px; }
  .main-title { font-size: 1.8rem; }
  .dashboard-top-flex { flex-direction: column; gap: 15px; }
  .top-left-group { flex-direction: column; min-width: 0; }
  .top-right-group { width: 100%; min-width: 0; }
  .grid { grid-template-columns: 1fr; gap: 15px; }
}
</style>