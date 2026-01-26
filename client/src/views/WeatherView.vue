<script setup>
import { ref, onMounted } from 'vue';

const hourlyForecast = ref([]);
const currentData = ref(null);
const isLoading = ref(true);

const fetchForecast = async () => {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=44.4949&longitude=11.3426&current_weather=true&hourly=temperature_2m,weathercode&forecast_days=2&timezone=auto`);
    const data = await res.json();
    
    currentData.value = data.current_weather;

    const now = new Date();
    now.setMinutes(0, 0, 0); 

    const allHours = data.hourly.time.map((timeStr, i) => ({
      fullDate: new Date(timeStr),
      hour: new Date(timeStr).getHours(),
      temp: Math.round(data.hourly.temperature_2m[i]),
      code: data.hourly.weathercode[i]
    }));

    hourlyForecast.value = allHours
      .filter(h => h.fullDate >= now)
      .slice(0, 12); 
    
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

// MODIFICA QUI: La funzione ora accetta anche l'orario
const getWeatherIcon = (code, hour = new Date().getHours()) => {
  // Definiamo la notte: dalle 18:00 alle 06:00
  const isNight = hour >= 18 || hour <= 6;

  if (code <= 1) {
    // Se è sereno e è notte -> LUNA, altrimenti SOLE
    return isNight ? '🌙' : '☀️';
  }
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
      <div>
         <h1>Meteo di Oggi</h1>
         <p>📍 Bologna (Prossime 12h)</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading">Caricamento...</div>

    <div v-else class="forecast-container">
      
      <div class="current-box" v-if="currentData">
        <div class="big-icon">{{ getWeatherIcon(currentData.weathercode, new Date().getHours()) }}</div>
        <div class="big-temp">{{ Math.round(currentData.temperature) }}°C</div>
        <div class="label">Adesso</div>
      </div>

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
.weather-page { 
  padding: 40px; 
  max-width: 1200px; 
  margin: 0 auto; 
  font-family: 'Inter', sans-serif; 
  text-align: center; 
  color: #2c3e50; 
}

.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
.header button { background: #f1f2f6; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-weight: bold; color: #7f8c8d; }
.header h1 { font-size: 1.8rem; margin: 0; }
.header p { margin: 0; font-size: 0.9rem; color: #95a5a6; }

.current-box { background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 30px; border-radius: 24px; margin-bottom: 40px; box-shadow: 0 10px 20px rgba(52, 152, 219, 0.3); }
.big-icon { font-size: 4rem; margin-bottom: 5px; }
.big-temp { font-size: 3.5rem; font-weight: 800; line-height: 1; }
.label { opacity: 0.8; font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }

.hourly-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 20px; 
}

.hour-card { 
  background: white; 
  padding: 8px 20px; 
  border-radius: 12px; 
  border: 1px solid #eee; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  gap: 0px; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.03); 
}

.h-label { font-size: 0.85rem; color: #95a5a6; font-weight: bold; margin-bottom: 2px; }
.h-icon { font-size: 1.8rem; line-height: 1.2; }
.h-temp { font-weight: 800; color: #2c3e50; font-size: 1.1rem; }
</style>