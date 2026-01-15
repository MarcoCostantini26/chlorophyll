<script setup>
import { ref, onMounted, computed } from 'vue';
import { io } from 'socket.io-client';
import TreeMap from './components/TreeMap.vue';
import Login from './components/Login.vue';
import AdminPanel from './components/AdminPanel.vue';
import Leaderboard from './components/Leaderboard.vue';
import BadgeList from './components/BadgeList.vue';
import UserProfile from './components/UserProfile.vue';

const socket = io('http://localhost:3000');

// --- STATO ---
const currentView = ref('dashboard');
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const currentWeather = ref('sunny');

// --- MODALI ---
const showLevelUp = ref(false);
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);
const showBadgeModal = ref(false);
const lastUnlockedBadge = ref({ name: '', desc: '' });
const notificationPermission = ref(Notification.permission);

// --- COMPUTED ---
const canInteract = computed(() => currentUser.value && (currentUser.value.role === 'green_guardian' || currentUser.value.role === 'city_manager'));
const isAdmin = computed(() => currentUser.value && currentUser.value.role === 'city_manager');

// --- FUNZIONI ---
const handleLoginSuccess = (user) => { currentUser.value = user; if (Notification.permission === 'default') requestNotificationPermission(); };
const handleGuestAccess = () => currentUser.value = { _id: 'guest', username: 'Public Monitor', role: 'public_monitor', xp: 0, level: 0 };
const handleLogout = () => { currentUser.value = null; currentView.value = 'dashboard'; };
const handleProfileUpdate = (updatedUser) => { currentUser.value = updatedUser; };
const goToProfile = () => { if (currentUser.value && currentUser.value.role !== 'public_monitor') { currentView.value = 'profile'; } };

const requestNotificationPermission = async () => { const p = await Notification.requestPermission(); notificationPermission.value = p; };
const sendNotification = (t, b) => { if (notificationPermission.value === 'granted') new Notification(t, { body: b }); };
const fetchTrees = async () => { const res = await fetch('http://localhost:3000/api/trees'); trees.value = await res.json(); };
const askDrChlorophyll = async (tree) => { showAiModal.value = true; isAiThinking.value = true; aiResponse.value = ''; try { const res = await fetch('http://localhost:3000/api/ai/consult', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ treeId: tree._id }) }); const data = await res.json(); aiResponse.value = data.message; } catch (e) { aiResponse.value = "Errore AI"; } finally { isAiThinking.value = false; } };
const waterTree = (treeId) => { if (!canInteract.value) return; socket.emit('water_tree', { treeId, userId: currentUser.value._id }); };
const forceWater = (treeId, amount) => { socket.emit('admin_force_water', { treeId, amount }); };

onMounted(() => {
  fetchTrees();
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);
  socket.on('tree_updated', (t) => { const idx = trees.value.findIndex(x => x._id === t._id); if (idx !== -1) trees.value[idx] = t; });
  socket.on('trees_refresh', (all) => trees.value = all);
  socket.on('weather_update', (w) => { if (w !== currentWeather.value) { if (w === 'rainy') sendNotification("🌧️ Piove!", "Auto-innaffio."); currentWeather.value = w; } });
  socket.on('user_updated', (u) => { if (currentUser.value && currentUser.value._id === u._id) currentUser.value = u; });
  socket.on('level_up', (d) => { showLevelUp.value = true; sendNotification("🎉 LEVEL UP!", `Livello ${d.level}!`); setTimeout(() => showLevelUp.value = false, 3000); });
  socket.on('badge_unlocked', (d) => { if (currentUser.value && currentUser.value.username === d.username) { lastUnlockedBadge.value = d.badge; showBadgeModal.value = true; sendNotification("🏆 BADGE!", d.badge.name); setTimeout(() => showBadgeModal.value = false, 4000); } });
});
</script>

