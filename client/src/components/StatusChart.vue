<script setup>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps(['stats']);

const chartData = computed(() => ({
  labels: ['Sani ', 'Assetati ', 'Critici '],
  datasets: [{
    backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c'],
    data: [props.stats.healthyTrees, props.stats.thirstyTrees, props.stats.criticalTrees],
    borderWidth: 0, 
    hoverOffset: 10
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      position: 'right', 
      labels: { 
        color: '#2c3e50', 
        font: { size: 12, family: "'Inter', sans-serif" },
        
        // --- STILE FLAT ---
        usePointStyle: true,      // Usa forme geometriche invece di rettangoli larghi
        pointStyle: 'rectRounded', // Usa un quadrato arrotondato (molto moderno)
        // Puoi usare anche 'circle', 'rect', 'triangle'
        
        padding: 20 // Spazio tra le voci
      } 
    },
    tooltip: {
      backgroundColor: '#2c3e50',
      titleColor: '#fff',
      bodyColor: '#fff',
      cornerRadius: 6,
      displayColors: false 
    }
  },
  layout: { padding: 0 }
};
</script>

<template>
  <div style="height: 180px; position: relative;">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>