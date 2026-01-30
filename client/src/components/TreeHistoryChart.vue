<script setup>
import { ref, computed } from 'vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps(['tree']);

const ranges = [
  { label: '1H',  hours: 1,      interval: 5,   mode: 'average' },
  { label: '3H',  hours: 3,      interval: 15,  mode: 'average' },
  { label: '6H',  hours: 6,      interval: 30,  mode: 'average' },
  { label: '12H', hours: 12,     interval: 60,  mode: 'average' },
  { label: '24H', hours: 24,     interval: 120, mode: 'average' },
  { label: '1W',  hours: 24 * 7, interval: 1440, mode: 'average' }
];

const selectedRange = ref(ranges[4]);

const getNormalizedHistory = () => {
  if (!props.tree || !props.tree.history) return [];
  const rawHistory = [...props.tree.history].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (rawHistory.length === 0) return [];

  const now = new Date();
  const startTime = new Date(now.getTime() - selectedRange.value.hours * 60 * 60 * 1000);
  const normalizedPoints = [];
  const intervalMs = selectedRange.value.interval * 60 * 1000;

  let cursor = new Date(startTime);
  if (selectedRange.value.label !== '1W') {
    cursor.setSeconds(0); cursor.setMilliseconds(0);
    cursor.setMinutes(cursor.getMinutes() - (cursor.getMinutes() % selectedRange.value.interval));
  } else cursor.setHours(0,0,0,0);

  let lastKnownVal = rawHistory.findLast(p => new Date(p.date) <= cursor)?.val ?? rawHistory[0].val;

  while (cursor <= now) {
    const nextCursor = new Date(cursor.getTime() + intervalMs);
    const pointsInInterval = rawHistory.filter(p => { const d = new Date(p.date); return d >= cursor && d < nextCursor; });

    let valueToStore = lastKnownVal;
    if (pointsInInterval.length > 0) {
      const sum = pointsInInterval.reduce((acc, curr) => acc + curr.val, 0);
      valueToStore = sum / pointsInInterval.length;
      lastKnownVal = valueToStore;
    }
    
    normalizedPoints.push({ date: new Date(cursor), val: Math.round(valueToStore) });
    cursor = nextCursor;
  }
  return normalizedPoints;
};

const chartData = computed(() => {
  const dataPoints = getNormalizedHistory();
  return {
    labels: dataPoints.map(p => selectedRange.value.label === '1W' ? p.date.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}) : p.date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})),
    datasets: [{
      label: 'Media Livello Acqua',
      data: dataPoints.map(p => p.val),
      borderColor: '#3498db',
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0,0,0,250);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)'); gradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');
        return gradient;
      },
      fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 6
    }]
  };
});

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  scales: { y: { min: 0, max: 100, grid: { color: '#f0f0f0' }, ticks: { stepSize: 20 } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0 } } },
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `Media: ${ctx.raw}%` } } }
};
</script>

<template>
  <div class="chart-wrapper">
    <div class="chart-header">
      <h4>📉 Storico (Media)</h4>
      <div class="range-selector">
        <button v-for="range in ranges" :key="range.label" :class="{ active: selectedRange.label === range.label }" @click="selectedRange = range">{{ range.label }}</button>
      </div>
    </div>
    <div class="chart-container"><Line :data="chartData" :options="chartOptions" /></div>
  </div>
</template>

<style scoped>
.chart-wrapper { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee; display: flex; flex-direction: column; height: 300px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
h4 { margin: 0; color: #7f8c8d; font-size: 0.9rem; text-transform: uppercase; }
.range-selector { display: flex; gap: 5px; background: #f0f2f5; padding: 3px; border-radius: 8px; }
.range-selector button { border: none; background: transparent; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold; color: #7f8c8d; cursor: pointer; transition: all 0.2s; }
.range-selector button:hover { color: #2c3e50; background: rgba(0,0,0,0.05); }
.range-selector button.active { background: white; color: #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.chart-container { flex: 1; position: relative; min-height: 0; }
</style>