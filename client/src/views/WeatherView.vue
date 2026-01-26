<script setup>
import { ref, onMounted } from 'vue';

const hourlyForecast = ref([]);
const currentData = ref(null);
const isLoading = ref(true);

const fetchForecast = async () => {
  try {
    // API Open-Meteo: Hourly (temperature, weathercode) per 1 giorno
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=44.4949&longitude=11.3426&current_weather=true&hourly=temperature_2m,weathercode&forecast_days=1&timezone=auto`);
    const data = await res.json();
    
    currentData.value = data.current_weather;

    // Prendiamo le prossime 24 ore dall'ora attuale
    const nowHour = new Date().getHours();
    
    hourlyForecast.value = data.hourly.time.map((time, i) => ({
      hour: new Date(time).getHours(),
      temp: Math.round(data.hourly.temperature_2m[i]),
      code: data.hourly.weathercode[i]
    })).filter(h => h.hour >= nowHour).slice(0, 12); // Mostra le prossime 12 ore per pulizia
    
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const getWeatherIcon = (code) => {
  if (code <= 1) return '☀️';
  if (code <= 48) return '☁️';
  if (code <= 60) return '🌦️';
  return '🌧️';
};

onMounted(fetchForecast);
</script>

<template>
  <div class="weather-page">
    <div class="header">
      <button @click="$router.push('/')">↩ Home</button>
      <h1>Meteo di Oggi</h1>
      <p>📍 Bologna (Prossime 12h)</p>
    </div>

    <div v-if="isLoading" class="loading">Caricamento...</div>

    <div v-else class="forecast-container">
      <div class="current-box" v-if="currentData">
        <div class="big-icon">{{ getWeatherIcon(currentData.weathercode) }}</div>
        <div class="big-temp">{{ Math.round(currentData.temperature) }}°C</div>
        <div class="label">Adesso</div>
      </div>

      <div class="hourly-grid">
        <div v-for="h in hourlyForecast" :key="h.hour" class="hour-card">
          <span class="h-label">{{ h.hour }}:00</span>
          <span class="h-icon">{{ getWeatherIcon(h.code) }}</span>
          <span class="h-temp">{{ h.temp }}°</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weather-page { padding: 30px; max-width: 600px; margin: 0 auto; font-family: 'Inter', sans-serif; text-align: center; color: #2c3e50; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
.header button { background: #f1f2f6; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #7f8c8d; }
.header h1 { font-size: 1.5rem; margin: 0; }
.header p { margin: 0; font-size: 0.8rem; color: #95a5a6; }

.current-box { background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 30px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3); }
.big-icon { font-size: 4rem; margin-bottom: 10px; }
.big-temp { font-size: 3rem; font-weight: 800; }
.label { opacity: 0.8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }

.hourly-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; }
.hour-card { background: white; padding: 15px 5px; border-radius: 12px; border: 1px solid #eee; display: flex; flex-direction: column; align-items: center; gap: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.h-label { font-size: 0.8rem; color: #95a5a6; font-weight: bold; }
.h-icon { font-size: 1.5rem; }
.h-temp { font-weight: bold; color: #2c3e50; }
</style>