<template>
  <Login v-if="!currentUser" @login-success="handleLoginSuccess" @guest-access="handleGuestAccess" />

  <div v-else class="container">
    
    <div class="app-header">
      <div class="header-left">
        <h1 class="main-title">🍃 Chlorophyll</h1>
        <div :class="['status-pill', isConnected ? 'online' : 'offline']">
          {{ isConnected ? 'System Online' : 'Offline' }}
        </div>
      </div>
      <button v-if="notificationPermission === 'default'" @click="requestNotificationPermission" class="btn-notif">🔔 Attiva Notifiche</button>
    </div>

    <UserProfile 
      v-if="currentView === 'profile'" 
      :user="currentUser" 
      @back="currentView = 'dashboard'"
      @logout="handleLogout"
      @update-profile="handleProfileUpdate"
    />

    <div v-else class="main-layout">
      
      <div class="content-column">
        
        <div class="section-block top-row-grid">
          <div class="info-stack">
            <div class="dashboard-card user-card clickable" @click="goToProfile" title="Clicca per profilo">
              <div class="user-flex">
                <div class="user-avatar">{{ currentUser.avatar || '👤' }}</div>
                <div class="user-details">
                  <h2>{{ currentUser.username }}</h2>
                  <span class="role-badge" :class="currentUser.role">{{ currentUser.role.replace('_', ' ') }}</span>
                </div>
                <div class="edit-hint">✏️</div>
              </div>
              <div v-if="currentUser.role !== 'public_monitor'" class="user-xp-section">
                <div class="xp-header"><span>Lvl <strong>{{ currentUser.level }}</strong></span><small>{{ currentUser.xp }} XP</small></div>
                <div class="xp-bar"><div class="xp-fill" :style="{ width: (currentUser.xp % 100) + '%' }"></div></div>
              </div>
            </div>

            <div class="dashboard-card weather-card" :class="currentWeather">
              <div class="weather-icon"><span v-if="currentWeather === 'sunny'">☀️</span><span v-if="currentWeather === 'cloudy'">☁️</span><span v-if="currentWeather === 'rainy'">🌧️</span></div>
              <div class="weather-info">
                <h3>{{ currentWeather === 'sunny' ? 'Soleggiato' : currentWeather === 'cloudy' ? 'Nuvoloso' : 'Pioggia' }}</h3>
                <small v-if="currentWeather === 'rainy'">Auto-Innaffio</small><small v-else>Stabile</small>
              </div>
            </div>
          </div>

          <div class="badges-container">
            <BadgeList :user="currentUser" class="full-height-badge" />
          </div>
        </div>

        <div v-if="isAdmin" class="section-block full-width-block">
          <AdminPanel />
        </div>

        <div class="section-block full-width-block">
          <TreeMap :trees="trees" @water-action="waterTree" /> 
        </div>
        
        <div class="section-block">
          <div class="separator">👇 STATO FORESTA 👇</div>
          <div class="grid">
            <div v-for="tree in trees" :key="tree._id" class="card" :class="tree.status">
              <div class="card-header"><h3>{{ tree.name }}</h3></div>
              <div class="progress-container"><div class="progress-bar"><div class="fill" :style="{ width: tree.waterLevel + '%' }"></div></div><small>{{ tree.waterLevel }}% Idratazione</small></div>
              <div class="actions">
                <button @click="waterTree(tree._id)" :disabled="!canInteract || tree.waterLevel >= 100" :class="{ 'btn-disabled': !canInteract }">{{ canInteract ? '💧 Innaffia' : '🔒 Solo Guardian' }}</button>
                <button @click="askDrChlorophyll(tree)" class="btn-ai">🤖 AI</button>
              </div>
              <div v-if="isAdmin" class="debug-controls"><div class="debug-buttons"><button class="btn-debug minus" @click="forceWater(tree._id, -20)">-</button><button class="btn-debug plus" @click="forceWater(tree._id, 20)">+</button></div></div>
            </div>
          </div>
        </div>
      </div> 

      <aside class="sidebar-column">
        <div class="sticky-sidebar">
          <Leaderboard />
        </div>
      </aside>

    </div>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    <div v-if="showBadgeModal" class="badge-modal"><div class="badge-icon">🏆</div><h3>BADGE SBLOCCATO!</h3><p class="badge-name">{{ lastUnlockedBadge.name }}</p><small>{{ lastUnlockedBadge.desc }}</small></div>
    <div v-if="showAiModal" class="ai-modal-overlay" @click.self="showAiModal = false"><div class="ai-modal"><div class="ai-header"><h3>🤖 Dr. Chlorophyll</h3><button @click="showAiModal = false" class="close-btn">✖</button></div><div class="ai-body"><div v-if="isAiThinking" class="thinking">...Analisi...</div><p v-else>{{ aiResponse }}</p></div></div></div>

  </div>
</template>

<style scoped>
/* GENERALE */
.container { max-width: 1400px; margin: 0 auto; padding: 20px 30px; font-family: 'Inter', sans-serif; }

