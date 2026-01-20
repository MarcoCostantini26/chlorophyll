<script setup>
import { ref, onMounted, watch, onBeforeUnmount, defineExpose } from 'vue';
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

// --- CONFIGURAZIONE LOGICA ---
const getPlantConfig = (category) => {
  const cat = category || 'tree';
  if (['hedge', 'bush'].includes(cat)) {
    return { actionLabel: '✂️ Pota', statusLabel: 'Ordine', emoji: cat === 'hedge' ? '✂️' : '🌾', typeLabel: cat === 'hedge' ? 'Siepe' : 'Cespuglio', barColorLow: '#d35400', barColorHigh: '#27ae60' };
  }
  if (cat === 'potted') {
    return { actionLabel: '🍂 Concima', statusLabel: 'Terreno', emoji: '🏺', typeLabel: 'Fioriera', barColorLow: '#8e44ad', barColorHigh: '#9b59b6' };
  }
  if (cat === 'succulent') {
    return { actionLabel: '🧹 Pulisci', statusLabel: 'Igiene', emoji: '🌵', typeLabel: 'Pianta Grassa', barColorLow: '#7f8c8d', barColorHigh: '#1abc9c' };
  }
  const labels = { tree: { label: 'Albero', emoji: '🌲' }, flowerbed: { label: 'Aiuola', emoji: '🌻' }, vertical_garden: { label: 'Giardino Vert.', emoji: '🧱' } };
  const info = labels[cat] || labels['tree'];
  return { actionLabel: '💧 Innaffia', statusLabel: 'Acqua', emoji: info.emoji, typeLabel: info.label, barColorLow: '#e74c3c', barColorHigh: '#3498db' };
};

const getIcon = (tree) => {
  const status = tree.status;
  const config = getPlantConfig(tree.category);
  const color = status === 'healthy' ? '#2ecc71' : status === 'thirsty' ? '#f1c40f' : '#e74c3c';
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">${config.emoji}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
};

const createClusterIcon = (cluster) => {
  const children = cluster.getAllChildMarkers();
  let hasCritical = false; let hasThirsty = false;
  for (let i = 0; i < children.length; i++) {
    const status = children[i].treeStatus; 
    if (status === 'critical') { hasCritical = true; break; }
    if (status === 'thirsty') hasThirsty = true;
  }
  let className = 'cluster-green'; 
  if (hasCritical) className = 'cluster-red'; else if (hasThirsty) className = 'cluster-yellow';
  return new L.DivIcon({ html: `<div><span>${cluster.getChildCount()}</span></div>`, className: `marker-cluster ${className}`, iconSize: new L.Point(40, 40) });
};

const createPopupContent = (tree) => {
  const isAdopted = props.user && props.user.adoptedTrees && props.user.adoptedTrees.includes(tree._id);
  const config = getPlantConfig(tree.category);
  const barColor = tree.waterLevel < 30 ? config.barColorLow : config.barColorHigh;
  const headerColor = tree.status === 'healthy' ? '#2ecc71' : tree.status === 'thirsty' ? '#f1c40f' : '#e74c3c';

  return `
    <div class="popup-custom">
      <div class="popup-header" style="background: ${headerColor}"></div>
      <div class="popup-body">
        <h3>${tree.name}</h3>
        <p style="text-transform: uppercase; font-size: 0.75rem; color: #95a5a6; font-weight: bold; letter-spacing: 1px;">${config.typeLabel} • ${tree.species}</p>
        <div class="bar-container"><div class="bar-fill" style="width:${tree.waterLevel}%; background-color:${barColor};"></div></div>
        
        <p>${config.statusLabel}: <strong class="val-text">${Math.round(tree.waterLevel)}%</strong></p>
        
        <div class="actions">
           <button onclick="event.stopPropagation(); window.triggerWater('${tree._id}')" ${tree.waterLevel >= 100 ? 'disabled' : ''} class="btn-action">${config.actionLabel}</button>
           <button onclick="event.stopPropagation(); window.triggerAdopt('${tree._id}')" class="btn-adopt ${isAdopted ? 'adopted' : ''}">${isAdopted ? '❤️ Tuo' : '🤍 Adotta'}</button>
        </div>
      </div>
    </div>
  `;
};

const flyToTree = (tree) => {
  if (!map || !markersLayer) return;
  const marker = markersMap[tree._id];
  if (marker) {
    if (showHeatmap.value) showHeatmap.value = false;
    markersLayer.zoomToShowLayer(marker, () => {
      marker.openPopup();
    });
  }
};
defineExpose({ flyToTree });

