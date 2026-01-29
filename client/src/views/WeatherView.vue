<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../services/api'; // Importiamo la nostra API centralizzata

const route = useRoute();
const router = useRouter();

const hourlyForecast = ref([]);
const currentData = ref(null);
const isLoading = ref(true);

const lat = route.query.lat || 44.4949;
const lng = route.query.lng || 11.3426;
const cityName = route.query.name || 'Bologna';

const fetchForecast = async () => {
  try {
    // Usiamo il nuovo service
    const data = await api.getForecast(lat, lng);
    
    currentData.value = data.current_weather;

    // Logica Rolling Window (identica a prima)
    const now = new Date();
    now.setMinutes(0, 0, 0); 
    const allHours = data.hourly.time.map((timeStr, i) => ({
      fullDate: new Date(timeStr),
      hour: new Date(timeStr).getHours(),
      temp: Math.round(data.hourly.temperature_2m[i]),
      code: data.hourly.weathercode[i]
    }));
    hourlyForecast.value = allHours.filter(h => h.fullDate >= now).slice(0, 12); 
    
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const getWeatherIcon = (code, hour = new Date().getHours()) => {
  const isNight = hour >= 18 || hour <= 6;
  if (code <= 1) return isNight ? '🌙' : '☀️';
  if (code <= 48) return '☁️';
  if (code <= 60) return '🌦️';
  return '🌧️';
};

const currentWeatherClass = computed(() => {
  if (!currentData.value) return 'sunny';
  const code = currentData.value.weathercode;
  const isDay = currentData.value.is_day;
  if (code >= 51) return 'rainy';
  if (code > 1 && code <= 48) return 'cloudy';
  return isDay === 1 ? 'sunny' : 'night';
});

onMounted(fetchForecast);
</script>

<template>
  <div class="weather-page">
    <div class="header-block">
      <div class="header-text">
        <h1>🌦️ {{ cityName }}</h1>
        <p class="header-subtitle">📍 Lat: {{ Number(lat).toFixed(2) }}, Lng: {{ Number(lng).toFixed(2) }}</p>
      </div>
      <button class="btn-back" @click="router.push('/')">↩ Dashboard</button>
    </div>

    <div v-if="isLoading" class="loading"><div class="spinner"></div> Caricamento...</div>

    <div v-else class="forecast-container">
      <div class="current-box" v-if="currentData" :class="currentWeatherClass">
        <div class="current-flex">
          <div class="big-icon">{{ getWeatherIcon(currentData.weathercode, new Date().getHours()) }}</div>
          <div class="temp-group">
            <div class="big-temp">{{ Math.round(currentData.temperature) }}°</div>
            <div class="label">{{ currentWeatherClass }}</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Prossime 12 Ore</h3>
      <div class="hourly-grid">
        <div v-for="(h, index) in hourlyForecast" :key="index" class="hour-card">
          <span class="h-label">{{ h.hour }}:00</span>
          <span class="h-icon">{{ getWeatherIcon(h.code, h.hour) }}</span>
          <span class="h-temp">{{ h.temp }}°</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Copia lo stile originale di WeatherView.vue qui */
/* ... (Sei un esperto ormai, sai che devo risparmiare spazio, ma va incollato tutto) ... */
.weather-page { padding: 20px 15px; width: 100%; max-width: 100%; font-family: 'Inter', sans-serif; color: #2c3e50; box-sizing: border-box; }
.header-block { background: linear-gradient(135deg, #3498db, #2980b9); padding: 25px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3); }
.header-text h1 { margin: 0; font-size: 1.6rem; color: white; }
.header-subtitle { margin: 5px 0 0 0; color: white; font-size: 1rem; opacity: 0.9; }
.btn-back { background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.current-box { color: white; padding: 20px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); transition: background 0.5s ease; }
.current-box.sunny { background: linear-gradient(135deg, #f2994a, #f2c94c); box-shadow: 0 10px 25px rgba(242, 153, 74, 0.4); }
.current-box.cloudy { background: linear-gradient(135deg, #7f8c8d, #2c3e50); box-shadow: 0 10px 25px rgba(44, 62, 80, 0.4); }
.current-box.rainy { background: linear-gradient(135deg, #373b44, #4286f4); box-shadow: 0 10px 25px rgba(66, 134, 244, 0.4); }
.current-box.night { background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); box-shadow: 0 10px 25px rgba(15, 32, 39, 0.4); }
.current-flex { display: flex; align-items: center; justify-content: space-around; }
.big-icon { font-size: 3.5rem; }
.big-temp { font-size: 3rem; font-weight: 800; line-height: 1; }
.label { opacity: 0.9; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; font-weight: bold; }
.section-title { font-size: 1rem; color: #7f8c8d; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
.hourly-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.hour-card { background: white; padding: 10px; border-radius: 12px; border: 1px solid #f0f2f5; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.h-label { font-size: 0.8rem; color: #95a5a6; font-weight: bold; margin-bottom: 5px; }
.h-icon { font-size: 1.5rem; margin-bottom: 5px; }
.h-temp { font-weight: 800; color: #2c3e50; font-size: 1rem; }
.loading { text-align: center; color: #7f8c8d; margin-top: 50px; font-weight: bold; }
@media (max-width: 768px) { .header-block { flex-direction: column; text-align: center; gap: 15px; } }
@media (min-width: 768px) { .weather-page { padding: 40px; max-width: 1000px; margin: 0 auto; } .header-text h1 { font-size: 2.2rem; } .current-box { padding: 40px; } .big-icon { font-size: 5rem; } .big-temp { font-size: 4.5rem; } .hourly-grid { grid-template-columns: repeat(6, 1fr); gap: 20px; } .hour-card { padding: 15px; } .h-icon { font-size: 2rem; } .h-temp { font-size: 1.2rem; } }
</style>