/* HEADER */
.app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
.header-left { display: flex; align-items: center; gap: 15px; }
.main-title { color: #27ae60; font-size: 1.8rem; margin: 0; font-weight: 800; }
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: white; display: flex; align-items: center; }
.status-pill::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: white; margin-right: 6px; }
.online { background: #2ecc71; } .offline { background: #e74c3c; }
.btn-notif { background: #f39c12; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* LAYOUT PRINCIPALE */
.main-layout { 
  display: grid; 
  grid-template-columns: 3fr 1fr; /* 75% Sinistra, 25% Destra */
  gap: 30px;
  /* STRETCH: Forza la colonna destra ad essere alta quanto la sinistra */
  align-items: stretch; 
  position: relative;
}

.content-column { display: flex; flex-direction: column; gap: 30px; width: 100%; }

/* SIDEBAR FISSA (STICKY) */
.sidebar-column { 
  min-width: 280px; 
  height: 100%; /* Occupa tutta l'altezza fornita dallo stretch */
}

.sticky-sidebar {
  position: -webkit-sticky; /* Safari */
  position: sticky;
  top: 20px; /* Si ferma a 20px dal bordo alto */
  z-index: 900;
  height: fit-content; /* L'altezza è solo quella del contenuto */
}

/* BLOCCHI CONTENUTO */
.top-row-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; width: 100%; }
.full-width-block { width: 100%; }

/* INFO STACK (USER + METEO) - COMPATTO */
.info-stack { display: flex; flex-direction: column; gap: 10px; }
.dashboard-card { background: white; border-radius: 12px; padding: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f0f2f5; flex: 1; }

/* User Card Compatta */
.user-card.clickable { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; position: relative; }
.user-card.clickable:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); border-color: #2ecc71; }
.edit-hint { position: absolute; top: 15px; right: 15px; font-size: 0.9rem; opacity: 0; transition: opacity 0.2s; }
.user-card.clickable:hover .edit-hint { opacity: 1; }

.user-flex { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; }
.user-avatar { font-size: 1.8rem; width: 45px; height: 45px; background: #f0f2f5; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.user-details h2 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.role-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.65rem; color: white; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 2px; }
.role-badge.green_guardian { background: #27ae60; } .role-badge.city_manager { background: #8e44ad; } .role-badge.public_monitor { background: #95a5a6; }
.xp-header { display: flex; justify-content: space-between; font-size: 0.8rem; color: #7f8c8d; margin-bottom: 4px; }
.xp-bar { width: 100%; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
.xp-fill { height: 100%; background: #f1c40f; transition: width 0.5s ease-out; }

/* Weather Card Compatta */
.weather-card { display: flex; align-items: center; gap: 15px; color: white; border: none; justify-content: center; min-height: 70px; }
.weather-card.sunny { background: linear-gradient(135deg, #f2994a, #f2c94c); }
.weather-card.cloudy { background: linear-gradient(135deg, #bdc3c7, #2c3e50); }
.weather-card.rainy { background: linear-gradient(135deg, #373b44, #4286f4); }
.weather-icon { font-size: 2.2rem; }
.weather-info h3 { margin: 0; font-size: 1.1rem; }
.weather-info small { opacity: 0.9; }

/* Badge Wrapper */
.badges-container { height: 100%; }
.full-height-badge { height: 100%; display: flex; flex-direction: column; }

/* Griglia Alberi */
.separator { text-align: center; margin: 10px 0 20px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-top: 4px solid #ccc; transition: transform 0.2s; position: relative; }
.card:hover { transform: translateY(-3px); }
.card.healthy { border-top-color: #2ecc71; } .card.thirsty { border-top-color: #f39c12; } .card.critical { border-top-color: #e74c3c; }
.card-header h3 { margin: 0 0 10px 0; font-size: 1rem; color: #34495e; }
.progress-bar { width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.4s; }
.actions { display: flex; gap: 8px; margin-top: 15px; }
button { width: 100%; padding: 8px; border: none; background: #2ecc71; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
.btn-ai { background: #8e44ad; width: 40%; }
.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }
.debug-controls { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 5px; text-align: center; opacity: 0.7; }
.debug-buttons { display: flex; justify-content: center; gap: 5px; } .btn-debug { padding: 2px 8px; font-size: 0.7rem; }

/* Modali */
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(2px); }
.ai-modal { background: white; width: 100%; max-width: 400px; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; }
.ai-header { background: #8e44ad; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
.ai-body { padding: 25px; color: #333; line-height: 1.6; font-size: 1.05rem; }
.close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; } .close-btn:hover { background: rgba(255,255,255,0.4); }
.badge-modal { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%); background: white; border: 4px solid #f1c40f; color: #2c3e50; padding: 30px; text-align: center; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 4000; animation: popIn 0.5s; min-width: 300px; }
.badge-modal .badge-icon { font-size: 5rem; margin-bottom: 15px; display: block; }
.badge-modal h3 { margin: 0; color: #f39c12; font-size: 1.6rem; text-transform: uppercase; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px 40px; border-radius: 50px; font-size: 2rem; z-index: 3000; font-weight: 900; box-shadow: 0 10px 30px rgba(241, 196, 15, 0.6); animation: popIn 0.5s; }

@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* Responsive */
@media (max-width: 900px) {
  .main-layout { grid-template-columns: 1fr; } 
  .sidebar-column { display: none; }
  .top-row-grid { grid-template-columns: 1fr; }
}
</style>