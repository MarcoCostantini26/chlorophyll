<script setup>
import { ref, computed } from 'vue';
import TreeMap from '../components/TreeMap.vue';
import MyForest from '../components/MyForest.vue';
import Leaderboard from '../components/Leaderboard.vue';
import BadgeList from '../components/BadgeList.vue';
import AdminPanel from '../components/AdminPanel.vue';

// Riceviamo weatherMap (mappa completa) e weather (fallback globale)
const props = defineProps(['user', 'trees', 'weather', 'weatherMap', 'isConnected']);
const emit = defineEmits(['water', 'force-water', 'ask-ai', 'adopt']);

const sidebarTab = ref('leaderboard');
const treeMapRef = ref(null);

// LOGICA METEO CITTÀ
const currentCity = ref({ name: 'Bologna', coords: [44.4949, 11.3426] });

const handleCityChange = (newCity) => {
  currentCity.value = newCity;
};

// Calcolo Meteo Locale usando la Mappa
const localWeather = computed(() => {
  if (!props.weatherMap || !currentCity.value.name) return props.weather || 'sunny';
  return props.weatherMap[currentCity.value.name] || props.weather || 'sunny';
});

const getWeatherIcon = (w) => {
  const hour = new Date().getHours();
  const isNight = hour >= 18 || hour <= 6;
  if (w === 'rain' || w === 'rainy') return '🌧️';
  if (w === 'cloudy') return '☁️';
  return isNight ? '🌙' : '☀️';
};

const getWeatherLabel = (w) => {
  if (w === 'rain' || w === 'rainy') return 'Pioggia';
  if (w === 'cloudy') return 'Nuvoloso';
  return 'Sereno';
};

const isAdmin = computed(() => props.user?.role === 'city_manager');
const canInteract = computed(() => props.user && (props.user.role === 'green_guardian' || props.user.role === 'city_manager'));

const myAdoptedTrees = computed(() => {
  if (!props.user || !props.trees) return [];
  const adoptedIds = props.user.adoptedTrees || [];
  return props.trees.filter(t => adoptedIds.includes(t._id));
});

const handleFocusMap = (tree) => { 
  // Scrolla alla mappa
  const mapEl = document.getElementById('map-anchor');
  if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
  
  // Esegui zoom su albero
  if (treeMapRef.value) treeMapRef.value.flyToTree(tree); 
};
</script>

<template>
  <div class="main-layout">
    
    <div class="content-column">
      
      <div class="section-block top-row-grid mobile-pad">
        <div class="info-stack">
          <div class="dashboard-card user-card clickable" @click="$router.push('/profile')" title="Vai al profilo">
            <div class="user-flex">
              <div class="user-avatar">{{ user.avatar || '👤' }}</div>
              <div class="user-details">
                <h2>{{ user.username }}</h2>
                <span class="role-badge" :class="user.role">{{ user.role.replace('_', ' ') }}</span>
              </div>
              <div class="edit-hint">✏️</div>
            </div>
            <div v-if="user.role !== 'public_monitor'" class="user-xp-section">
              <div class="xp-header"><span>Lvl <strong>{{ user.level }}</strong></span><small>{{ user.xp }} XP</small></div>
              <div class="xp-bar"><div class="xp-fill" :style="{ width: (user.xp % 100) + '%' }"></div></div>
            </div>
          </div>

          <div 
            class="dashboard-card weather-card clickable" 
            :class="localWeather" 
            @click="$router.push({ 
              path: '/weather', 
              query: { 
                lat: currentCity.coords[0], 
                lng: currentCity.coords[1], 
                name: currentCity.name 
              } 
            })"
            :title="'Guarda previsioni a ' + currentCity.name"
          >
            <div class="weather-icon">
              <span>{{ getWeatherIcon(localWeather) }}</span>
            </div>
            <div class="weather-info">
              <h3>{{ getWeatherLabel(localWeather) }}</h3>
              <small>Meteo su {{ currentCity.name }}</small>
            </div>
          </div>
        </div>

        <div class="badges-container">
          <BadgeList :user="user" class="full-height-badge" />
        </div>
      </div>

      <div v-if="isAdmin" class="section-block full-width-block mobile-pad">
        <AdminPanel />
      </div>

      <div id="map-anchor" class="section-block full-width-block map-section">
        <TreeMap 
          ref="treeMapRef" 
          :trees="trees" 
          :user="user"
          @water-action="(id) => emit('water', id)" 
          @adopt-action="(id) => emit('adopt', id)"
          @city-changed="handleCityChange"
        /> 
      </div>
      
    </div> 

    <aside class="sidebar-column mobile-pad">
      <div class="sticky-sidebar">
        <div class="sidebar-tabs">
          <button :class="{ active: sidebarTab === 'leaderboard' }" @click="sidebarTab = 'leaderboard'">🏆 Top 5</button>
          <button :class="{ active: sidebarTab === 'myforest' }" @click="sidebarTab = 'myforest'">🌲 Le mie piante</button>
        </div>

        <Leaderboard v-if="sidebarTab === 'leaderboard'" />
        <MyForest 
          v-if="sidebarTab === 'myforest'" 
          :myTrees="myAdoptedTrees"
          @water="(id) => emit('water', id)"
          @focus-map="handleFocusMap"
        />
      </div>
    </aside>

  </div>