const renderMap = () => {
  if (!map) return;
  
  // Heatmap
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
      if (t.status === 'healthy') healthyPoints.push([lat, lng, 1.2]);
      if (t.status === 'thirsty') thirstyPoints.push([lat, lng, 1.2]);
      if (t.status === 'critical') criticalPoints.push([lat, lng, 1.2]);
    });

    const heatOpts = { radius: 60, blur: 40, minOpacity: 0.4, maxZoom: 14, max: 1.0 };
    if (healthyPoints.length) heatLayers.push(L.heatLayer(healthyPoints, { ...heatOpts, gradient: { 0.4: '#2ecc71', 1.0: '#27ae60' } }).addTo(map));
    if (thirstyPoints.length) heatLayers.push(L.heatLayer(thirstyPoints, { ...heatOpts, gradient: { 0.4: '#f1c40f', 1.0: '#f39c12' } }).addTo(map));
    if (criticalPoints.length) heatLayers.push(L.heatLayer(criticalPoints, { ...heatOpts, gradient: { 0.4: '#e74c3c', 1.0: '#c0392b' } }).addTo(map));
    return;
  }

  // Markers
  heatLayers.forEach(l => map.removeLayer(l)); 
  heatLayers = [];
  if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer);

  props.trees.forEach(tree => {
    let marker = markersMap[tree._id];
    const config = getPlantConfig(tree.category);

    if (marker) {
      marker.setIcon(getIcon(tree)); 
      marker.treeStatus = tree.status;

      const popup = marker.getPopup();
      if (popup && popup.isOpen()) {
        const popupEl = popup.getElement(); 
        if (popupEl) {
          const barFill = popupEl.querySelector('.bar-fill');
          if (barFill) { barFill.style.width = `${tree.waterLevel}%`; barFill.style.backgroundColor = tree.waterLevel < 30 ? config.barColorLow : config.barColorHigh; }
          
          const valText = popupEl.querySelector('.val-text'); 
          // QUI HO USATO Math.round() PER L'AGGIORNAMENTO LIVE
          if (valText) valText.innerText = `${Math.round(tree.waterLevel)}%`;
          
          const btnAction = popupEl.querySelector('.btn-action');
          if (btnAction) {
             btnAction.innerText = config.actionLabel; 
             if (tree.waterLevel >= 100) { btnAction.setAttribute('disabled', 'disabled'); btnAction.style.background = '#bdc3c7'; } else { btnAction.removeAttribute('disabled'); btnAction.style.background = null; }
          }
          
          const header = popupEl.querySelector('.popup-header');
          if (header) header.style.background = tree.status === 'healthy' ? '#2ecc71' : tree.status === 'thirsty' ? '#f1c40f' : '#e74c3c';

          const btnAdopt = popupEl.querySelector('.btn-adopt');
          if (btnAdopt) {
            const isAdopted = props.user && props.user.adoptedTrees && props.user.adoptedTrees.includes(tree._id);
            btnAdopt.innerHTML = isAdopted ? '❤️ Tuo' : '🤍 Adotta';
            if (isAdopted) btnAdopt.classList.add('adopted');
            else btnAdopt.classList.remove('adopted');
          }
        }
      }
    } else {
      marker = L.marker([tree.location.lat, tree.location.lng], { icon: getIcon(tree) });
      marker.treeStatus = tree.status;
      marker.bindPopup(() => {
        const freshTree = props.trees.find(t => t._id === tree._id) || tree;
        return createPopupContent(freshTree);
      });
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
  markersLayer = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, animate: true, animateAddingMarkers: true, spiderfyOnMaxZoom: true, iconCreateFunction: createClusterIcon });
};

onMounted(() => { initMap(); renderMap(); window.triggerWater = (id) => emit('water-action', id); window.triggerAdopt = (id) => emit('adopt-action', id); });
watch([showHeatmap, () => props.trees, () => props.user], () => renderMap(), { deep: true });
onBeforeUnmount(() => { if (map) { map.remove(); map = null; } markersMap = {}; delete window.triggerWater; delete window.triggerAdopt; });
</script>

<template>
  <div class="map-wrapper">
    <button class="toggle-heatmap-btn" :class="{ active: showHeatmap }" @click="showHeatmap = !showHeatmap">
      {{ showHeatmap ? '📍 Mostra Piante' : '🔥 Mostra Heatmap' }}
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

.map-wrapper { position: relative; width: 100%; height: 500px; }
.map-container { height: 100%; width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 4px solid #fff; z-index: 1; }
.toggle-heatmap-btn { position: absolute; top: 15px; right: 15px; z-index: 20; background: white; border: 2px solid #2c3e50; color: #2c3e50; padding: 8px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: all 0.3s ease; font-family: 'Inter', sans-serif; }
.toggle-heatmap-btn.active { background: #e74c3c; color: white; border-color: #c0392b; box-shadow: 0 0 15px rgba(231, 76, 60, 0.5); }

/* POPUP E RESET LEAFLET */
.leaflet-popup-content-wrapper { padding: 0 !important; overflow: hidden; border-radius: 12px !important; }
.leaflet-popup-content { margin: 0 !important; width: 220px !important; }

.leaflet-container a.leaflet-popup-close-button {
  color: white !important; 
  font-size: 24px !important;
  top: 5px !important;
  right: 5px !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  z-index: 2000;
  transition: color 0.2s ease, transform 0.2s; 
}
.leaflet-container a.leaflet-popup-close-button:hover {
  color: #333 !important;
  text-shadow: none;
  transform: scale(1.1); 
}

/* LAYOUT POPUP */
.popup-custom { text-align: center; width: 100%; font-family: 'Inter', sans-serif; }
.popup-header { height: 12px; width: 100%; margin: 0; }
.popup-body { padding: 15px; padding-top: 10px; }
.popup-custom h3 { margin: 0; color: #2c3e50; font-size: 1.1rem; font-weight: 700; margin-top: 5px; }
.popup-custom p { margin: 4px 0; font-size: 0.85rem; color: #7f8c8d; }
.bar-container { width: 100%; height: 10px; background: #ecf0f1; border-radius: 5px; margin: 8px 0; overflow: hidden; border: 1px solid #bdc3c7; }
.bar-fill { height: 100%; transition: width 0.8s ease-out, background-color 0.3s ease; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.popup-custom button { flex: 1; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem; transition: transform 0.1s; }
.popup-custom button:active { transform: scale(0.95); }
.btn-action { background: #2ecc71; color: white; }
.btn-action:disabled { background: #bdc3c7 !important; cursor: not-allowed; }
.btn-adopt { background: white; border: 2px solid #e74c3c !important; color: #e74c3c; }
.btn-adopt:hover { background: #fdedec; }
.btn-adopt.adopted { background: #e74c3c; color: white; }
</style>