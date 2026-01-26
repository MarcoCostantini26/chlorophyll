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

const chartData = computed(() => {
  if (!tree.value || !tree.value.history) return { labels: [], datasets: [] };
  
  // Ultimi 50 punti per leggibilità
  const history = tree.value.history.slice(-50); 
  
  return {
    labels: history.map(h => new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Livello Acqua (%)',
      data: history.map(h => h.val),
      borderColor: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.2)',
      fill: true,
      tension: 0.4,
      pointRadius: 2
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, max: 100, grid: { color: '#f0f0f0' } },
    x: { grid: { display: false } }
  },
  plugins: {
    legend: { display: false }
  }
};

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
        <h3>📉 Andamento Storico (Acqua)</h3>
        <div class="chart-wrapper">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <div class="info-card">
        <h3>Dettagli Tecnici</h3>
        <ul>
          <li><strong>Coordinate:</strong> {{ tree.location.lat }}, {{ tree.location.lng }}</li>
          <li><strong>Ultima Azione Effettuata:</strong> {{ new Date(tree.lastWatered).toLocaleString() }}</li>
        </ul>
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
.chart-wrapper { height: 350px; position: relative; }

.info-card { background: #f8f9fa; padding: 25px; border-radius: 16px; border: 1px dashed #ccc; }
.info-card ul { list-style: none; padding: 0; }
.info-card li { margin-bottom: 10px; font-size: 0.95rem; }
</style>