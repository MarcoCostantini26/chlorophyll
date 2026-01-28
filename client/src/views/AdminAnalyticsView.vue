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
const loading = ref(true);
const tableRef = ref(null);

const sortKey = ref('waterLevel'); 
const sortOrder = ref(1); 
const activeFilters = ref({ category: null, city: null });

// --- NAVIGAZIONE ---
const openDetail = (treeId) => {
  router.push(`/admin/tree/${treeId}`);
};

const goToMap = (treeId) => {
  router.push({ path: '/', query: { focus: treeId } });
};

// --- SPARKLINES ---
const getSparklinePoints = (history) => {
  if (!history || history.length < 2) return "";
  const width = 100; 
  const height = 30; 
  const maxVal = 100;
  const data = history.slice(-15);
  const step = width / (data.length - 1 || 1);
  return data.map((point, index) => {
    const x = index * step;
    const y = height - (point.val / maxVal * height); 
    return `${x},${y}`;
  }).join(' ');
};

// --- FETCH ---
const fetchAnalytics = async () => {
  try {
    loading.value = true;
    const res = await fetch('http://localhost:3000/api/admin/analytics');
    if (!res.ok) throw new Error('Errore dati');
    const data = await res.json();
    data.allTrees = data.allTrees.map(tree => ({ ...tree, city: tree.city || 'N/D' }));
    analyticsData.value = data;
  } catch (e) { errorMsg.value = e.message; } finally { loading.value = false; }
};

