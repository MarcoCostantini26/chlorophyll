<script setup>
import { ref } from 'vue';
import { LMap, LTileLayer, LPopup, LCircleMarker } from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";

// Props: 'user' serve per sapere quali alberi sono adottati
const props = defineProps(['trees', 'user']);
const emit = defineEmits(['water-action', 'adopt-action']);

const zoom = ref(15); 
const center = [44.494887, 11.342616];

const getColor = (status) => {
  if (status === 'healthy') return '#2ecc71';
  if (status === 'thirsty') return '#f1c40f';
  if (status === 'critical') return '#e74c3c';
  return '#95a5a6';
};

// Helper: Controlla se l'utente ha adottato l'albero (usando adoptedTrees CamelCase)
const isAdopted = (treeId) => {
  return props.user && 
         props.user.adoptedTrees && 
         props.user.adoptedTrees.includes(treeId);
};
</script>

<template>
  <div class="map-container">
    <l-map ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false">
      <l-tile-layer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"></l-tile-layer>
      <l-circle-marker 
        v-for="tree in trees" :key="tree._id" :lat-lng="[tree.location.lat, tree.location.lng]"
        :radius="14" :stroke="true" color="#ffffff" :weight="3" :fill-color="getColor(tree.status)" :fill-opacity="1">
        <l-popup>
          <div class="popup-content">
            <div class="popup-header" :style="{ background: getColor(tree.status) }"></div>
            <h3>{{ tree.name }}</h3>
            <p class="species">{{ tree.species }}</p>
            
            <div class="mini-bar"><div class="mini-fill" :style="{ width: tree.waterLevel + '%', background: tree.waterLevel < 30 ? '#e74c3c' : '#3498db' }"></div></div>
            <p class="water-text">Acqua: <strong>{{ tree.waterLevel }}%</strong></p>
            
            <div class="popup-actions">
              <button @click="$emit('water-action', tree._id)" :disabled="tree.waterLevel >= 100" class="popup-btn">💧 Innaffia</button>
              
              <button 
                @click="$emit('adopt-action', tree._id)" 
                class="adopt-btn"
                :class="{ 'is-adopted': isAdopted(tree._id) }"
              >
                {{ isAdopted(tree._id) ? '❤️ Tuo' : '🤍 Adotta' }}
              </button>
            </div>

          </div>
        </l-popup>
      </l-circle-marker>
    </l-map>
  </div>
</template>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border: 4px solid #fff;
  z-index: 1; 
  box-sizing: border-box;
}

.popup-content { text-align: center; min-width: 160px; overflow: hidden; }
.popup-header { height: 6px; width: 120%; margin: -15px -20px 10px -20px; }
.popup-content h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; font-weight: 800; }
.species { margin: 2px 0 10px 0; font-size: 0.8rem; color: #7f8c8d; font-style: italic; text-transform: uppercase; }
.water-text { font-size: 0.9rem; margin: 5px 0; color: #2c3e50; }
.mini-bar { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 5px 0;}
.mini-fill { height: 100%; transition: width 0.3s; }

/* STILE BOTTONI NEL POPUP */
.popup-actions { display: flex; gap: 5px; margin-top: 8px; }

.popup-btn { 
  flex: 2; 
  background: #2ecc71; color: white; border: none; 
  padding: 8px 12px; border-radius: 6px; 
  cursor: pointer; font-size: 0.9rem; font-weight: bold; 
}
.popup-btn:hover:not(:disabled) { background: #27ae60; }
.popup-btn:disabled { background: #bdc3c7; cursor: not-allowed; }

.adopt-btn { 
  flex: 1; 
  border: 1px solid #e74c3c; background: white; color: #e74c3c; 
  border-radius: 6px; cursor: pointer; font-weight: bold; 
  transition: all 0.2s; 
}
.adopt-btn:hover { background: #fdedec; }
.adopt-btn.is-adopted { background: #e74c3c; color: white; }

@media (max-width: 768px) {
  .map-container { height: 350px; }
}
</style>