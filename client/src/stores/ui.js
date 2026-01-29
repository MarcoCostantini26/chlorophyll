import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const weather = ref('sunny');
  const weatherMap = ref({});
  const alert = ref(null); // { title, msg, type }
  
  // Modali e stato
  const isMenuOpen = ref(false);
  const isWidgetAlive = ref(true); // Per refreshare le chat
  const showLevelUp = ref(false);
  const showBadgeModal = ref(false);
  const lastUnlockedBadge = ref({ name: '', desc: '' });
  const isConnected = ref(false);

  const setWeather = (w) => weather.value = w;
  const setWeatherMap = (map) => weatherMap.value = map;
  
  const showAlert = (title, msg, type) => {
    alert.value = { title, msg, type };
    // Auto-chiusura
    const duration = type === 'critical' ? 10000 : 6000;
    setTimeout(() => { alert.value = null; }, duration);
  };

  const triggerLevelUp = () => {
    showLevelUp.value = true;
    setTimeout(() => showLevelUp.value = false, 3000);
  };

  const triggerBadge = (badge) => {
    lastUnlockedBadge.value = badge;
    showBadgeModal.value = true;
    setTimeout(() => showBadgeModal.value = false, 4000);
  };

  return { 
    weather, weatherMap, alert, isMenuOpen, isWidgetAlive,
    showLevelUp, showBadgeModal, lastUnlockedBadge,
    setWeather, setWeatherMap, showAlert, triggerLevelUp, triggerBadge,
    isConnected
  };
});