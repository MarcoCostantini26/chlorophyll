<script setup>
import { ref, onMounted, computed } from 'vue';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const analyticsData = ref(null);
const errorMsg = ref(null);
const searchTerm = ref('');

const fetchAnalytics = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/admin/analytics');
    if (!res.ok) throw new Error(`Errore Server: ${res.status}`);
    analyticsData.value = await res.json();
  } catch (e) { 
    console.error(e);
    errorMsg.value = "Impossibile caricare i dati. Assicurati che il server sia attivo.";
  }
};

// --- GRAFICO 1: STATO SALUTE GLOBALE (Ciambella) ---
const statusChartData = computed(() => {
  if (!analyticsData.value) return { labels: [], datasets: [] };
  const d = analyticsData.value;
  return {
    labels: ['Sani (Verde)', 'Assetati (Giallo)', 'Critici (Rosso)'],
    datasets: [{
      data: [d.healthyTrees, d.thirstyTrees, d.criticalTrees],
      backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
      hoverOffset: 10,
      borderWidth: 0
    }]
  };
});

// --- GRAFICO 2: CATEGORIE IMPILATE (Stacked Bar) ---
const categoryChartData = computed(() => {
  if (!analyticsData.value) return { labels: [], datasets: [] };
  
  const cats = analyticsData.value.categories || {};
  const labels = Object.keys(cats).map(k => k.toUpperCase()); // Es: TREE, BUSH, POTTED
  
  // Estraiamo i dati per ogni stato
  const healthyData = Object.values(cats).map(c => c.healthy);
  const thirstyData = Object.values(cats).map(c => c.thirsty);
  const criticalData = Object.values(cats).map(c => c.critical);

  return {
    labels,
    datasets: [
      {
        label: 'Sani',
        data: healthyData,
        backgroundColor: '#2ecc71', // Verde
        barPercentage: 0.6
      },
      {
        label: 'Assetati',
        data: thirstyData,
        backgroundColor: '#f1c40f', // Giallo
        barPercentage: 0.6
      },
      {
        label: 'Critici',
        data: criticalData,
        backgroundColor: '#e74c3c', // Rosso
        barPercentage: 0.6
      }
    ]
  };
});

// Opzioni per attivare lo "Stacking"
const stackedOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { stacked: true },
    y: { stacked: true }
  },
  plugins: {
    legend: { position: 'top' }
  }
};

// Tabella Filtrata
const filteredTrees = computed(() => {
  if (!analyticsData.value) return [];
  return analyticsData.value.allTrees.filter(t => 
    t.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || 
    (t.category && t.category.toLowerCase().includes(searchTerm.value.toLowerCase()))
  );
});

onMounted(fetchAnalytics);
</script>

