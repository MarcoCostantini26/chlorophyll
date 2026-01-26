<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const route = useRoute();
const router = useRouter();
const tree = ref(null);
const isLoading = ref(true);

// 1. STATO PER IL RANGE DI TEMPO (Default 24h)
const timeRange = ref('24h'); 

const fetchTreeDetail = async () => {
  try {
    const res = await fetch(`http://localhost:3000/api/trees/${route.params.id}`);
    if (!res.ok) throw new Error('Albero non trovato');
    tree.value = await res.json();
  } catch (e) {
    console.error(e);
    alert("Errore nel caricamento dei dati.");
    router.push('/admin/analytics');
  } finally {
    isLoading.value = false;
  }
};

// 2. DATA FORMATTING INTELLIGENTE
const chartData = computed(() => {
  if (!tree.value || !tree.value.history) return { labels: [], datasets: [] };
  
  const now = new Date();
  let startTime = new Date();

  // Calcola il punto di partenza
  switch (timeRange.value) {
    case '1h': startTime.setHours(now.getHours() - 1); break;
    case '3h': startTime.setHours(now.getHours() - 3); break;
    case '6h': startTime.setHours(now.getHours() - 6); break;
    case '12h': startTime.setHours(now.getHours() - 12); break;
    case '24h': startTime.setHours(now.getHours() - 24); break;
    case '1w': startTime.setDate(now.getDate() - 7); break;
    default: startTime.setHours(now.getHours() - 24);
  }

  // Filtra
  const filteredHistory = tree.value.history.filter(h => new Date(h.date) >= startTime);

  // Formatta le etichette in base al range
  const labels = filteredHistory.map(h => {
    const date = new Date(h.date);
    // Se stiamo guardando la settimana, mostra Giorno/Mese (es. 25/01)
    if (timeRange.value === '1w') {
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
    }
    // Altrimenti mostra solo l'ora (es. 14:30)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  return {
    labels: labels,
    datasets: [{
      label: 'Livello Acqua (%)',
      data: filteredHistory.map(h => h.val),
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.2)',
      fill: true,
      tension: 0.3,
      
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#3498db',
      pointBorderWidth: 2
    }]
  };
});

// 3. OPZIONI DINAMICHE PER SISTEMARE GLI INTERVALLI
const chartOptions = computed(() => {
  
  // Definiamo quante tacche (etichette) mostrare al massimo per non affollare
  let limitTicks = 12; // Default

  switch (timeRange.value) {
    case '1h': limitTicks = 6; break;  // Una ogni ~10 min
    case '3h': limitTicks = 6; break;  // Una ogni ~30 min
    case '6h': limitTicks = 6; break;  // Una ogni 1 ora
    case '12h': limitTicks = 6; break; // Una ogni 2 ore
    case '24h': limitTicks = 8; break; // Una ogni 3 ore
    case '1w': limitTicks = 7; break;  // Una al giorno
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: '#f0f0f0' } },
      x: { 
        grid: { display: false },
        ticks: {
          maxTicksLimit: limitTicks, // <--- QUI LA MAGIA
          maxRotation: 0,
          autoSkip: true
        }
      }
    },
    plugins: { 
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };
});

onMounted(fetchTreeDetail);
</script>

<template>
  <div class="detail-page">
    <div class="nav-header">
      <button @click="$router.push('/admin/analytics')">↩ Torna alla Tabella</button>
    </div>

    <div v-if="isLoading" class="loading">Caricamento grafico...</div>

    <div v-else-if="tree" class="content">
      <div class="tree-header">
        <div class="icon-wrapper">{{ tree.status === 'healthy' ? '💚' : tree.status === 'thirsty' ? '💛' : '❤️' }}</div>
        <div>
          <h1>{{ tree.name }}</h1>
          <p class="subtitle">{{ tree.category }} • {{ tree.species }}</p>
        </div>
        <div class="stat-badge">
          <span>Attuale</span>
          <strong>{{ Math.round(tree.waterLevel) }}%</strong>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header-row">
          <h3>📉 Andamento Storico (Acqua)</h3>
          
          <div class="range-selector">
            <button :class="{ active: timeRange === '1h' }" @click="timeRange = '1h'">1h</button>
            <button :class="{ active: timeRange === '3h' }" @click="timeRange = '3h'">3h</button>
            <button :class="{ active: timeRange === '6h' }" @click="timeRange = '6h'">6h</button>
            <button :class="{ active: timeRange === '12h' }" @click="timeRange = '12h'">12h</button>
            <button :class="{ active: timeRange === '24h' }" @click="timeRange = '24h'">24h</button>
            <button :class="{ active: timeRange === '1w' }" @click="timeRange = '1w'">1w</button>
          </div>
        </div>

        <div class="chart-wrapper">
          <Line :data="chartData" :options="chartOptions" />
          <div v-if="chartData.labels.length === 0" class="no-data-msg">
            Nessun dato registrato in questo periodo.
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.detail-page { padding: 40px; max-width: 900px; margin: 0 auto; font-family: 'Inter', sans-serif; color: #2c3e50; }
.nav-header { margin-bottom: 20px; }
.nav-header button { background: #ecf0f1; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; color: #7f8c8d; }
.nav-header button:hover { background: #bdc3c7; color: white; }

.tree-header { display: flex; align-items: center; gap: 20px; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 30px; }
.icon-wrapper { font-size: 3rem; background: #f9f9f9; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.tree-header h1 { margin: 0; font-size: 1.8rem; }
.subtitle { margin: 5px 0 0 0; color: #95a5a6; text-transform: uppercase; font-size: 0.8rem; font-weight: bold; }
.stat-badge { margin-left: auto; text-align: center; background: #ebf5fb; padding: 15px 25px; border-radius: 12px; color: #3498db; }
.stat-badge span { display: block; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px; }
.stat-badge strong { font-size: 2rem; }

.chart-card { background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eee; margin-bottom: 30px; }
.chart-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.chart-header-row h3 { margin: 0; }

.range-selector { display: flex; gap: 5px; background: #f1f2f6; padding: 4px; border-radius: 8px; }
.range-selector button { border: none; background: transparent; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #7f8c8d; transition: all 0.2s; }
.range-selector button:hover { color: #2c3e50; background: rgba(0,0,0,0.05); }
.range-selector button.active { background: white; color: #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

.chart-wrapper { height: 350px; position: relative; }
.no-data-msg { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #95a5a6; font-style: italic; }

.info-card { background: #f8f9fa; padding: 25px; border-radius: 16px; border: 1px dashed #ccc; }
.info-card ul { list-style: none; padding: 0; }
.info-card li { margin-bottom: 10px; font-size: 0.95rem; }
</style>