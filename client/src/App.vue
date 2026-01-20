<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
const router = useRouter();

// --- STATO GLOBALE ---
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const currentWeather = ref('sunny');

// --- MODALI GLOBALI (LevelUp, AI, Badge) ---
const showLevelUp = ref(false);
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);
const showBadgeModal = ref(false);
const lastUnlockedBadge = ref({ name: '', desc: '' });
const notificationPermission = ref(Notification.permission);

// --- LOGICA DATI ---
const fetchTrees = async () => { 
  try {
    const res = await fetch('http://localhost:3000/api/trees'); 
    trees.value = await res.json(); 
  } catch (e) { console.error("Errore fetch alberi", e); }
};

// --- GESTIONE UTENTE ---
const handleLoginSuccess = (user) => { 
  currentUser.value = user; 
  localStorage.setItem('user', JSON.stringify(user));
  if (Notification.permission === 'default') Notification.requestPermission();
  router.push('/');
};

const handleGuestAccess = () => {
  currentUser.value = { _id: 'guest', username: 'Public Monitor', role: 'public_monitor', xp: 0, level: 0 };
  localStorage.setItem('user', JSON.stringify(currentUser.value));
  router.push('/');
};

const handleLogout = () => { 
  currentUser.value = null; 
  localStorage.removeItem('user');
  router.push('/login'); 
};

// --- AZIONI ---
const waterTree = (treeId) => { 
  if(currentUser.value) socket.emit('water_tree', { treeId, userId: currentUser.value._id }); 
};

const forceWater = ({id, amt}) => { 
  socket.emit('admin_force_water', { treeId: id, amount: amt }); 
};

const askDrChlorophyll = async (tree) => { 
  showAiModal.value = true; isAiThinking.value = true; aiResponse.value = ''; 
  try { 
    const res = await fetch('http://localhost:3000/api/ai/consult', { 
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify({ treeId: tree._id }) 
    }); 
    const data = await res.json(); aiResponse.value = data.message; 
  } catch (e) { aiResponse.value = "Errore AI"; } finally { isAiThinking.value = false; } 
};

// 🔥 FIX ADOZIONE: Aggiorna lo stato locale immediatamente
const toggleAdopt = async (treeId) => {
  if (!currentUser.value) return;
  try {
    const res = await fetch('http://localhost:3000/api/users/adopt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.value._id, treeId })
    });

    if (res.ok) {
      const updatedUser = await res.json();
      currentUser.value = updatedUser; // Aggiorna reattività Vue
      localStorage.setItem('user', JSON.stringify(updatedUser)); // Salva persistenza
    }
  } catch (e) { console.error(e); }
};

const sendNotification = (t, b) => { if (Notification.permission === 'granted') new Notification(t, { body: b }); };

// --- LIFECYCLE ---
onMounted(() => {
  const saved = localStorage.getItem('user');
  if (saved) currentUser.value = JSON.parse(saved);

  fetchTrees();

  // Socket Listeners
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);

  // FIX REATTIVITÀ ALBERI
  socket.on('tree_updated', (updatedTree) => {
    const idx = trees.value.findIndex(x => x._id === updatedTree._id);
    if (idx !== -1) {
      trees.value[idx] = updatedTree; 
      trees.value = [...trees.value]; // Forza ricalcolo Vue
    }
  });

  socket.on('trees_refresh', (all) => trees.value = all);
  
  socket.on('weather_update', (w) => { 
    if (w !== currentWeather.value) { 
      if (w === 'rainy') sendNotification("🌧️ Piove!", "Auto-innaffio."); 
      currentWeather.value = w; 
    } 
  });
  
  socket.on('user_updated', (u) => { 
    if (currentUser.value && currentUser.value._id === u._id) {
      currentUser.value = u; 
      localStorage.setItem('user', JSON.stringify(u));
    } 
  });
  
  socket.on('level_up', (d) => { 
    showLevelUp.value = true; 
    sendNotification("🎉 LEVEL UP!", `Livello ${d.level}!`); 
    setTimeout(() => showLevelUp.value = false, 3000); 
  });

  socket.on('badge_unlocked', (d) => { 
    if (currentUser.value && currentUser.value.username === d.username) { 
      lastUnlockedBadge.value = d.badge; 
      showBadgeModal.value = true; 
      sendNotification("🏆 BADGE!", d.badge.name); 
      setTimeout(() => showBadgeModal.value = false, 4000); 
    } 
  });
});
</script>

<template>
  <div class="app-container">
    <div class="app-header" v-if="currentUser">
      <div class="header-left">
        <h1 class="main-title">🍃 Chlorophyll</h1>
        <div :class="['status-pill', isConnected ? 'online' : 'offline']">
          {{ isConnected ? 'Online' : 'Offline' }}
        </div>
      </div>
    </div>

    <router-view 
      :user="currentUser" 
      :trees="trees"
      :weather="currentWeather"
      :isConnected="isConnected"
      @login-success="handleLoginSuccess"
      @guest-access="handleGuestAccess"
      @logout="handleLogout"
      @update-profile="(u) => currentUser = u"
      @water="waterTree"
      @force-water="forceWater"
      @adopt="toggleAdopt"
      @ask-ai="askDrChlorophyll"
    />

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    
    <div v-if="showBadgeModal" class="badge-modal">
      <div class="badge-icon">🏆</div>
      <h3>BADGE SBLOCCATO!</h3>
      <p class="badge-name">{{ lastUnlockedBadge.name }}</p>
      <small>{{ lastUnlockedBadge.desc }}</small>
    </div>
    
    <div v-if="showAiModal" class="ai-modal-overlay" @click.self="showAiModal = false">
      <div class="ai-modal">
        <div class="ai-header">
          <h3>🤖 Dr. Chlorophyll</h3>
          <button @click="showAiModal = false" class="close-btn">✖</button>
        </div>
        <div class="ai-body">
          <div v-if="isAiThinking" class="thinking">...Analisi...</div>
          <p v-else>{{ aiResponse }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* CSS GLOBALE */
.container { max-width: 1400px; margin: 0 auto; padding: 20px 30px; font-family: 'Inter', sans-serif; }
.app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
.header-left { display: flex; align-items: center; gap: 15px; }
.main-title { color: #27ae60; font-size: 1.5rem; margin: 0; font-weight: 800; }
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: white; }
.online { background: #2ecc71; } .offline { background: #e74c3c; }

/* MODALI */
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(2px); }
.ai-modal { background: white; width: 100%; max-width: 400px; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; }
.ai-header { background: #8e44ad; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
.ai-body { padding: 25px; color: #333; line-height: 1.6; font-size: 1.05rem; }
.close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.badge-modal { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%); background: white; border: 4px solid #f1c40f; color: #2c3e50; padding: 30px; text-align: center; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 4000; animation: popIn 0.5s; min-width: 300px; }
.badge-modal .badge-icon { font-size: 5rem; margin-bottom: 15px; display: block; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px 40px; border-radius: 50px; font-size: 2rem; z-index: 3000; font-weight: 900; box-shadow: 0 10px 30px rgba(241, 196, 15, 0.6); animation: popIn 0.5s; }
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>