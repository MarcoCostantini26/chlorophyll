<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const hourlyForecast = ref([]);
const currentData = ref(null);
const isLoading = ref(true);

// --- LEGGI PARAMETRI URL ---
const lat = route.query.lat || 44.4949;
const lng = route.query.lng || 11.3426;
const cityName = route.query.name || 'Bologna';

const fetchForecast = async () => {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,weathercode&forecast_days=2&timezone=auto`);
    const data = await res.json();
    
    currentData.value = data.current_weather;

    // Logica Rolling Window (12h)
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

const getWeatherIcon = (code, hour = new Date().getHours()) => {
  const isNight = hour >= 18 || hour <= 6;
  if (code <= 1) return isNight ? '🌙' : '☀️';
  if (code <= 48) return '☁️';
  if (code <= 60) return '🌦️';
  return '🌧️';
};

onMounted(fetchForecast);
</script>

<template>
  <div class="weather-page">
    <div class="header">
      <button @click="router.push('/')" class="btn-back">↩</button>
      <div class="header-info">
         <h1>{{ cityName }}</h1>
         <p>📍 {{ Number(lat).toFixed(2) }}, {{ Number(lng).toFixed(2) }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div> Caricamento...
    </div>

    <div v-else class="forecast-container">
      
      <div class="current-box" v-if="currentData">
        <div class="current-flex">
          <div class="big-icon">{{ getWeatherIcon(currentData.weathercode, new Date().getHours()) }}</div>
          <div class="temp-group">
            <div class="big-temp">{{ Math.round(currentData.temperature) }}°</div>
            <div class="label">Adesso</div>
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
/* --- STILE BASE (MOBILE) --- */
.weather-page { 
  padding: 20px 15px; /* Padding ridotto per mobile */
  width: 100%; 
  max-width: 100%; 
  font-family: 'Inter', sans-serif; 
  color: #2c3e50;
  box-sizing: border-box;
}

/* Header */
.header { 
  display: flex; 
  align-items: center; 
  gap: 15px; 
  margin-bottom: 25px; 
}
.btn-back { 
  background: white; 
  border: 2px solid #ecf0f1; 
  width: 45px; height: 45px; 
  border-radius: 50%; 
  font-size: 1.5rem; 
  cursor: pointer; 
  display: flex; align-items: center; justify-content: center;
  color: #7f8c8d;
  flex-shrink: 0;
}
.header-info h1 { font-size: 1.5rem; margin: 0; line-height: 1.2; }
.header-info p { margin: 0; font-size: 0.8rem; color: #95a5a6; }

/* Box Meteo Attuale */
.current-box { 
  background: linear-gradient(135deg, #3498db, #2980b9); 
  color: white; 
  padding: 20px; /* Meno padding */
  border-radius: 20px; 
  margin-bottom: 30px; 
  box-shadow: 0 10px 25px rgba(52, 152, 219, 0.4); 
}
.current-flex {
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.big-icon { font-size: 3.5rem; }
.temp-group { text-align: center; }
.big-temp { font-size: 3rem; font-weight: 800; line-height: 1; }
.label { opacity: 0.9; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

/* Griglia Oraria Mobile First */
.section-title { font-size: 1rem; color: #7f8c8d; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }

.hourly-grid { 
  display: grid; 
  /* Mobile: 3 colonne fisse o auto-fill stretto */
  grid-template-columns: repeat(3, 1fr); 
  gap: 10px; 
}

.hour-card { 
  background: white; 
  padding: 10px; 
  border-radius: 12px; 
  border: 1px solid #f0f2f5; 
  display: flex; flex-direction: column; align-items: center; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.02); 
}
.h-label { font-size: 0.8rem; color: #95a5a6; font-weight: bold; margin-bottom: 5px; }
.h-icon { font-size: 1.5rem; margin-bottom: 5px; }
.h-temp { font-weight: 800; color: #2c3e50; font-size: 1rem; }

/* Loading */
.loading { text-align: center; color: #7f8c8d; margin-top: 50px; font-weight: bold; }

/* --- MEDIA QUERY DESKTOP (Tablet & PC) --- */
@media (min-width: 768px) {
  .weather-page { 
    padding: 40px; 
    max-width: 1000px; 
    margin: 0 auto; 
  }

  .header h1 { font-size: 2.2rem; }
  
  .current-box { padding: 40px; }
  .big-icon { font-size: 5rem; }
  .big-temp { font-size: 4.5rem; }

  .hourly-grid { 
    /* Desktop: 6 colonne (tutte le 12 ore in 2 righe ordinate) */
    grid-template-columns: repeat(6, 1fr); 
    gap: 20px; 
  }
  
  .hour-card { padding: 15px; }
  .h-icon { font-size: 2rem; }
  .h-temp { font-size: 1.2rem; }
}
</style>