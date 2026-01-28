<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router'; // Importa anche useRouter
import TreeMap from '../components/TreeMap.vue';
import MyForest from '../components/MyForest.vue';
import Leaderboard from '../components/Leaderboard.vue';
import BadgeList from '../components/BadgeList.vue';
import AdminPanel from '../components/AdminPanel.vue';

const props = defineProps(['user', 'trees', 'weather', 'weatherMap', 'isConnected']);
const emit = defineEmits(['water', 'force-water', 'ask-ai', 'adopt']);

const route = useRoute();
const router = useRouter(); // Serve per modificare l'URL
const sidebarTab = ref('leaderboard');
const treeMapRef = ref(null);

const currentCity = ref({ name: 'Bologna', coords: [44.4949, 11.3426] });

// --- LOGICA ZOOM MAPPA DA PARAMETRO URL (CORRETTA) ---
const checkFocusParam = () => {
  // Controlla se c'è il parametro 'focus' E se gli alberi sono caricati
  if (route.query.focus && props.trees.length > 0 && treeMapRef.value) {
    const targetId = route.query.focus;
    const targetTree = props.trees.find(t => t._id === targetId);
    
    if (targetTree) {
      console.log("📍 Zoom automatico su:", targetTree.name);
      handleFocusMap(targetTree);

      // 🔥 FIX: Rimuoviamo il parametro 'focus' dall'URL immediatamente
      // Così i futuri aggiornamenti (es. innaffiare) non ricaricheranno lo zoom
      router.replace({ query: { ...route.query, focus: undefined } });
    }
  }
};

// Controlliamo quando arrivano gli alberi (es. caricamento iniziale o refresh)
watch(() => props.trees, () => {
  nextTick(checkFocusParam);
}, { immediate: true });

// Controlliamo quando la mappa è montata
onMounted(() => {
  setTimeout(checkFocusParam, 500); 
});
// -----------------------------------------------------

const handleCityChange = (newCity) => { currentCity.value = newCity; };

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
const myAdoptedTrees = computed(() => {
  if (!props.user || !props.trees) return [];
  const adoptedIds = props.user.adoptedTrees || [];
  return props.trees.filter(t => adoptedIds.includes(t._id));
});

const handleFocusMap = (tree) => { 
  const mapEl = document.getElementById('map-anchor');
  if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
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
            @click="$router.push({ path: '/weather', query: { lat: currentCity.coords[0], lng: currentCity.coords[1], name: currentCity.name } })"
            :title="'Guarda previsioni a ' + currentCity.name"
          >
            <div class="weather-icon"><span>{{ getWeatherIcon(localWeather) }}</span></div>
            <div class="weather-info"><h3>{{ getWeatherLabel(localWeather) }}</h3><small>Meteo su {{ currentCity.name }}</small></div>
          </div>
        </div>

        <div class="badges-container"><BadgeList :user="user" class="full-height-badge" /></div>
      </div>

      <div v-if="isAdmin" class="section-block full-width-block mobile-pad"><AdminPanel /></div>

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
/* CSS ORIGINALE DASHBOARD (Invariato) */
.main-layout { display: grid; grid-template-columns: 1fr 350px; gap: 30px; align-items: stretch; position: relative; }
.content-column { display: flex; flex-direction: column; gap: 30px; width: 100%; min-width: 0; }
.sidebar-column { width: 100%; height: 100%; }
.sticky-sidebar { position: -webkit-sticky; position: sticky; top: 90px; z-index: 900; height: fit-content; }
.top-row-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; width: 100%; }
.full-width-block { width: 100%; }
.info-stack { display: flex; flex-direction: column; gap: 10px; }
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
.sidebar-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
.sidebar-tabs button { flex: 1; padding: 10px; border: none; background: #ecf0f1; color: #7f8c8d; font-weight: bold; cursor: pointer; border-radius: 8px; }
.sidebar-tabs button.active { background: #27ae60; color: white; }
@media (max-width: 900px) { 
  .main-layout { display: flex; flex-direction: column; gap: 0; } 
  .sidebar-column { display: block !important; width: 100%; order: 10; } 
  .sticky-sidebar { position: static; }
  .top-row-grid { display: flex; flex-direction: column; gap: 15px; } 
  .map-section { width: 100%; margin-top: 20px; margin-bottom: 20px; border-radius: 0; }
  .mobile-pad { padding: 0 20px; margin-bottom: 20px; }
}
</style>