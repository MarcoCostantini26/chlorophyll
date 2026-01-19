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

const getIcon = (status) => {
  const color = status === 'healthy' ? '#2ecc71' : status === 'thirsty' ? '#f1c40f' : '#e74c3c';
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const createClusterIcon = (cluster) => {
  const children = cluster.getAllChildMarkers();
  let hasCritical = false;
  let hasThirsty = false;

  for (let i = 0; i < children.length; i++) {
    const status = children[i].treeStatus; 
    if (status === 'critical') { hasCritical = true; break; }
    if (status === 'thirsty') hasThirsty = true;
  }

  let className = 'cluster-green'; 
  if (hasCritical) className = 'cluster-red';
  else if (hasThirsty) className = 'cluster-yellow';

  return new L.DivIcon({
    html: `<div><span>${cluster.getChildCount()}</span></div>`,
    className: `marker-cluster ${className}`,
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
      <div class="popup-body">
        <h3>${tree.name}</h3>
        <p>${tree.species}</p>
        <div class="bar-container">
          <div class="bar-fill" style="width:${tree.waterLevel}%; background-color:${barColor};"></div>
        </div>
        <p>Acqua: <strong class="water-val-text">${tree.waterLevel}%</strong></p>
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
    </div>
  `;
};

const renderMap = () => {
  if (!map) return;

  if (showHeatmap.value) {
    if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer);
    heatLayers.forEach(l => map.removeLayer(l));
    heatLayers = [];

    const healthyPoints = [];
    const thirstyPoints = [];
    const criticalPoints = [];

    props.trees.forEach(t => {
      const lat = Number(t.location.lat);
      const lng = Number(t.location.lng);
      if (t.status === 'healthy') healthyPoints.push([lat, lng, 1.0]);
      if (t.status === 'thirsty') thirstyPoints.push([lat, lng, 1.0]);
      if (t.status === 'critical') criticalPoints.push([lat, lng, 1.0]);
    });

    const heatOpts = { radius: 35, blur: 20, minOpacity: 0.6, maxZoom: 16, max: 1.0 };
    if (healthyPoints.length) heatLayers.push(L.heatLayer(healthyPoints, { ...heatOpts, gradient: { 0.4: '#2ecc71', 1.0: '#27ae60' } }).addTo(map));
    if (thirstyPoints.length) heatLayers.push(L.heatLayer(thirstyPoints, { ...heatOpts, gradient: { 0.4: '#f1c40f', 1.0: '#f39c12' } }).addTo(map));
    if (criticalPoints.length) heatLayers.push(L.heatLayer(criticalPoints, { ...heatOpts, gradient: { 0.4: '#e74c3c', 1.0: '#c0392b' } }).addTo(map));
    return;
  }

  heatLayers.forEach(l => map.removeLayer(l));
  heatLayers = [];
  if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer);

  props.trees.forEach(tree => {
    const existingMarker = markersMap[tree._id];
    
    if (existingMarker) {
      existingMarker.setIcon(getIcon(tree.status));
      existingMarker.treeStatus = tree.status; 

      const popup = existingMarker.getPopup();
      if (popup && popup.isOpen()) {
        const popupEl = popup.getElement(); 
        if (popupEl) {
          const barFill = popupEl.querySelector('.bar-fill');
          if (barFill) {
             barFill.style.width = `${tree.waterLevel}%`;
             barFill.style.backgroundColor = tree.waterLevel < 30 ? '#e74c3c' : '#3498db';
          }
          const valText = popupEl.querySelector('.water-val-text');
          if (valText) valText.innerText = `${tree.waterLevel}%`;

          const btnWater = popupEl.querySelector('.btn-water');
          if (btnWater) {
             if (tree.waterLevel >= 100) btnWater.setAttribute('disabled', 'disabled');
             else btnWater.removeAttribute('disabled');
          }
          
          const header = popupEl.querySelector('.popup-header');
          const headerColor = tree.status === 'healthy' ? '#2ecc71' : tree.status === 'thirsty' ? '#f1c40f' : '#e74c3c';
          if (header) header.style.background = headerColor;
          
          const btnAdopt = popupEl.querySelector('.btn-adopt');
          const isAdopted = props.user && props.user.adoptedTrees && props.user.adoptedTrees.includes(tree._id);
          if (btnAdopt) {
            btnAdopt.innerHTML = isAdopted ? '❤️ Tuo' : '🤍 Adotta';
            if (isAdopted) btnAdopt.classList.add('adopted');
            else btnAdopt.classList.remove('adopted');
          }
        }
      } else {
        existingMarker.setPopupContent(createPopupContent(tree));
      }

    } else {
      const marker = L.marker([tree.location.lat, tree.location.lng], { icon: getIcon(tree.status) });
      marker.treeStatus = tree.status;
      marker.bindPopup(createPopupContent(tree));
      markersMap[tree._id] = marker;
      markersLayer.addLayer(marker);
    }
  });
  markersLayer.refreshClusters();
};

const initMap = () => {
  if (map) return;
  map = L.map(mapContainer.value).setView([44.4949, 11.3426], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map);

  markersLayer = L.markerClusterGroup({ 
    showCoverageOnHover: false, 
    maxClusterRadius: 50, 
    // FIX 2: Rimesse le animazioni fluide
    animate: true, 
    animateAddingMarkers: true,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: createClusterIcon 
  });
};

onMounted(() => {
  initMap(); renderMap();
  window.triggerWater = (id) => emit('water-action', id);
  window.triggerAdopt = (id) => emit('adopt-action', id);
});

watch([showHeatmap, () => props.trees, () => props.user], () => renderMap(), { deep: true });

onBeforeUnmount(() => { if (map) { map.remove(); map = null; } markersMap = {}; delete window.triggerWater; delete window.triggerAdopt; });
</script>

<template>
  <div class="map-wrapper">
    <button class="toggle-heatmap-btn" :class="{ active: showHeatmap }" @click="showHeatmap = !showHeatmap">
      {{ showHeatmap ? '📍 Mostra Alberi' : '🔥 Mostra Heatmap' }}
    </button>
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<style>
/* CSS CLUSTER */
.marker-cluster-small, .cluster-green { background-color: rgba(46, 204, 113, 0.6) !important; }
.marker-cluster-small div, .cluster-green div { background-color: rgba(39, 174, 96, 0.8) !important; }
.marker-cluster-medium, .cluster-yellow { background-color: rgba(241, 196, 15, 0.6) !important; }
.marker-cluster-medium div, .cluster-yellow div { background-color: rgba(243, 156, 18, 0.8) !important; }
.marker-cluster-large, .cluster-red { background-color: rgba(231, 76, 60, 0.6) !important; }
.marker-cluster-large div, .cluster-red div { background-color: rgba(192, 57, 43, 0.8) !important; }
.marker-cluster span { color: white; font-weight: bold; font-family: 'Inter', sans-serif; }

/* MAPPA */
.map-wrapper { position: relative; width: 100%; height: 500px; }
.map-container { height: 100%; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 4px solid #fff; z-index: 1; }
.toggle-heatmap-btn { position: absolute; top: 15px; right: 15px; z-index: 1000; background: white; border: 2px solid #2c3e50; color: #2c3e50; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s ease; font-family: 'Inter', sans-serif; }
.toggle-heatmap-btn.active { background: #e74c3c; color: white; border-color: #c0392b; box-shadow: 0 0 15px rgba(231, 76, 60, 0.5); }

/* --- FIX POPUP: RESET TOTALE LEAFLET --- */
.leaflet-popup-content-wrapper { padding: 0 !important; overflow: hidden; border-radius: 12px !important; }
.leaflet-popup-content { margin: 0 !important; width: 220px !important; }

/* FIX 1: BOTTONE CHIUDI (X) */
/* Lo forziamo a essere bianco e sopra l'header colorato */
.leaflet-container a.leaflet-popup-close-button {
  color: rgb(108, 96, 96) !important;
  font-size: 24px !important;
  top: 5px !important;
  right: 5px !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  z-index: 2000;
}
.leaflet-container a.leaflet-popup-close-button:hover {
  color: #070000 !important;
}

/* LAYOUT INTERNO POPUP */
.popup-custom { text-align: center; width: 100%; font-family: 'Inter', sans-serif; }

/* Header: Altezza ridotta per lasciare spazio, ma colore pieno */
.popup-header { 
  height: 12px; /* Ridotto per non coprire troppo */
  width: 100%; 
  margin: 0;
}

.popup-body { padding: 15px; padding-top: 10px; }

.popup-custom h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; font-weight: 700; margin-top: 5px; }
.popup-custom p { margin: 4px 0; font-size: 0.85rem; color: #7f8c8d; }
.bar-container { width: 100%; height: 10px; background: #ecf0f1; border-radius: 5px; margin: 8px 0; overflow: hidden; border: 1px solid #bdc3c7; }

/* ANIMAZIONE FLUIDA */
.bar-fill { height: 100%; transition: width 0.8s ease-out, background-color 0.3s ease; }

.actions { display: flex; gap: 8px; margin-top: 12px; }

.popup-custom button { flex: 1; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: transform 0.1s; }
.popup-custom button:active { transform: scale(0.95); }

.btn-water { background: #2ecc71; color: white; }
.btn-water:disabled { background: #bdc3c7; cursor: not-allowed; }
.btn-adopt { background: white; border: 2px solid #e74c3c !important; color: #e74c3c; }
.btn-adopt:hover { background: #fdedec; }
.btn-adopt.adopted { background: #e74c3c; color: white; }
</style>