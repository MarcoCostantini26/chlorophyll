<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

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
      <h4>📜 Registro Attività Community</h4>
      <ul>
        <li v-for="log in logs" :key="log._id">
          <span class="time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
          <span class="log-details">
            <strong>{{ log.user ? log.user.username : 'Sistema' }}</strong> 
            : {{ log.tree ? log.tree.name : 'Albero' }}
          </span>
        </li>
        <li v-if="logs.length === 0" class="empty-log">Nessuna attività recente</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* SFONDO BIANCO E TESTO SCURO PER LEGGIBILITÀ */
.admin-dashboard {
  background: #ffffff; /* Sfondo bianco */
  color: #2c3e50;      /* Testo scuro */
  padding: 20px; 
  border-radius: 12px;
  margin-bottom: 30px; 
  border: 2px solid #8e44ad; /* Bordo viola City Manager */
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.header-panel { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-panel h3 { margin: 0; color: #8e44ad; font-weight: 800; } /* Titolo Viola */
.live-badge { color: #e74c3c; font-size: 0.7rem; font-weight: bold; animation: blink 1s infinite; padding: 2px 6px; border: 1px solid #e74c3c; border-radius: 4px; }

/* CARD STATISTICHE */
.stats-row { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  background: #f8f9fa; /* Grigio chiarissimo */
  border: 1px solid #e9ecef;
  flex: 1; padding: 15px; border-radius: 8px;
  text-align: center; min-width: 100px;
}

/* Colori Specifici per le Labels e Numeri */
.stat-card .label { display: block; font-size: 0.75rem; color: #7f8c8d; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 5px; }
.stat-card .number { font-size: 1.8rem; font-weight: 900; color: #2c3e50; }

/* Varianti colorate (Sfondo leggero + Bordo colorato) */
.stat-card.danger { background: #fdf0ed; border-color: #fadbd8; }
.stat-card.danger .number { color: #e74c3c; }

.stat-card.warning { background: #fef9e7; border-color: #f9e79f; }
.stat-card.warning .number { color: #f39c12; }

.stat-card.info { background: #ebf5fb; border-color: #aed6f1; }
.stat-card.info .number { color: #3498db; }

/* LOG SECTION */
.logs-section { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; }
.logs-section h4 { margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #95a5a6; }

ul { list-style: none; padding: 0; margin: 0; max-height: 150px; overflow-y: auto; }
li { font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #eee; display: flex; align-items: center; }
li:last-child { border-bottom: none; }

.time { color: #95a5a6; font-size: 0.75rem; min-width: 65px; font-family: monospace; }
.log-details { color: #34495e; }
.log-details strong { color: #8e44ad; } /* Nome utente viola */

.empty-log { text-align: center; color: #bdc3c7; font-style: italic; padding: 10px; }

/* Scrollbar carina */
ul::-webkit-scrollbar { width: 6px; }
ul::-webkit-scrollbar-track { background: transparent; }
ul::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
</style>