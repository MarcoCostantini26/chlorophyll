<script setup>
import { ref } from 'vue'; // <--- AGGIUNTO: Importiamo 'ref'
import { LMap, LTileLayer, LPopup, LCircleMarker } from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps(['trees']);
const emit = defineEmits(['water-action']);

// ORA 'zoom' È REATTIVO E MODIFICABILE
const zoom = ref(15); 
const center = [44.494887, 11.342616];

const getColor = (status) => {
  if (status === 'healthy') return '#2ecc71';
  if (status === 'thirsty') return '#f1c40f';
  if (status === 'critical') return '#e74c3c';
  return '#95a5a6';
};
</script>

<template>
  <div class="map-container">
    <l-map ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false">
      
      <l-tile-layer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        layer-type="base"
        name="OpenStreetMap"
      ></l-tile-layer>

      <l-circle-marker 
        v-for="tree in trees" 
        :key="tree._id"
        :lat-lng="[tree.location.lat, tree.location.lng]"
        :radius="12"
        :color="getColor(tree.status)"
        :fill-color="getColor(tree.status)"
        :fill-opacity="0.8"
      >
        <l-popup>
          <div class="popup-content">
            <h3>{{ tree.name }}</h3>
            <p>Specie: {{ tree.species }}</p>
            
            <div class="mini-bar">
              <div class="mini-fill" :style="{ width: tree.waterLevel + '%', background: '#3498db' }"></div>
            </div>
            <p>Acqua: {{ tree.waterLevel }}%</p>

            <button 
              @click="$emit('water-action', tree._id)" 
              :disabled="tree.waterLevel >= 100"
              class="popup-btn"
            >
              💧 Innaffia
            </button>
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
  margin-bottom: 30px;
  border: 4px solid #fff;
  z-index: 1; /* Fix per sovrapposizioni leaflet */
}

.popup-content { text-align: center; min-width: 150px; }
.popup-content h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 1rem; }
.popup-content p { margin: 2px 0; font-size: 0.8rem; color: #7f8c8d; }

.mini-bar { width: 100%; height: 6px; background: #eee; border-radius: 3px; margin: 5px 0; overflow: hidden;}
.mini-fill { height: 100%; transition: width 0.3s; }

.popup-btn {
  margin-top: 8px;
  background: #2ecc71;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  width: 100%;
}
.popup-btn:hover:not(:disabled) { background: #27ae60; }
.popup-btn:disabled { background: #ccc; cursor: not-allowed; }
</style>