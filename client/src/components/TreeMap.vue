<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';

const props = defineProps(['trees', 'user']);
const emit = defineEmits(['water-action', 'adopt-action']);

const mapContainer = ref(null);
const showHeatmap = ref(false);

let map = null;
let markersLayer = null;
let heatLayers = []; 
let markersMap = {}; 

// Icona Marker Singolo
const getIcon = (status) => {
  const color = status === 'healthy' ? '#2ecc71' : status === 'thirsty' ? '#f1c40f' : '#e74c3c';
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

// Funzione per creare l'icona del CLUSTER (Cerchietto con numero)
// Controlla la salute degli alberi all'interno per decidere il colore
const createClusterIcon = (cluster) => {
  const children = cluster.getAllChildMarkers();
  let hasCritical = false;
  let hasThirsty = false;

  // Analizziamo i figli per vedere se ce n'è uno malato
  for (let i = 0; i < children.length; i++) {
    const status = children[i].treeStatus; // Leggiamo lo status salvato nel marker
    if (status === 'critical') {
      hasCritical = true;
      break; // Trovato il peggiore, inutile continuare
    }
    if (status === 'thirsty') {
      hasThirsty = true;
    }
  }

  let className = 'marker-cluster-small'; // Default (Verde)
  if (hasCritical) {
    className = 'marker-cluster-large'; // Rosso (usiamo classe CSS custom sotto)
  } else if (hasThirsty) {
    className = 'marker-cluster-medium'; // Giallo
  }

  return new L.DivIcon({
    html: '<div><span>' + cluster.getChildCount() + '</span></div>',
    className: 'marker-cluster ' + className,
    iconSize: new L.Point(40, 40)
  });
};

const createPopupContent = (tree) => {
  const isAdopted = props.user && props.user.adoptedTrees && props.user.adoptedTrees.includes(tree._id);
  const barColor = tree.waterLevel < 30 ? '#e74c3c' : '#3498db';
  const headerColor = tree.status === 'healthy' ? '#2ecc71' : tree.status === 'thirsty' ? '#f1c40f' : '#e74c3c';

  return `
    <div class="popup-custom">
      <div class="popup-header" style="background: ${headerColor}"></div>
      <h3>${tree.name}</h3>
      <p>${tree.species}</p>
      <div class="bar-container">
        <div class="bar-fill" style="width:${tree.waterLevel}%; background-color:${barColor};"></div>
      </div>
      <p>Acqua: <strong>${tree.waterLevel}%</strong></p>
      <div class="actions">
         <button onclick="event.stopPropagation(); window.triggerWater('${tree._id}')" 
                 ${tree.waterLevel >= 100 ? 'disabled' : ''} 
                 class="btn-water">💧 Innaffia</button>
         <button onclick="event.stopPropagation(); window.triggerAdopt('${tree._id}')" 
                 class="btn-adopt ${isAdopted ? 'adopted' : ''}">
           ${isAdopted ? '❤️ Tuo' : '🤍 Adotta'}
         </button>
      </div>
    </div>
  `;
};

const renderMap = () => {
  if (!map) return;

  // --- 1. MODALITÀ HEATMAP ---
  if (showHeatmap.value) {
    if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
    heatLayers.forEach(l => map.removeLayer(l));
    heatLayers = [];

    // Separiamo i punti in 3 gruppi per forzare i colori corretti
    const healthyPoints = [];
    const thirstyPoints = [];
    const criticalPoints = [];

    props.trees.forEach(t => {
      const lat = Number(t.location.lat);
      const lng = Number(t.location.lng);
      // Intensità fissa a 1.0 per assicurare visibilità
      if (t.status === 'healthy') healthyPoints.push([lat, lng, 1.0]);
      if (t.status === 'thirsty') thirstyPoints.push([lat, lng, 1.0]);
      if (t.status === 'critical') criticalPoints.push([lat, lng, 1.0]);
    });

    // Parametri comuni per le macchie
    const heatOpts = { radius: 35, blur: 20, minOpacity: 0.6, maxZoom: 16, max: 1.0 };

    // Creiamo 3 layer distinti
    if (healthyPoints.length) {
      heatLayers.push(L.heatLayer(healthyPoints, { ...heatOpts, gradient: { 0.4: '#2ecc71', 1.0: '#27ae60' } }).addTo(map));
    }
    if (thirstyPoints.length) {
      heatLayers.push(L.heatLayer(thirstyPoints, { ...heatOpts, gradient: { 0.4: '#f1c40f', 1.0: '#f39c12' } }).addTo(map));
    }
    if (criticalPoints.length) {
      heatLayers.push(L.heatLayer(criticalPoints, { ...heatOpts, gradient: { 0.4: '#e74c3c', 1.0: '#c0392b' } }).addTo(map));
    }
    return;
  }

  // --- 2. MODALITÀ MARKER ---
  heatLayers.forEach(l => map.removeLayer(l));
  heatLayers = [];
  if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer);

  props.trees.forEach(tree => {
    const existingMarker = markersMap[tree._id];

    if (existingMarker) {
      // Aggiornamento
      existingMarker.setIcon(getIcon(tree.status));
      existingMarker.treeStatus = tree.status; // Importante: aggiorniamo lo stato per il cluster!
      
      const newContent = createPopupContent(tree);
      if (existingMarker.getPopup() && existingMarker.getPopup().isOpen()) {
         existingMarker._popup.setContent(newContent);
      } else {
         existingMarker.bindPopup(newContent);
      }
    } else {
      // Creazione
      const marker = L.marker([tree.location.lat, tree.location.lng], {
        icon: getIcon(tree.status)
      });
      
      marker.treeStatus = tree.status; // Salviamo lo stato dentro il marker per il cluster
      marker.bindPopup(createPopupContent(tree));
      markersMap[tree._id] = marker;
      markersLayer.addLayer(marker);
    }
  });
  
  // Forziamo il ricalcolo dei cluster per aggiornare i colori
  markersLayer.refreshClusters();
};

