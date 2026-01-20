<script setup>
import { ref, computed } from 'vue';
import TreeMap from '../components/TreeMap.vue';
import MyForest from '../components/MyForest.vue';
import Leaderboard from '../components/Leaderboard.vue';
import BadgeList from '../components/BadgeList.vue';
import AdminPanel from '../components/AdminPanel.vue';

const props = defineProps(['user', 'trees', 'weather', 'isConnected']);
const emit = defineEmits(['water', 'force-water', 'ask-ai', 'adopt']);

const sidebarTab = ref('leaderboard');
const treeMapRef = ref(null);

const isAdmin = computed(() => props.user?.role === 'city_manager');
const canInteract = computed(() => props.user && (props.user.role === 'green_guardian' || props.user.role === 'city_manager'));

const myAdoptedTrees = computed(() => {
  if (!props.user || !props.trees) return [];
  const adoptedIds = props.user.adoptedTrees || [];
  return props.trees.filter(t => adoptedIds.includes(t._id));
});

const handleFocusMap = (tree) => { if (treeMapRef.value) treeMapRef.value.flyToTree(tree); };
</script>

<template>
  <div class="main-layout">
    
    <div class="content-column">
      
      <div class="section-block top-row-grid">
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

          <div class="dashboard-card weather-card" :class="weather">
            <div class="weather-icon">
              <span v-if="weather === 'sunny'">☀️</span>
              <span v-if="weather === 'cloudy'">☁️</span>
              <span v-if="weather === 'rainy'">🌧️</span>
            </div>
            <div class="weather-info">
              <h3>{{ weather === 'sunny' ? 'Soleggiato' : weather === 'cloudy' ? 'Nuvoloso' : 'Pioggia' }}</h3>
              <small v-if="weather === 'rainy'">Auto-Innaffio</small><small v-else>Stabile</small>
            </div>
          </div>
        </div>

        <div class="badges-container">
          <BadgeList :user="user" class="full-height-badge" />
        </div>
      </div>

      <div v-if="isAdmin" class="section-block full-width-block">
        <AdminPanel />
      </div>

      <div class="section-block full-width-block">
        <TreeMap 
          ref="treeMapRef" 
          :trees="trees" 
          :user="user"
          @water-action="(id) => emit('water', id)" 
          @adopt-action="(id) => emit('adopt', id)"
        /> 
      </div>
      
      <div class="section-block">
        <div class="separator">👇 STATO FORESTA 👇</div>
        <div class="grid">
          <div v-for="tree in trees" :key="tree._id" class="card" :class="tree.status">
            <div class="card-header"><h3>{{ tree.name }}</h3></div>
            <div class="progress-container">
              <div class="progress-bar"><div class="fill" :style="{ width: tree.waterLevel + '%' }"></div></div>
              <small>{{ Math.round(tree.waterLevel) }}%</small>
            </div>
            <div class="actions">
              <button class="std-btn" @click="emit('water', tree._id)" :disabled="!canInteract || tree.waterLevel >= 100" :class="{ 'btn-disabled': !canInteract }">
                {{ canInteract ? 'Azione' : '🔒 Solo Guardian' }}
              </button>
              <button @click="emit('ask-ai', tree)" class="btn-ai">🤖 AI</button>
            </div>
            <div v-if="isAdmin" class="debug-controls">
              <div class="debug-buttons">
                <button class="btn-debug minus" @click="emit('force-water', {id: tree._id, amt: -20})">-</button>
                <button class="btn-debug plus" @click="emit('force-water', {id: tree._id, amt: 20})">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div> 

    <aside class="sidebar-column">
      <div class="sticky-sidebar">
        <div class="sidebar-tabs">
          <button :class="{ active: sidebarTab === 'leaderboard' }" @click="sidebarTab = 'leaderboard'">🏆 Top 5</button>
          <button :class="{ active: sidebarTab === 'myforest' }" @click="sidebarTab = 'myforest'">🌲 I Miei Alberi</button>
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
/* REPLICA ESATTA DEL VECCHIO LAYOUT FUNZIONANTE */
.main-layout { 
  display: grid; 
  grid-template-columns: 1fr 350px; 
  gap: 30px; 
  /* 'stretch' era il valore nel vecchio file che funzionava */
  align-items: stretch; 
  position: relative; 
}

.content-column { 
  display: flex; flex-direction: column; gap: 30px; width: 100%; 
}

.sidebar-column { 
  width: 100%; height: 100%; 
}

.sticky-sidebar { 
  position: -webkit-sticky; 
  position: sticky; 
  
  /* L'UNICA DIFFERENZA COL VECCHIO FILE:
     Invece di 20px, mettiamo 90px perché ora hai un header fisso di 70px.
     Se metti 20px, finisce sotto l'header nero. */
  top: 90px; 
  
  z-index: 900; 
  height: fit-content; 
}

/* STILI STANDARD DEL VECCHIO FILE */
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
.weather-card.sunny { background: linear-gradient(135deg, #f2994a, #f2c94c); }
.weather-card.cloudy { background: linear-gradient(135deg, #bdc3c7, #2c3e50); }
.weather-card.rainy { background: linear-gradient(135deg, #373b44, #4286f4); }
.weather-icon { font-size: 2.2rem; }
.badges-container { height: 100%; }
.full-height-badge { height: 100%; display: flex; flex-direction: column; }
.sidebar-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
.sidebar-tabs button { flex: 1; padding: 10px; border: none; background: #ecf0f1; color: #7f8c8d; font-weight: bold; cursor: pointer; border-radius: 8px; }
.sidebar-tabs button.active { background: #27ae60; color: white; }
.separator { text-align: center; margin: 10px 0 20px 0; color: #95a5a6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
.card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-top: 4px solid #ccc; transition: transform 0.2s; position: relative; }
.card:hover { transform: translateY(-3px); }
.card.healthy { border-top-color: #2ecc71; } .card.thirsty { border-top-color: #f39c12; } .card.critical { border-top-color: #e74c3c; }
.progress-bar { width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px; overflow: hidden; margin: 10px 0; }
.fill { height: 100%; background: #3498db; transition: width 0.4s; }
.actions { display: flex; gap: 8px; margin-top: 15px; }
.std-btn { width: 100%; padding: 8px; border: none; background: #2ecc71; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-ai { background: #8e44ad; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; width: 40%; }
.btn-disabled { background-color: #bdc3c7 !important; cursor: not-allowed; }
.debug-controls { margin-top: 10px; border-top: 1px dashed #eee; padding-top: 5px; text-align: center; opacity: 0.7; }
.debug-buttons { display: flex; justify-content: center; gap: 5px; } 
.btn-debug { padding: 2px 8px; font-size: 0.7rem; border:none; background:#ccc; cursor:pointer;}

@media (max-width: 900px) {
  .main-layout { grid-template-columns: 1fr; } 
  .sidebar-column { display: none; }
  .top-row-grid { grid-template-columns: 1fr; }
}
</style>