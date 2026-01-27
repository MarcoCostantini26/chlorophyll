<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// Importiamo il componente grafico intelligente
import TreeHistoryChart from '../components/TreeHistoryChart.vue';

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

onMounted(fetchTreeDetail);
</script>

<template>
  <div class="detail-page">
    <div class="nav-header">
      <button @click="$router.push('/admin/analytics')">↩ Torna alla Tabella</button>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div> Caricamento dati...
    </div>

    <div v-else-if="tree" class="content">
      
      <div class="tree-header">
        <div class="icon-wrapper">
          {{ tree.status === 'healthy' ? '💚' : tree.status === 'thirsty' ? '💛' : '❤️' }}
        </div>
        <div class="header-text">
          <h1>{{ tree.name }}</h1>
          <p class="subtitle">{{ tree.category }} • {{ tree.species }}</p>
        </div>
        <div class="stat-badge" :class="tree.status">
          <span>Stato Attuale</span>
          <strong>{{ Math.round(tree.waterLevel) }}%</strong>
        </div>
      </div>

      <div class="chart-section">
        <TreeHistoryChart :tree="tree" />
      </div>
      
      <div class="info-section">
        <div class="info-card">
          <h4>Ultima Cura</h4>
          <p v-if="tree.lastWatered">
            {{ new Date(tree.lastWatered).toLocaleDateString() }} 
            alle {{ new Date(tree.lastWatered).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
          </p>
          <p v-else>Mai innaffiato recentemente.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.detail-page { padding: 40px; max-width: 1000px; margin: 0 auto; font-family: 'Inter', sans-serif; color: #2c3e50; }

.nav-header { margin-bottom: 20px; }
.nav-header button { background: #ecf0f1; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; color: #7f8c8d; transition: all 0.2s; }
.nav-header button:hover { background: #bdc3c7; color: white; transform: translateX(-5px); }

.loading { text-align: center; color: #95a5a6; padding: 50px; font-size: 1.2rem; }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* HEADER */
.tree-header { display: flex; align-items: center; gap: 25px; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #eee; margin-bottom: 30px; }
.icon-wrapper { font-size: 3.5rem; background: #f9f9f9; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
.header-text { flex: 1; }
.tree-header h1 { margin: 0; font-size: 2rem; color: #2c3e50; }
.subtitle { margin: 5px 0 10px 0; color: #95a5a6; text-transform: uppercase; font-size: 0.85rem; font-weight: bold; letter-spacing: 1px; }
.location-badge { display: inline-block; background: #f0f2f5; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; color: #7f8c8d; }

.stat-badge { text-align: center; background: #ebf5fb; padding: 15px 30px; border-radius: 12px; color: #3498db; min-width: 100px; }
.stat-badge span { display: block; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 5px; opacity: 0.8; }
.stat-badge strong { font-size: 2.2rem; line-height: 1; }
.stat-badge.healthy { background: #eafaf1; color: #2ecc71; }
.stat-badge.thirsty { background: #fef9e7; color: #f1c40f; }
.stat-badge.critical { background: #fdedec; color: #e74c3c; }

/* GRAFICO */
.chart-section { margin-bottom: 30px; }

/* INFO EXTRA - STILE SEMPLICE */
.info-section { margin-top: 20px; }
.info-card { background: white; padding: 25px; border-radius: 16px; border: 1px solid #eee; box-shadow: 0 2px 10px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; }
.info-card h4 { margin: 0; color: #8e44ad; font-size: 1.1rem; }

.last-care-content { display: flex; align-items: center; gap: 15px; text-align: right; }
.care-icon { font-size: 2rem; background: #ebf5fb; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.care-date { font-weight: 800; font-size: 1.1rem; color: #2c3e50; margin: 0; }
.care-time { color: #95a5a6; font-size: 0.9rem; margin: 0; }
.no-care { color: #95a5a6; font-style: italic; margin: 0; }

@media (max-width: 768px) {
  .tree-header { flex-direction: column; text-align: center; }
  .stat-badge { width: 100%; }
  .info-card { flex-direction: column; gap: 15px; text-align: center; }
  .last-care-content { flex-direction: column; text-align: center; }
}
</style>