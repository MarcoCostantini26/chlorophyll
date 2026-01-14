<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const stats = ref(null);
const logs = ref([]);
let intervalId = null;

const fetchData = async () => {
  try {
    // Carica Stats
    const resStats = await fetch('http://localhost:3000/api/admin/stats');
    if(resStats.ok) stats.value = await resStats.json();

    // Carica Log
    const resLogs = await fetch('http://localhost:3000/api/admin/logs');
    if(resLogs.ok) logs.value = await resLogs.json();
  } catch (e) {
    console.error("Errore caricamento dati admin", e);
  }
};

onMounted(() => {
  fetchData();
  // Aggiorna i dati ogni 3 secondi per vedere i cambiamenti live
  intervalId = setInterval(fetchData, 3000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="admin-dashboard">
    <div class="header-panel">
      <h3>🏙️ City Manager Control Room</h3>
      <span class="live-badge">● LIVE DATA</span>
    </div>

    <div v-if="stats" class="stats-row">
      <div class="stat-card">
        <span class="label">Totale Alberi</span>
        <span class="number">{{ stats.totalTrees }}</span>
      </div>
      <div class="stat-card danger">
        <span class="label">Critici</span>
        <span class="number">{{ stats.criticalTrees }}</span>
      </div>
      <div class="stat-card warning">
        <span class="label">Assetati</span>
        <span class="number">{{ stats.thirstyTrees }}</span>
      </div>
      <div class="stat-card info">
        <span class="label">Media Acqua</span>
        <span class="number">{{ stats.avgWater }}%</span>
      </div>
    </div>

    <div class="logs-section">
      <h4>📜 Registro Attività Community (Ultimi 10)</h4>
      <ul>
        <li v-for="log in logs" :key="log._id">
          <span class="time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <strong>{{ log.user ? log.user.username : 'Sistema/Ospite' }}</strong> 
          ha curato 
          <em>{{ log.tree ? log.tree.name : 'Albero rimosso' }}</em>
        </li>
        <li v-if="logs.length === 0" style="text-align: center; color: #7f8c8d;">Nessuna attività recente</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background: #2c3e50; color: white; padding: 20px; border-radius: 12px;
  margin-bottom: 30px; border: 2px solid #8e44ad; box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}
.header-panel { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-panel h3 { margin: 0; color: #ecf0f1; font-size: 1.2rem; }
.live-badge { color: #e74c3c; font-size: 0.8rem; font-weight: bold; animation: blink 1s infinite; }

.stats-row { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  background: rgba(255,255,255,0.1); flex: 1; padding: 15px; border-radius: 8px;
  text-align: center; min-width: 100px;
}
.stat-card .label { display: block; font-size: 0.8rem; opacity: 0.8; margin-bottom: 5px; }
.stat-card .number { font-size: 1.8rem; font-weight: bold; }
.stat-card.danger { background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; }
.stat-card.warning { background: rgba(241, 196, 15, 0.2); border: 1px solid #f1c40f; }
.stat-card.info { background: rgba(52, 152, 219, 0.2); border: 1px solid #3498db; }

.logs-section { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; }
.logs-section h4 { margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #bdc3c7; }
ul { list-style: none; padding: 0; margin: 0; max-height: 150px; overflow-y: auto; }
li { font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; }
.time { color: #95a5a6; font-size: 0.8rem; min-width: 70px; }

/* Scrollbar custom per il box scuro */
ul::-webkit-scrollbar { width: 5px; }
ul::-webkit-scrollbar-track { background: transparent; }
ul::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>