</template>

<style scoped>
/* LAYOUT BASE */
.main-layout { display: grid; grid-template-columns: 1fr 350px; gap: 30px; align-items: stretch; position: relative; }
.content-column { display: flex; flex-direction: column; gap: 30px; width: 100%; min-width: 0; }
.sidebar-column { width: 100%; height: 100%; }
.sticky-sidebar { position: -webkit-sticky; position: sticky; top: 90px; z-index: 900; height: fit-content; }

.top-row-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; width: 100%; }
.full-width-block { width: 100%; }
.info-stack { display: flex; flex-direction: column; gap: 10px; }

/* STILI CARDS */
.dashboard-card { background: white; border-radius: 12px; padding: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f0f2f5; flex: 1; }
.user-card.clickable { cursor: pointer; transition: transform 0.2s; position: relative; }
.user-card.clickable:hover { transform: translateY(-3px); border-color: #2ecc71; }
.user-flex { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; }
.user-avatar { font-size: 1.8rem; width: 45px; height: 45px; background: #f0f2f5; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.user-details h2 { margin: 0; font-size: 1.1rem; color: #2c3e50; }
.role-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.65rem; color: white; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 2px; }
.role-badge.green_guardian { background: #27ae60; } .role-badge.city_manager { background: #8e44ad; } .role-badge.public_monitor { background: #95a5a6; }
.xp-header { display: flex; justify-content: space-between; font-size: 0.8rem; color: #7f8c8d; margin-bottom: 4px; }
.xp-bar { width: 100%; height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
.xp-fill { height: 100%; background: #f1c40f; transition: width 0.5s ease-out; }

.weather-card { display: flex; align-items: center; gap: 15px; color: white; border: none; justify-content: center; min-height: 70px; }
.weather-card.clickable { cursor: pointer; transition: transform 0.2s; }
.weather-card.clickable:hover { transform: scale(1.02); }
.weather-card.sunny { background: linear-gradient(135deg, #f2994a, #f2c94c); }
.weather-card.cloudy { background: linear-gradient(135deg, #bdc3c7, #2c3e50); }
.weather-card.rainy { background: linear-gradient(135deg, #373b44, #4286f4); }
.weather-icon { font-size: 2.2rem; }

.badges-container { height: 100%; }
.full-height-badge { height: 100%; display: flex; flex-direction: column; }

.map-section { border-radius: 12px; overflow: hidden; }

/* GRIGLIA ALBERI */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-top: 4px solid #ccc; transition: transform 0.2s; position: relative; }
.card:hover { transform: translateY(-3px); }
.card.healthy { border-top-color: #2ecc71; } .card.thirsty { border-top-color: #f39c12; } .card.critical { border-top-color: #e74c3c; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header h3 { margin: 0; font-size: 1.1rem; }
.btn-chart-mini { background: #f0f2f5; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 1.1rem; transition: background 0.2s; }
.btn-chart-mini:hover { background: #dcdde1; }
.progress-bar { width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.4s; }
.actions { display: flex; gap: 8px; margin-top: 15px; }
.std-btn { width: 100%; padding: 8px; border: none; background: #2ecc71; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-ai { background: #8e44ad; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; width: 40%; }
.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }

.separator { text-align: center; margin: 10px 0 20px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
.debug-controls { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 5px; text-align: center; opacity: 0.7; }
.debug-buttons { display: flex; justify-content: center; gap: 5px; } 
.btn-debug { padding: 2px 8px; font-size: 0.7rem; border:none; background:#ccc; cursor:pointer;}

.sidebar-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
.sidebar-tabs button { flex: 1; padding: 10px; border: none; background: #ecf0f1; color: #7f8c8d; font-weight: bold; cursor: pointer; border-radius: 8px; }
.sidebar-tabs button.active { background: #27ae60; color: white; }

/* --- MOBILE RESPONSIVE FIX (Cruciale) --- */
@media (max-width: 900px) { 
  .main-layout { 
    display: flex; 
    flex-direction: column; 
    gap: 0; /* Gap gestito dai padding */
  } 
  
  .sidebar-column { 
    display: block !important; /* Forza visibilità */
    width: 100%; 
    order: 10; /* Sposta in fondo */
  } 
  .sticky-sidebar { position: static; }

  .top-row-grid { 
    display: flex; 
    flex-direction: column; 
    gap: 15px;
  } 

  /* MAPPA FULL WIDTH */
  .map-section {
    width: 100%;
    margin-top: 20px;
    margin-bottom: 20px;
    border-radius: 0;
  }

  /* PADDING MANUALE PER TUTTO IL RESTO */
  .mobile-pad {
    padding: 0 20px;
    margin-bottom: 20px; /* Spazio verticale tra blocchi */
  }

  /* GRIGLIA A COLONNA SU MOBILE */
  .grid {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
}
</style>