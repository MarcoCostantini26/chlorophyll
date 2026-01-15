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
  } catch (e) { console.error("Errore dati admin", e); }
};

onMounted(() => { fetchData(); intervalId = setInterval(fetchData, 3000); });
onUnmounted(() => { if (intervalId) clearInterval(intervalId); });
</script>

<template>
  <div class="admin-dashboard">
    <div class="header-panel">
      <h3>🏙️ Control Room (City Manager)</h3>
      <span class="live-badge">● LIVE</span>
    </div>

    <div class="dashboard-flex" v-if="stats">
      <div class="flex-col stats-numbers">
        <div class="stat-box"><span class="lbl">Totale</span><span class="val">{{ stats.totalTrees }}</span></div>
        <div class="stat-box blue"><span class="lbl">Media Acqua</span><span class="val">{{ stats.avgWater || 0 }}%</span></div>
      </div>
      <div class="flex-col chart-container"><StatusChart :stats="stats" /></div>
      <div class="flex-col logs-container">
        <h4>📜 Registro Attività</h4>
        <ul>
          <li v-for="log in logs" :key="log._id">
            <span class="time">{{ new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }}</span>
            <span class="desc"><strong>{{ log.user ? log.user.username : 'Sistema' }}</strong>: {{ log.tree ? log.tree.name : 'Unknown' }}</span>
          </li>
          <li v-if="logs.length === 0" class="empty">Nessuna attività</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background: white; color: #2c3e50; padding: 20px; border-radius: 12px;
  /* RIMOSSO margin-bottom */
  border: 2px solid #8e44ad;
  box-shadow: 0 5px 15px rgba(142, 68, 173, 0.1);
  width: 100%;
  box-sizing: border-box;
}
.header-panel { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.header-panel h3 { margin: 0; color: #8e44ad; font-weight: 800; font-size: 1.1rem; }
.live-badge { border: 1px solid #e74c3c; color: #e74c3c; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; animation: blink 1s infinite; }
.dashboard-flex { display: flex; align-items: stretch; gap: 20px; }
.flex-col { flex: 1; }
.stats-numbers { display: flex; flex-direction: column; gap: 10px; justify-content: center; max-width: 150px;}
.stat-box { background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #eee; }
.stat-box .lbl { display: block; font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; font-weight: bold; }
.stat-box .val { display: block; font-size: 1.6rem; font-weight: 900; color: #2c3e50; }
.stat-box.blue { background: #ebf5fb; border-color: #aed6f1; }
.stat-box.blue .val { color: #3498db; }
.chart-container { min-width: 250px; display: flex; justify-content: center; align-items: center; }
.logs-container { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; min-width: 250px; }
.logs-container h4 { margin: 0 0 10px 0; font-size: 0.75rem; color: #95a5a6; text-transform: uppercase; }
ul { list-style: none; padding: 0; margin: 0; overflow-y: auto; height: 140px; }
li { font-size: 0.8rem; padding: 5px 0; border-bottom: 1px solid #eee; display: flex; gap: 8px; }
.time { color: #95a5a6; font-family: monospace; min-width: 50px; }
.desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .desc strong { color: #8e44ad; }
.empty { text-align: center; color: #ccc; margin-top: 20px; font-style: italic; font-size: 0.8rem; }
@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
@media (max-width: 768px) { .dashboard-flex { flex-direction: column; } .stats-numbers { flex-direction: row; max-width: 100%; } .stat-box { flex: 1; } .chart-container, .logs-container { min-width: 0; width: 100%; } }
</style>