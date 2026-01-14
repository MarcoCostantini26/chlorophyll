<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StatusChart from './StatusChart.vue';

const stats = ref(null);
const logs = ref([]);
let intervalId = null;

const fetchData = async () => {
  try {
    const resStats = await fetch('http://localhost:3000/api/admin/stats');
    if(resStats.ok) stats.value = await resStats.json();

    const resLogs = await fetch('http://localhost:3000/api/admin/logs');
    if(resLogs.ok) logs.value = await resLogs.json();
  } catch (e) {
    console.error("Errore dati admin", e);
  }
};

onMounted(() => {
  fetchData();
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
      <div class="badges">
        <span class="live-badge">● LIVE DATA</span>
      </div>
    </div>

    <div class="dashboard-grid" v-if="stats">
      
      <div class="grid-section stats-numbers">
        <div class="stat-box main">
          <span class="lbl">Totale Alberi</span>
          <span class="val">{{ stats.totalTrees }}</span>
        </div>
        <div class="stat-box blue">
          <span class="lbl">Media Acqua</span>
          <span class="val">{{ stats.avgWater || 0 }}%</span>
        </div>
      </div>

      <div class="grid-section chart-container">
        <StatusChart :stats="stats" />
      </div>

      <div class="grid-section logs-container">
        <h4>📜 Registro Attività</h4>
        <ul>
          <li v-for="log in logs" :key="log._id">
            <span class="time">{{ new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }}</span>
            <span class="desc">
              <strong>{{ log.user ? log.user.username : 'Sistema' }}</strong>: {{ log.tree ? log.tree.name : 'Unknown' }}
            </span>
          </li>
          <li v-if="logs.length === 0" class="empty">Nessuna attività</li>
        </ul>
      </div>

    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background: white; color: #2c3e50; padding: 25px; border-radius: 12px;
  margin-bottom: 40px; border: 2px solid #8e44ad;
  box-shadow: 0 10px 30px rgba(142, 68, 173, 0.1);
}

.header-panel { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.header-panel h3 { margin: 0; color: #8e44ad; font-weight: 800; font-size: 1.2rem; }
.live-badge { border: 1px solid #e74c3c; color: #e74c3c; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; animation: blink 1s infinite; }

/* LAYOUT GRIGLIA PER PC */
.dashboard-grid {
  display: grid;
  grid-template-columns: 200px 1fr 300px; /* Colonne: Fissa, Elastica, Fissa */
  gap: 30px;
  align-items: center;
}

/* 1. Numeri */
.stats-numbers { display: flex; flex-direction: column; gap: 15px; }
.stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #eee; }
.stat-box .lbl { display: block; font-size: 0.75rem; color: #7f8c8d; text-transform: uppercase; font-weight: bold; }
.stat-box .val { display: block; font-size: 2rem; font-weight: 900; color: #2c3e50; }
.stat-box.blue { background: #ebf5fb; border-color: #aed6f1; }
.stat-box.blue .val { color: #3498db; }

/* 2. Grafico */
.chart-container { height: 180px; display: flex; justify-content: center; position: relative; }

/* 3. Logs */
.logs-container { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 15px; height: 100%; min-height: 180px; display: flex; flex-direction: column; }
.logs-container h4 { margin: 0 0 10px 0; font-size: 0.8rem; color: #95a5a6; text-transform: uppercase; }
ul { list-style: none; padding: 0; margin: 0; overflow-y: auto; max-height: 140px; flex-grow: 1; }
li { font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid #eee; display: flex; gap: 10px; }
.time { color: #95a5a6; font-family: monospace; }
.desc strong { color: #8e44ad; }
.empty { text-align: center; color: #ccc; margin-top: 20px; font-style: italic; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>