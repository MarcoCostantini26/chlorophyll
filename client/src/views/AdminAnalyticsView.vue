<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut, Bar } from 'vue-chartjs';

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const router = useRouter(); 
const analyticsData = ref(null);
const errorMsg = ref(null);
const searchTerm = ref('');
const tableRef = ref(null);
const sortKey = ref('waterLevel'); 
const sortOrder = ref(1); 
const activeFilters = ref({ category: null, city: null });

// --- LE TUE FUNZIONI ESISTENTI (INVARIATE) ---
const fetchRealAddress = async (lat, lng) => { const cacheKey = `city_${lat}_${lng}`; const cached = localStorage.getItem(cacheKey); if (cached) return cached; try { const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`; const res = await fetch(url); const data = await res.json(); const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Fuori Mappa'; localStorage.setItem(cacheKey, city); return city; } catch (e) { return 'N/D'; } };
const processAddressesInBatches = async (trees) => { const batchSize = 3; for (let i = 0; i < trees.length; i += batchSize) { const chunk = trees.slice(i, i + batchSize); const promises = chunk.map(async (tree) => { if (tree.location?.lat) tree.city = await fetchRealAddress(tree.location.lat, tree.location.lng); else tree.city = 'No GPS'; }); await Promise.all(promises); } };
const fetchAnalytics = async () => { try { const res = await fetch('http://localhost:3000/api/admin/analytics'); if (!res.ok) throw new Error(`Errore Server: ${res.status}`); const data = await res.json(); data.allTrees = data.allTrees.map(tree => ({ ...tree, city: '⏳ ...' })); analyticsData.value = data; processAddressesInBatches(analyticsData.value.allTrees); } catch (e) { console.error(e); errorMsg.value = "Impossibile caricare i dati."; } };
const sortBy = (key) => { if (sortKey.value === key) sortOrder.value *= -1; else { sortKey.value = key; sortOrder.value = 1; } if (tableRef.value) tableRef.value.scrollTop = 0; };

const getSparklinePoints = (history) => {
  if (!history || history.length < 2) return "";
  const width = 100; const height = 30; const maxVal = 100;
  const data = history.slice(-15);
  const step = width / (data.length - 1 || 1);
  return data.map((point, index) => {
    const x = index * step; const y = height - (point.val / maxVal * height); 
    return `${x},${y}`;
  }).join(' ');
};

// --- COMPUTED (INVARIATE) ---
const uniqueCategories = computed(() => analyticsData.value ? Object.keys(analyticsData.value.categories).sort() : []);
const uniqueCities = computed(() => analyticsData.value ? [...new Set(analyticsData.value.allTrees.map(t => t.city).filter(c => c !== '⏳ ...'))].sort() : []);
const statusChartData = computed(() => { if (!analyticsData.value) return { labels: [], datasets: [] }; const d = analyticsData.value; return { labels: ['Sani', 'Assetati', 'Critici'], datasets: [{ data: [d.healthyTrees, d.thirstyTrees, d.criticalTrees], backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'], borderWidth: 0 }] }; });
const categoryChartData = computed(() => { if (!analyticsData.value?.categories) return { labels: [], datasets: [] }; const cats = analyticsData.value.categories; const labels = Object.keys(cats).map(k => k.toUpperCase()); return { labels, datasets: [ { label: 'Sani', data: Object.values(cats).map(c => c.healthy||0), backgroundColor: '#2ecc71' }, { label: 'Assetati', data: Object.values(cats).map(c => c.thirsty||0), backgroundColor: '#f1c40f' }, { label: 'Critici', data: Object.values(cats).map(c => c.critical||0), backgroundColor: '#e74c3c' } ] }; });
const stackedOptions = computed(() => { let maxY = 10; if (analyticsData.value?.categories) { const totals = Object.values(analyticsData.value.categories).map(c => (c.healthy||0)+(c.thirsty||0)+(c.critical||0)); maxY = Math.max(0, ...totals) + 1; } return { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, grid: {display:false} }, y: { stacked: true, beginAtZero: true, max: maxY, ticks: {stepSize:1, precision:0} } }, plugins: { legend: { position: 'top' } } }; });
const filteredTrees = computed(() => { if (!analyticsData.value) return []; let result = analyticsData.value.allTrees.filter(t => { const matchesSearch = t.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || (t.category && t.category.toLowerCase().includes(searchTerm.value.toLowerCase())) || t.status.toLowerCase().includes(searchTerm.value.toLowerCase()) || t.city.toLowerCase().includes(searchTerm.value.toLowerCase()); const matchesCategory = activeFilters.value.category ? t.category === activeFilters.value.category : true; const matchesCity = activeFilters.value.city ? t.city === activeFilters.value.city : true; return matchesSearch && matchesCategory && matchesCity; }); return result.sort((a, b) => { let valA = a[sortKey.value]; let valB = b[sortKey.value]; if (sortKey.value === 'status') { const statusWeight = { 'critical': 1, 'thirsty': 2, 'healthy': 3 }; return ((statusWeight[valA]||0) - (statusWeight[valB]||0)) * sortOrder.value; } if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); if (valA < valB) return -1 * sortOrder.value; if (valA > valB) return 1 * sortOrder.value; return 0; } return (valA - valB) * sortOrder.value; }); });

// --- NAVIGAZIONE ---
const openDetail = (treeId) => {
  console.log("Navigazione verso dettaglio albero:", treeId); // Debug
  router.push(`/admin/tree/${treeId}`);
};

onMounted(fetchAnalytics);
</script>

<template>
  <div class="analytics-page">
    <div class="header-row">
      <div><h1>🎛️ Control Room</h1><p>Panoramica completa dell'ecosistema urbano.</p></div>
      <button class="btn-back" @click="$router.push('/')">↩ Torna alla Dashboard</button>
    </div>

    <div v-if="errorMsg" class="error-box">⚠️ {{ errorMsg }}</div>

    <div v-else-if="analyticsData" class="grid-layout">
      <div class="kpi-card"><h3>Totale Piante</h3><span class="val">{{ analyticsData.totalTrees }}</span></div>
      <div class="kpi-card"><h3>Media Idrica</h3><span class="val blue">{{ analyticsData.avgWater }}%</span></div>
      <div class="kpi-card"><h3>Criticità</h3><span class="val red">{{ analyticsData.criticalTrees }}</span></div>
      <div class="kpi-card"><h3>In Salute</h3><span class="val green">{{ analyticsData.healthyTrees }}</span></div>
      <div class="chart-card"><h3>Stato Salute (Globale)</h3><div class="chart-wrapper"><Doughnut :data="statusChartData" :options="{ responsive: true, maintainAspectRatio: false }" /></div></div>
      <div class="chart-card"><h3>Dettaglio per Categoria</h3><div class="chart-wrapper"><Bar :data="categoryChartData" :options="stackedOptions" /></div></div>

      <div class="table-card full-width">
        <div class="table-header">
          <h3>📂 Database Piante</h3>
          <input v-model="searchTerm" placeholder="🔍 Cerca..." class="search-input" />
        </div>
        
        <div class="table-container" ref="tableRef">
          <table>
            <thead>
              <tr>
                <th @click="sortBy('name')" class="sortable">Nome <span v-if="sortKey==='name'">{{sortOrder===1?'🔼':'🔽'}}</span></th>
                <th><div class="th-flex"><span>Tipo</span><select v-model="activeFilters.category" class="mini-select" @click.stop><option :value="null">Tutti</option><option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option></select></div></th>
                <th @click="sortBy('status')" class="sortable">Stato <span v-if="sortKey==='status'">{{sortOrder===1?'🔼':'🔽'}}</span></th>
                <th @click="sortBy('waterLevel')" class="sortable">H2O % <span v-if="sortKey==='waterLevel'">{{sortOrder===1?'🔼':'🔽'}}</span></th>
                <th><div class="th-flex"><span>Città</span><select v-model="activeFilters.city" class="mini-select" @click.stop><option :value="null">Tutte</option><option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option></select></div></th>
                <th>Andamento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tree in filteredTrees" :key="tree._id" class="table-row">
                <td><strong>{{ tree.name }}</strong></td>
                <td><span class="badge-cat">{{ tree.category || 'tree' }}</span></td>
                <td><span class="status-dot" :class="tree.status"></span> {{ tree.status }}</td>
                <td>
                  <div class="mini-bar-bg"><div class="mini-bar-fill" :style="{ width: tree.waterLevel + '%', background: tree.waterLevel < 30 ? '#e74c3c' : '#2ecc71' }"></div></div>
                  <strong :class="{ 'red-text': tree.waterLevel < 30 }">{{ Math.round(tree.waterLevel) }}%</strong>
                </td>
                <td class="city-text">
                  <span v-if="tree.city === '⏳ ...'" class="loading-pulse">⏳ ...</span>
                  <span v-else>📍 {{ tree.city }}</span>
                </td>
                <td class="sparkline-cell" @click="openDetail(tree._id)" title="Clicca per i dettagli">
                  <div class="spark-wrapper">
                    <svg width="100" height="30" class="sparkline">
                      <line x1="0" y1="15" x2="100" y2="15" stroke="#eee" stroke-width="1" />
                      <polyline :points="getSparklinePoints(tree.history)" fill="none" :stroke="tree.status === 'critical' ? '#e74c3c' : '#3498db'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="hover-hint">🔍</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-else class="loading-state"><div class="spinner"></div><p>Caricamento dati...</p></div>
  </div>
</template>

<style scoped>
/* STESSO CSS DI PRIMA */
.analytics-page { padding: 40px; padding-top: 10px; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif; color: #2c3e50; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
.header-row h1 { margin: 0; font-size: 2rem; color: #8e44ad; }
.btn-back { background: #ecf0f1; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; color: #7f8c8d; }
.btn-back:hover { background: #bdc3c7; color: white; }
.error-box { background: #fdedec; color: #c0392b; padding: 20px; border-radius: 8px; border: 1px solid #e74c3c; text-align: center; font-weight: bold; }
.grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.full-width { grid-column: span 4; }
.kpi-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; border: 1px solid #eee; }
.kpi-card .val { font-size: 2.2rem; font-weight: 800; color: #2c3e50; }
.kpi-card .val.green { color: #2ecc71; } .kpi-card .val.red { color: #e74c3c; } .kpi-card .val.blue { color: #3498db; }
.chart-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); grid-column: span 2; display: flex; flex-direction: column; border: 1px solid #eee; }
.chart-wrapper { flex: 1; min-height: 250px; position: relative; }
.table-card { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee; }
.table-header { padding: 15px 20px; background: #f9f9f9; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.search-input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; width: 250px; outline: none; }
.table-container { max-height: 400px; overflow-y: auto; scroll-behavior: smooth; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 12px 20px; background: #fff; position: sticky; top: 0; color: #95a5a6; font-size: 0.75rem; text-transform: uppercase; border-bottom: 2px solid #f0f0f0; z-index: 10; user-select: none; }
th.sortable { cursor: pointer; transition: background 0.2s; }
th.sortable:hover { background: #f1f2f6; color: #2c3e50; }
.th-flex { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mini-select { padding: 3px 6px; border-radius: 4px; border: 1px solid #ccc; font-size: 0.75rem; color: #2c3e50; background: white; cursor: pointer; outline: none; font-family: inherit; font-weight: bold; }
.mini-select:hover { border-color: #3498db; }
td { padding: 12px 20px; border-bottom: 1px solid #f9f9f9; font-size: 0.9rem; color: #34495e; vertical-align: middle; }
.badge-cat { background: #eafaf1; color: #27ae60; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
.status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
.status-dot.healthy { background: #2ecc71; } .status-dot.thirsty { background: #f1c40f; } .status-dot.critical { background: #e74c3c; }
.mini-bar-bg { width: 80px; height: 6px; background: #eee; border-radius: 3px; display: inline-block; margin-right: 10px; vertical-align: middle; }
.mini-bar-fill { height: 100%; border-radius: 3px; }
.red-text { color: #e74c3c; font-weight: bold; }
.city-text { font-weight: 500; color: #8e44ad; }
.loading-pulse { font-style: italic; color: #95a5a6; animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
.loading-state { text-align: center; padding: 50px; color: #95a5a6; }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #8e44ad; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* STILE CELLA CLICCABILE */
.sparkline-cell { cursor: pointer; transition: background 0.2s; position: relative; }
.sparkline-cell:hover { background: #f8f9fa; }
.spark-wrapper { position: relative; display: inline-block; }
.hover-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; font-size: 1.2rem; transition: opacity 0.2s; pointer-events: none; }
.sparkline-cell:hover .hover-hint { opacity: 1; }
.sparkline-cell:hover .sparkline { opacity: 0.3; }
.sparkline { display: block; }
</style>