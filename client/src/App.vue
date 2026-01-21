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

// --- MODALI GLOBALI ---
const showLevelUp = ref(false);
const showAiModal = ref(false);
const aiResponse = ref('');
const isAiThinking = ref(false);
const showBadgeModal = ref(false);
const lastUnlockedBadge = ref({ name: '', desc: '' });

// --- LOGICA DI BASE (Fetch, Login, Socket) ---
const fetchTrees = async () => { 
  try {
    const res = await fetch('http://localhost:3000/api/trees'); 
    trees.value = await res.json(); 
  } catch (e) { console.error("Errore fetch alberi", e); }
};

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

// --- AZIONI SOCKET GLOBALI ---
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
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ treeId: tree._id }) 
    }); 
    const data = await res.json(); aiResponse.value = data.message; 
  } catch (e) { aiResponse.value = "Errore AI"; } finally { isAiThinking.value = false; } 
};
const toggleAdopt = async (treeId) => {
  if (!currentUser.value) return;
  try {
    const res = await fetch('http://localhost:3000/api/users/adopt', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.value._id, treeId })
    });
    if (res.ok) {
      const updatedUser = await res.json();
      currentUser.value = updatedUser; 
      localStorage.setItem('user', JSON.stringify(updatedUser)); 
    }
  } catch (e) { console.error(e); }
};

// --- LIFECYCLE ---
onMounted(() => {
  const saved = localStorage.getItem('user');
  if (saved) currentUser.value = JSON.parse(saved);
  fetchTrees();
  
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);
  
  socket.on('tree_updated', (t) => { const idx = trees.value.findIndex(x => x._id === t._id); if (idx !== -1) { trees.value[idx] = t; trees.value = [...trees.value]; } });
  socket.on('trees_refresh', (all) => trees.value = all);
  socket.on('weather_update', (w) => { if (w !== currentWeather.value) currentWeather.value = w; });
  socket.on('user_updated', (u) => { if (currentUser.value && currentUser.value._id === u._id) { currentUser.value = u; localStorage.setItem('user', JSON.stringify(u)); } });
  socket.on('level_up', () => { showLevelUp.value = true; setTimeout(() => showLevelUp.value = false, 3000); });
  socket.on('badge_unlocked', (d) => { if (currentUser.value && currentUser.value.username === d.username) { lastUnlockedBadge.value = d.badge; showBadgeModal.value = true; setTimeout(() => showBadgeModal.value = false, 4000); } });
});
</script>

<template>
  <div class="app-root">
    
    <header class="app-header" v-if="currentUser">
      <div class="header-container">
        <div class="header-left">
          <h1 class="main-title">🍃 Chlorophyll</h1>
          <div :class="['status-pill', isConnected ? 'online' : 'offline']">
            {{ isConnected ? 'Online' : 'Offline' }}
          </div>
        </div>

        <nav class="main-nav">
          <router-link to="/" class="nav-item">🌲 Dashboard</router-link>
          
          <router-link 
            v-if="currentUser.role === 'city_manager'" 
            to="/admin/analytics" 
            class="nav-item admin-link"
          >
            🎛️ Control Room
          </router-link>

          <router-link to="/profile" class="nav-item">👤 Profilo</router-link>
          <button @click="handleLogout" class="nav-item btn-logout">Esci 🚪</button>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
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
      </div>
    </main>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    <div v-if="showBadgeModal" class="badge-modal">
      <div class="badge-icon">🏆</div><h3>BADGE SBLOCCATO!</h3><p>{{ lastUnlockedBadge.name }}</p><small>{{ lastUnlockedBadge.desc }}</small>
    </div>
    <div v-if="showAiModal" class="ai-modal-overlay" @click.self="showAiModal = false">
      <div class="ai-modal">
        <div class="ai-header"><h3>🤖 Dr. Chlorophyll</h3><button @click="showAiModal = false" class="close-btn">✖</button></div>
        <div class="ai-body"><div v-if="isAiThinking" class="thinking">...Analisi...</div><p v-else>{{ aiResponse }}</p></div>
      </div>
    </div>

  </div>
</template>

<style>
/* CSS GLOBALE */
html, body {
  margin: 0; padding: 0; width: 100%;
  font-family: 'Inter', sans-serif;
  background-color: #121212; 
  color: #ecf0f1;
}

/* HEADER FISSO */
.app-header {
  position: fixed; top: 0; left: 0; width: 100%; height: 70px;
  background: #1e1e1e; border-bottom: 2px solid #333;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;
}
.header-container { display: flex; justify-content: space-between; align-items: center; height: 100%; padding: 0 30px; max-width: 1400px; margin: 0 auto; }
.main-content { padding-top: 90px; padding-bottom: 40px; min-height: 100vh; box-sizing: border-box; }
.content-wrapper { max-width: 1400px; margin: 0 auto; padding: 0 20px; }

/* NAVIGAZIONE */
.header-left { display: flex; align-items: center; gap: 15px; }
.main-title { color: #2ecc71; font-size: 1.5rem; margin: 0; font-weight: 800; } 
.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: white; text-transform: uppercase; }
.online { background: #2ecc71; } .offline { background: #e74c3c; }

.main-nav { display: flex; gap: 20px; align-items: center; }
.nav-item { text-decoration: none; color: #bdc3c7; font-weight: 600; font-size: 0.95rem; transition: color 0.2s; background: none; border: none; font-family: inherit; cursor: pointer; display: flex; align-items: center; height: 70px; border-bottom: 3px solid transparent; }
.nav-item:hover { color: #2ecc71; }
.nav-item.router-link-active { color: #2ecc71; border-bottom-color: #2ecc71; } 

/* STILE LINK ADMIN */
.admin-link { color: #9b59b6 !important; }
.admin-link:hover { color: #8e44ad !important; text-shadow: 0 0 10px rgba(142, 68, 173, 0.4); }

.btn-logout { color: #e74c3c !important; height: auto; border: 1px solid #e74c3c; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; line-height: 1; border-bottom: 1px solid #e74c3c !important; }
.btn-logout:hover { background: #e74c3c; color: white !important; }

/* MODALI STILI */
.ai-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px); }
.ai-modal { background: #2c3e50; color: white; width: 100%; max-width: 400px; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); animation: slideUp 0.3s ease; }
.ai-header { background: #8e44ad; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
.ai-body { padding: 25px; color: #ecf0f1; }
.close-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px 40px; border-radius: 50px; font-size: 2rem; z-index: 3000; font-weight: 900; animation: popIn 0.5s; }
.badge-modal { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%); background: #2c3e50; border: 4px solid #f1c40f; color: white; padding: 30px; text-align: center; border-radius: 20px; z-index: 4000; animation: popIn 0.5s; min-width: 300px; }
.badge-modal .badge-icon { font-size: 5rem; margin-bottom: 15px; display: block; }
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>