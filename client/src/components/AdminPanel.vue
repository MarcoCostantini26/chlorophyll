<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StatusChart from './StatusChart.vue';

const stats = ref(null);
const logs = ref([]);
const showModal = ref(false); 
let intervalId = null;

const fetchData = async () => {
  try {
    const resStats = await fetch('http://localhost:3000/api/admin/stats');
    if(resStats.ok) stats.value = await resStats.json();
    const resLogs = await fetch('http://localhost:3000/api/admin/logs');
    if(resLogs.ok) logs.value = await resLogs.json();
  } catch (e) { console.error("Errore dati admin", e); }
};

const requestClearLogs = () => { showModal.value = true; };

const confirmClearLogs = async () => {
  try {
    await fetch('http://localhost:3000/api/admin/logs', { method: 'DELETE' });
    logs.value = []; 
    showModal.value = false;
  } catch (e) { alert('Errore.'); }
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
        <div class="stat-box">
          <span class="lbl">Totale</span>
          <span class="val">{{ stats.totalTrees }}</span>
        </div>
        <div class="stat-box blue">
          <span class="lbl">Media Acqua</span>
          <span class="val">{{ stats.avgWater || 0 }}%</span>
        </div>
      </div>

      <div class="flex-col chart-container">
        <StatusChart :stats="stats" />
      </div>
      
      <div class="flex-col logs-container">
        <div class="logs-header-row">
          <h4>📜 Registro Attività</h4>
          <button v-if="logs.length > 0" @click="requestClearLogs" class="btn-trash" title="Svuota registro">🗑️</button>
        </div>

        <ul>
          <li v-for="log in logs" :key="log._id">
            <span class="time">{{ new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }}</span>
            <span class="desc"><strong>{{ log.user ? log.user.username : 'Sistema' }}</strong>: {{ log.tree ? log.tree.name : 'Unknown' }}</span>
          </li>
          <li v-if="logs.length === 0" class="empty">Nessuna attività</li>
        </ul>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <h3>Svuotare il registro?</h3>
        <p>L'operazione non può essere annullata.</p>
        <div class="modal-actions">
          <button @click="showModal = false" class="btn-cancel">Annulla</button>
          <button @click="confirmClearLogs" class="btn-confirm">Conferma</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* STILI BASE (Mobile First) */
.admin-dashboard {
  background: white; color: #2c3e50; padding: 15px; border-radius: 12px;
  border: 2px solid #8e44ad;
  box-shadow: 0 5px 15px rgba(142, 68, 173, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.header-panel { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; align-items: center; }
.header-panel h3 { margin: 0; color: #8e44ad; font-weight: 800; font-size: 1rem; }
.live-badge { border: 1px solid #e74c3c; color: #e74c3c; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; animation: blink 1s infinite; white-space: nowrap; }

/* Layout Flex: Default Colonna (Mobile) */
.dashboard-flex { display: flex; flex-direction: column; gap: 20px; }

.flex-col { flex: 1; width: 100%; }

/* Stats: Default Riga (Mobile) */
.stats-numbers { display: flex; flex-direction: row; gap: 10px; width: 100%; }
.stat-box { flex: 1; background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #eee; }
.stat-box .lbl { display: block; font-size: 0.7rem; color: #7f8c8d; text-transform: uppercase; font-weight: bold; }
.stat-box .val { display: block; font-size: 1.4rem; font-weight: 900; color: #2c3e50; }
.stat-box.blue { background: #ebf5fb; border-color: #aed6f1; }
.stat-box.blue .val { color: #3498db; }

/* Chart & Logs */
.chart-container { display: flex; justify-content: center; align-items: center; min-height: 150px; }
.logs-container { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; }

/* Logs Content */
.logs-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.logs-header-row h4 { margin: 0; font-size: 0.75rem; color: #95a5a6; text-transform: uppercase; }
.btn-trash { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 5px; opacity: 0.6; transition: opacity 0.2s; }
.btn-trash:hover { opacity: 1; transform: scale(1.1); }

ul { list-style: none; padding: 0; margin: 0; overflow-y: auto; height: 140px; }
li { font-size: 0.8rem; padding: 5px 0; border-bottom: 1px solid #eee; display: flex; gap: 8px; }
.time { color: #95a5a6; font-family: monospace; min-width: 50px; }
.desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; } 
.desc strong { color: #8e44ad; }
.empty { text-align: center; color: #ccc; margin-top: 20px; font-style: italic; font-size: 0.8rem; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

/* Modale */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; backdrop-filter: blur(2px); }
.modal-box { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 90%; max-width: 300px; text-align: center; border: 1px solid #eee; animation: popIn 0.2s ease-out; }
.modal-box h3 { margin: 0 0 10px 0; color: #333; font-size: 1.1rem; }
.modal-actions { display: flex; justify-content: center; gap: 15px; margin-top: 20px; }
.btn-cancel { background: #f1f2f6; color: #7f8c8d; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }
.btn-confirm { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; }

@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* --- MEDIA QUERY DESKTOP (Tablet & PC) --- */
@media (min-width: 768px) {
  .dashboard-flex { 
    flex-direction: row; /* Torna orizzontale */
    align-items: stretch;
  }
  
  .stats-numbers { 
    flex-direction: column; /* Numeri verticali a sinistra */
    max-width: 150px; 
    justify-content: center;
  }
  
  .stat-box { 
    flex: initial; 
    width: 100%; 
  }
  
  .chart-container, .logs-container {
    min-width: 250px;
  }
}
</style>