<template>
  <div class="analytics-page">
    
    <div class="header-row">
      <div>
        <h1>🎛️ Control Room</h1>
        <p>Panoramica completa dell'ecosistema urbano.</p>
      </div>
      <button class="btn-back" @click="$router.push('/')">↩ Torna alla Dashboard</button>
    </div>

    <div v-if="errorMsg" class="error-box">
      ⚠️ {{ errorMsg }}
    </div>

    <div v-else-if="analyticsData" class="grid-layout">
      
      <div class="kpi-card">
        <h3>Totale Piante</h3>
        <span class="val">{{ analyticsData.totalTrees }}</span>
      </div>
      <div class="kpi-card">
        <h3>Media Idrica</h3>
        <span class="val blue">{{ analyticsData.avgWater }}%</span>
      </div>
      <div class="kpi-card">
        <h3>Criticità</h3>
        <span class="val red">{{ analyticsData.criticalTrees }}</span>
      </div>
      <div class="kpi-card">
        <h3>In Salute</h3>
        <span class="val green">{{ analyticsData.healthyTrees }}</span>
      </div>

      <div class="chart-card">
        <h3>Stato Salute (Globale)</h3>
        <div class="chart-wrapper">
          <Doughnut :data="statusChartData" :options="{ responsive: true, maintainAspectRatio: false }" />
        </div>
      </div>

      <div class="chart-card">
        <h3>Dettaglio per Categoria</h3>
        <div class="chart-wrapper">
          <Bar :data="categoryChartData" :options="stackedOptions" />
        </div>
      </div>

      <div class="table-card full-width">
        <div class="table-header">
          <h3>📂 Database Piante</h3>
          <input v-model="searchTerm" placeholder="🔍 Cerca nome o tipo..." class="search-input" />
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Livello H2O</th>
                <th>Coordinate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tree in filteredTrees" :key="tree._id">
                <td><strong>{{ tree.name }}</strong></td>
                <td><span class="badge-cat">{{ tree.category || 'tree' }}</span></td>
                <td>
                  <span class="status-dot" :class="tree.status"></span> 
                  {{ tree.status === 'healthy' ? 'Sano' : tree.status === 'thirsty' ? 'Assetato' : 'Critico' }}
                </td>
                <td>
                  <div class="mini-bar-bg">
                    <div class="mini-bar-fill" :style="{ width: tree.waterLevel + '%', background: tree.waterLevel < 30 ? '#e74c3c' : '#2ecc71' }"></div>
                  </div>
                  <small>{{ Math.round(tree.waterLevel) }}%</small>
                </td>
                <td class="coord-text">{{ tree.location.lat.toFixed(4) }}, {{ tree.location.lng.toFixed(4) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Caricamento dati in corso...</p>
    </div>

  </div>
</template>

<style scoped>
.analytics-page { 
  padding: 40px; 
  padding-top: 10px; 
  max-width: 1400px; 
  margin: 0 auto; 
  font-family: 'Inter', sans-serif; 
  color: #2c3e50; 
}

.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
.header-row h1 { margin: 0; font-size: 2rem; color: #8e44ad; }
.header-row p { margin: 5px 0 0 0; color: #7f8c8d; }
.btn-back { background: #ecf0f1; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; color: #7f8c8d; transition: background 0.2s; }
.btn-back:hover { background: #bdc3c7; color: white; }

.error-box { background: #fdedec; color: #c0392b; padding: 20px; border-radius: 8px; border: 1px solid #e74c3c; text-align: center; font-weight: bold; }

.grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.full-width { grid-column: span 4; }

/* KPI */
.kpi-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; border: 1px solid #eee; }
.kpi-card h3 { margin: 0 0 10px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
.kpi-card .val { font-size: 2.2rem; font-weight: 800; color: #2c3e50; }
.kpi-card .val.green { color: #2ecc71; }
.kpi-card .val.red { color: #e74c3c; }
.kpi-card .val.blue { color: #3498db; }

/* CHARTS */
.chart-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); grid-column: span 2; display: flex; flex-direction: column; border: 1px solid #eee; }
.chart-card h3 { margin-bottom: 15px; color: #2c3e50; font-size: 1rem; font-weight: bold; text-align: center; }
.chart-wrapper { flex: 1; min-height: 250px; position: relative; }

/* TABLE */
.table-card { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee; }
.table-header { padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.search-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; width: 250px; outline: none; }
.table-container { max-height: 400px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 12px 20px; background: #fff; position: sticky; top: 0; color: #95a5a6; font-size: 0.75rem; text-transform: uppercase; border-bottom: 2px solid #f0f0f0; z-index: 10; }
td { padding: 12px 20px; border-bottom: 1px solid #f9f9f9; font-size: 0.9rem; color: #34495e; vertical-align: middle; }
.badge-cat { background: #eafaf1; color: #27ae60; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
.status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
.status-dot.healthy { background: #2ecc71; } .status-dot.thirsty { background: #f1c40f; } .status-dot.critical { background: #e74c3c; }
.mini-bar-bg { width: 100px; height: 6px; background: #eee; border-radius: 3px; display: inline-block; margin-right: 10px; vertical-align: middle; }
.mini-bar-fill { height: 100%; border-radius: 3px; }
.coord-text { font-family: monospace; color: #bdc3c7; font-size: 0.8rem; }

/* LOADING */
.loading-state { text-align: center; padding: 50px; color: #95a5a6; }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #8e44ad; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>