// --- COMPUTED ---
const statusChartData = computed(() => { 
  if (!analyticsData.value) return { labels: [], datasets: [] }; 
  const d = analyticsData.value; 
  return { 
    labels: ['Sani', 'Assetati', 'Critici'], 
    datasets: [{ data: [d.healthyTrees, d.thirstyTrees, d.criticalTrees], backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'], borderWidth: 0 }] 
  }; 
});

const categoryChartData = computed(() => { 
  if (!analyticsData.value?.categories) return { labels: [], datasets: [] }; 
  const cats = analyticsData.value.categories; 
  const labels = Object.keys(cats).map(k => k.toUpperCase()); 
  return { 
    labels, 
    datasets: [ 
      { label: 'Sani', data: Object.values(cats).map(c => c.healthy||0), backgroundColor: '#2ecc71' }, 
      { label: 'Assetati', data: Object.values(cats).map(c => c.thirsty||0), backgroundColor: '#f1c40f' }, 
      { label: 'Critici', data: Object.values(cats).map(c => c.critical||0), backgroundColor: '#e74c3c' } 
    ] 
  }; 
});

const stackedOptions = computed(() => { 
  return { 
    responsive: true, maintainAspectRatio: false, 
    scales: { x: { stacked: true, grid: {display:false}, ticks: { color: '#bdc3c7', font: {size: 10} } }, y: { stacked: true, beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#bdc3c7' } } }, 
    plugins: { legend: { display: true, position: 'bottom', labels: { color: '#bdc3c7', boxWidth: 12, padding: 20 } } } 
  }; 
});

const uniqueCategories = computed(() => analyticsData.value ? Object.keys(analyticsData.value.categories).sort() : []);
const uniqueCities = computed(() => analyticsData.value ? [...new Set(analyticsData.value.allTrees.map(t => t.city))].sort() : []);

const filteredTrees = computed(() => {
  if (!analyticsData.value?.allTrees) return [];
  let result = analyticsData.value.allTrees.filter(t => {
    const term = searchTerm.value.toLowerCase();
    const matchesSearch = t.name.toLowerCase().includes(term) || (t.city || '').toLowerCase().includes(term);
    const matchesCategory = activeFilters.value.category ? t.category === activeFilters.value.category : true;
    const matchesCity = activeFilters.value.city ? t.city === activeFilters.value.city : true;
    return matchesSearch && matchesCategory && matchesCity;
  });
  return result.sort((a, b) => {
    let valA = a[sortKey.value]; let valB = b[sortKey.value];
    if (sortKey.value === 'status') { const weight = { 'critical': 1, 'thirsty': 2, 'healthy': 3 }; return ((weight[valA]||0) - (weight[valB]||0)) * sortOrder.value; }
    if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); if (valA < valB) return -1 * sortOrder.value; if (valA > valB) return 1 * sortOrder.value; return 0; }
    return (valA - valB) * sortOrder.value;
  });
});

const sortBy = (key) => {
  if (sortKey.value === key) sortOrder.value *= -1;
  else { sortKey.value = key; sortOrder.value = 1; }
};

onMounted(fetchAnalytics);
</script>

<template>
  <div class="analytics-page">
    
    <div class="header-block">
      <div class="header-text">
        <h1>🎛️ Control Room</h1>
        <p class="header-subtitle">Panoramica completa dell'ecosistema urbano.</p>
      </div>
      <button class="btn-back" @click="$router.push('/')">↩ Dashboard</button>
    </div>

    <div v-if="loading" class="state-msg">Caricamento...</div>
    <div v-else-if="errorMsg" class="state-msg error">⚠️ {{ errorMsg }}</div>
    
    <div v-else class="content-stack">
      
      <div class="kpi-scroller">
        <div class="kpi-card total"><span class="val">{{ analyticsData.totalTrees }}</span><span class="lbl">Totale</span></div>
        <div class="kpi-card healthy"><span class="val">{{ analyticsData.healthyTrees }}</span><span class="lbl">Sani</span></div>
        <div class="kpi-card thirsty"><span class="val">{{ analyticsData.thirstyTrees }}</span><span class="lbl">Assetati</span></div>
        <div class="kpi-card critical"><span class="val">{{ analyticsData.criticalTrees }}</span><span class="lbl">Critici</span></div>
      </div>

      <div class="charts-grid">
        <div class="card chart-card">
          <h3>Salute Globale</h3>
          <div class="chart-box">
             <Doughnut :data="statusChartData" :options="{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff', boxWidth: 10 } } } }" />
          </div>
        </div>

        <div class="card chart-card">
          <h3>Categorie</h3>
          <div class="chart-box">
            <Bar :data="categoryChartData" :options="stackedOptions" />
          </div>
        </div>
      </div>

      <div class="card list-card">
        <div class="list-header">
          <h3>Database Piante</h3>
          <div class="list-controls">
            <button v-if="activeFilters.category || activeFilters.city" class="btn-reset" @click="activeFilters = {category:null,city:null}">✖ Filtri</button>
            <input v-model="searchTerm" placeholder="🔍 Cerca..." class="search-bar" />
          </div>
        </div>

        <div class="desktop-only table-container" ref="tableRef">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-name sortable" @click="sortBy('name')">
                  Nome <span v-if="sortKey==='name'">{{sortOrder===1?'🔼':'🔽'}}</span>
                </th>
                
                <th class="col-type">
                  <div class="th-flex">
                    <span>Tipo</span>
                    <select v-model="activeFilters.category" class="mini-select" @click.stop>
                      <option :value="null">Tutti</option>
                      <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
                    </select>
                  </div>
                </th>
                
                <th class="col-city">
                  <div class="th-flex">
                    <span>Città</span>
                    <select v-model="activeFilters.city" class="mini-select" @click.stop>
                      <option :value="null">Tutte</option>
                      <option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
                    </select>
                  </div>
                </th>
                
                <th class="col-status sortable" @click="sortBy('status')">
                  Stato <span v-if="sortKey==='status'">{{sortOrder===1?'🔼':'🔽'}}</span>
                </th>
                
                <th class="col-water sortable" @click="sortBy('waterLevel')">
                  H2O <span v-if="sortKey==='waterLevel'">{{sortOrder===1?'🔼':'🔽'}}</span>
                </th>
                
                <th class="col-trend">Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tree in filteredTrees" :key="tree._id" class="table-row">
                <td class="name-cell" @click.stop="goToMap(tree._id)" title="Vai alla Mappa">
                  <strong>{{ tree.name }}</strong> 
                </td>
                <td><span class="badge-cat">{{ tree.category || 'tree' }}</span></td>
                <td>{{ tree.city }}</td>
                <td><span class="badge" :class="tree.status">{{ tree.status }}</span></td>
                <td><span :class="{ 'text-red': tree.waterLevel < 30 }">{{ tree.waterLevel }}%</span></td>
                <td class="sparkline-cell" @click="openDetail(tree._id)" title="Vedi Grafici Dettagliati">
                   <div class="spark-hover">
                     <svg width="100%" height="30" viewBox="0 0 100 30" preserveAspectRatio="none" class="sparkline-svg">
                       <polyline :points="getSparklinePoints(tree.history)" fill="none" :stroke="tree.status === 'critical' ? '#e74c3c' : '#3498db'" stroke-width="2" />
                    </svg>
                    <span class="view-label">Apri Dettaglio</span>
                   </div>
                </td>
              </tr>
              <tr v-if="filteredTrees.length === 0"><td colspan="6" class="empty-row">Nessun risultato.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-only">
          <div v-for="tree in filteredTrees" :key="tree._id" class="mobile-tree-item" @click="openDetail(tree._id)">
            <div class="item-info">
              <strong @click.stop="goToMap(tree._id)" class="mobile-name-link">{{ tree.name }} 🔗</strong>
              <span class="sub-txt">📍 {{ tree.city }} • {{ tree.category }}</span>
            </div>
            <div class="item-status" :class="tree.status"></div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-page { max-width: 1200px; margin: 0 auto; padding: 20px; color: #ecf0f1; font-family: 'Inter', sans-serif; }

.header-block { background: linear-gradient(135deg, #8e44ad, #9b59b6); padding: 25px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(142,68,173,0.3); }
.header-text h1 { margin: 0; font-size: 1.6rem; color: white; }
.header-subtitle { margin: 5px 0 0 0; color: white; font-size: 1rem; opacity: 0.9; }
.btn-back { background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }

.content-stack { display: flex; flex-direction: column; gap: 20px; }
.kpi-scroller { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; }
.kpi-card { background: #1e1e1e; min-width: 120px; flex: 1; padding: 15px; border-radius: 12px; text-align: center; border: 1px solid #333; }
.kpi-card .val { display: block; font-size: 1.8rem; font-weight: 800; }
.kpi-card .lbl { font-size: 0.7rem; color: #bdc3c7; text-transform: uppercase; }
.healthy .val { color: #2ecc71; } .thirsty .val { color: #f1c40f; } .critical .val { color: #e74c3c; } .total .val { color: #ecf0f1; }

.charts-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; }
.card { background: #1e1e1e; border: 1px solid #333; border-radius: 16px; padding: 20px; }
.card h3 { margin: 0 0 15px 0; color: #bdc3c7; font-size: 1rem; text-transform: uppercase; }
.chart-box { height: 250px; position: relative; }

.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
.list-controls { display: flex; gap: 10px; }
.search-bar { background: #2c3e50; border: 1px solid #444; color: white; padding: 8px; border-radius: 6px; width: 140px; }
.btn-reset { background: #e74c3c; border:none; color:white; padding: 5px 10px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }

.desktop-only { display: block; }
.mobile-only { display: none; }
.table-container { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 700px; table-layout: fixed; }

/* COLONNE */
.col-name { width: 25%; }
.col-type { width: 15%; }
.col-city { width: 15%; }
.col-status { width: 15%; }
.col-water { width: 10%; }
.col-trend { width: 20%; }

.admin-table th { text-align: left; color: #7f8c8d; font-size: 0.8rem; padding: 10px; border-bottom: 2px solid #333; cursor: default; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* QUI LA CLASSE SORTABLE: */
.admin-table th.sortable { cursor: pointer; transition: color 0.2s; }
.admin-table th.sortable:hover { color: #3498db; background: rgba(52, 152, 219, 0.1); }

.admin-table td { padding: 10px; border-bottom: 1px solid #2c3e50; font-size: 0.9rem; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.th-flex { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.mini-select { background: #2c3e50; color: white; border: 1px solid #444; font-size: 0.75rem; border-radius: 4px; padding: 2px; width: 100%; }

.badge { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }
.badge.healthy { color: #2ecc71; background: rgba(46,204,113,0.1); } .badge.thirsty { color: #f1c40f; background: rgba(241,196,15,0.1); } .badge.critical { color: #e74c3c; background: rgba(231,76,60,0.1); }
.badge-cat { background: #34495e; color: #bdc3c7; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; }
.text-red { color: #e74c3c; font-weight: bold; }
.empty-row { text-align: center; color: #7f8c8d; padding: 20px; font-style: italic; }

.name-cell { cursor: pointer; color: #9b59b6; transition: color 0.2s; }
.name-cell:hover { color: #e056fd; text-decoration: underline; }

.sparkline-cell { cursor: pointer; position: relative; height: 40px; padding: 0 !important; }
.spark-hover { width: 100%; height: 100%; display: flex; align-items: center; justify-content: flex-start; position: relative; }
.sparkline-svg { width: 100%; height: 100%; display: block; }
.view-label { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 0.7rem; color: #3498db; opacity: 0; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; pointer-events: none; transition: opacity 0.2s; }
.sparkline-cell:hover .view-label { opacity: 1; }
.sparkline-cell:hover svg { opacity: 0.3; }

.mobile-tree-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #252525; border-radius: 10px; margin-bottom: 8px; border: 1px solid #333; cursor: pointer; }
.mobile-name-link { color: #9b59b6; cursor: pointer; text-decoration: underline; }
.item-status { width: 12px; height: 12px; border-radius: 50%; }
.item-status.healthy { background: #2ecc71; } .item-status.thirsty { background: #f1c40f; } .item-status.critical { background: #e74c3c; }

.state-msg { text-align: center; padding: 50px; color: #95a5a6; }
.state-msg.error { color: #e74c3c; }

@media (max-width: 768px) {
  .header-block { flex-direction: column; text-align: center; gap: 15px; }
  .charts-grid { grid-template-columns: 1fr; }
  .desktop-only { display: none; }
  .mobile-only { display: block; }
}
</style>