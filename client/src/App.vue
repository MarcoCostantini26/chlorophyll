<script setup>
import { ref, onMounted } from 'vue';
import { io } from 'socket.io-client';
import TreeMap from './components/TreeMap.vue'; // Assicurati che questo file esista!

const socket = io('http://localhost:3000');

// --- STATO REATTIVO ---
const trees = ref([]);
const currentUser = ref(null);
const isConnected = ref(false);
const showLevelUp = ref(false);
const currentWeather = ref('sunny'); // Default iniziale

// --- 1. CHIAMATE API ---

const fetchTrees = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/trees');
    trees.value = await res.json();
  } catch (e) { console.error("Errore fetch alberi:", e); }
};

const mockLogin = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/users/mock-login');
    if (res.ok) currentUser.value = await res.json();
  } catch (e) { console.error("Errore login:", e); }
};

// --- 2. AZIONI UTENTE ---

const waterTree = (treeId) => {
  if (!currentUser.value) return alert("Utente non caricato!");
  
  socket.emit('water_tree', { 
    treeId: treeId, 
    userId: currentUser.value._id 
  });
};

// --- 3. LOGICA SOCKET & LIFECYCLE ---

onMounted(() => {
  fetchTrees();
  mockLogin();

  // Connessione
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);

  // A. Aggiornamento Singolo Albero (Azione Utente)
  socket.on('tree_updated', (updatedTree) => {
    const index = trees.value.findIndex(t => t._id === updatedTree._id);
    if (index !== -1) trees.value[index] = updatedTree;
  });

  // B. Aggiornamento di Massa (es. Pioggia che bagna tutti)
  socket.on('trees_refresh', (allTrees) => {
    trees.value = allTrees;
  });

  // C. Aggiornamento Meteo
  socket.on('weather_update', (weather) => {
    currentWeather.value = weather;
  });

  // D. Gamification (XP Utente)
  socket.on('user_updated', (updatedUser) => {
    if (currentUser.value && currentUser.value._id === updatedUser._id) {
      currentUser.value = updatedUser;
    }
  });

  // E. Level Up
  socket.on('level_up', () => {
    showLevelUp.value = true;
    setTimeout(() => showLevelUp.value = false, 3000);
  });
});
</script>

<template>
  <div class="container">
    
    <header v-if="currentUser" class="user-header">
      <div class="user-info">
        <h2>👤 {{ currentUser.username }}</h2>
        <span class="role">{{ currentUser.role }}</span>
      </div>
      <div class="user-stats">
        <div class="xp-bar">
          <div class="xp-fill" :style="{ width: (currentUser.xp % 100) + '%' }"></div>
        </div>
        <p>Livello <strong>{{ currentUser.level }}</strong> ({{ currentUser.xp }} XP)</p>
      </div>
    </header>

    <div v-if="showLevelUp" class="level-up-modal">
      🌟 LEVEL UP! 🌟
    </div>

    <h1 class="main-title">🍃 Chlorophyll Forest</h1>
    <div :class="['status-dot', isConnected ? 'online' : 'offline']" title="Stato Server"></div>

    <div class="weather-widget" :class="currentWeather">
      <div v-if="currentWeather === 'sunny'">☀️ SOLE <small>(Evaporazione attiva)</small></div>
      <div v-if="currentWeather === 'cloudy'">☁️ NUVOLOSO <small>(Stabile)</small></div>
      <div v-if="currentWeather === 'rainy'">🌧️ PIOGGIA <small>(Auto-Innaffio Attivo!)</small></div>
    </div>

    <TreeMap :trees="trees" @water-action="waterTree" /> 
    
    <div class="separator">👇 Dettaglio Foreste 👇</div>

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

        <button @click="waterTree(tree._id)" :disabled="tree.waterLevel >= 100">
          💧 Innaffia (+15 XP)
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.container { 
  max-width: 900px; 
  margin: 0 auto; 
  padding: 20px; 
  font-family: 'Inter', sans-serif; 
  position: relative; 
}

/* Header Utente */
.user-header { 
  display: flex; justify-content: space-between; align-items: center; 
  background: white; padding: 15px 25px; border-radius: 12px; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #eee;
}
.user-info h2 { margin: 0; font-size: 1.3rem; color: #2c3e50; }
.role { font-size: 0.8rem; text-transform: uppercase; color: #7f8c8d; font-weight: bold; letter-spacing: 1px; }

.user-stats { text-align: right; width: 200px; }
.xp-bar { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin-bottom: 5px; }
.xp-fill { height: 100%; background: #f1c40f; transition: width 0.5s ease-out; }

/* Widget Meteo */
.weather-widget {
  text-align: center; padding: 15px; margin-bottom: 20px; border-radius: 12px;
  font-weight: bold; font-size: 1.1rem; color: white;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: all 0.5s ease;
}
.weather-widget.sunny { background: linear-gradient(to right, #f2994a, #f2c94c); }
.weather-widget.cloudy { background: linear-gradient(to right, #bdc3c7, #2c3e50); }
.weather-widget.rainy { 
  background: linear-gradient(to right, #373b44, #4286f4); 
  animation: pulse 2s infinite; 
}
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }

/* Elementi Generali */
.main-title { text-align: center; color: #27ae60; margin-bottom: 20px; }
.separator { text-align: center; margin: 20px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; }
.status-dot { width: 12px; height: 12px; border-radius: 50%; position: absolute; top: 25px; right: 25px; }
.online { background: #2ecc71; box-shadow: 0 0 8px #2ecc71; }
.offline { background: #e74c3c; }

/* Griglia Card */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 6px solid #ccc; transition: transform 0.2s;}
.card:hover { transform: translateY(-3px); }

/* Stati Albero */
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

/* Modal */
.level-up-modal {
  position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%);
  background: #f1c40f; color: #fff; padding: 20px 40px; font-size: 2rem; font-weight: 800;
  border-radius: 50px; box-shadow: 0 10px 30px rgba(241, 196, 15, 0.6);
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 999;
}
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
</style>