const initMap = () => {
  if (map) return;
  
  map = L.map(mapContainer.value).setView([44.4949, 11.3426], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19
  }).addTo(map);

  markersLayer = L.markerClusterGroup({ 
    showCoverageOnHover: false, 
    maxClusterRadius: 50,
    animate: false,
    iconCreateFunction: createClusterIcon // Qui colleghiamo la nostra funzione colori
  });
};

onMounted(() => {
  initMap();
  renderMap();
  window.triggerWater = (id) => emit('water-action', id);
  window.triggerAdopt = (id) => emit('adopt-action', id);
});

watch([showHeatmap, () => props.trees, () => props.user], () => {
  renderMap();
}, { deep: true });

onBeforeUnmount(() => {
  if (map) { map.remove(); map = null; }
  markersMap = {};
  delete window.triggerWater;
  delete window.triggerAdopt;
});
</script>

<template>
  <div class="map-wrapper">
    <button 
      class="toggle-heatmap-btn" 
      :class="{ active: showHeatmap }" 
      @click="showHeatmap = !showHeatmap"
    >
      {{ showHeatmap ? '📍 Mostra Alberi' : '🔥 Mostra Heatmap' }}
    </button>

    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<style>
/* CLUSTER COLORS FIX */
/* Sostituiamo i colori di default di Leaflet MarkerCluster */

/* Cluster Sano (Verde) - Default 'small' */
.marker-cluster-small {
  background-color: rgba(46, 204, 113, 0.6) !important;
}
.marker-cluster-small div {
  background-color: rgba(39, 174, 96, 0.8) !important;
}

/* Cluster Assetato (Giallo) - Usiamo 'medium' */
.marker-cluster-medium {
  background-color: rgba(241, 196, 15, 0.6) !important;
}
.marker-cluster-medium div {
  background-color: rgba(243, 156, 18, 0.8) !important;
}

/* Cluster Critico (Rosso) - Usiamo 'large' */
.marker-cluster-large {
  background-color: rgba(231, 76, 60, 0.6) !important;
}
.marker-cluster-large div {
  background-color: rgba(192, 57, 43, 0.8) !important;
}

/* Stili generali */
.marker-cluster span {
  color: white; 
  font-weight: bold;
  font-family: 'Inter', sans-serif;
}

/* ... STILI ESISTENTI ... */
.map-wrapper { position: relative; width: 100%; height: 500px; }
.map-container { height: 100%; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 4px solid #fff; z-index: 1; }
.toggle-heatmap-btn { position: absolute; top: 15px; right: 15px; z-index: 1000; background: white; border: 2px solid #2c3e50; color: #2c3e50; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s ease; font-family: 'Inter', sans-serif; }
.toggle-heatmap-btn:hover { transform: scale(1.05); background: #f8f9fa; }
.toggle-heatmap-btn.active { background: #e74c3c; color: white; border-color: #c0392b; box-shadow: 0 0 15px rgba(231, 76, 60, 0.5); }
.popup-custom { text-align: center; width: 200px; font-family: 'Inter', sans-serif; }
.popup-header { height: 8px; width: 120%; margin: -14px -24px 10px -24px; border-radius: 12px 12px 0 0; }
.popup-custom h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; font-weight: 700; }
.popup-custom p { margin: 4px 0; font-size: 0.85rem; color: #7f8c8d; }
.bar-container { width: 100%; height: 10px; background: #ecf0f1; border-radius: 5px; margin: 8px 0; overflow: hidden; border: 1px solid #bdc3c7; }
.bar-fill { height: 100%; transition: width 0.3s ease; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
button { flex: 1; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: transform 0.1s; }
button:active { transform: scale(0.95); }
.btn-water { background: #2ecc71; color: white; }
.btn-water:disabled { background: #bdc3c7; cursor: not-allowed; }
.btn-adopt { background: white; border: 2px solid #e74c3c !important; color: #e74c3c; }
.btn-adopt:hover { background: #fdedec; }
.btn-adopt.adopted { background: #e74c3c; color: white; }
</style>