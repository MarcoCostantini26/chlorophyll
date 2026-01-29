import { io } from 'socket.io-client';
import { useTreeStore } from '../stores/tree';
import { useUIStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';

let socket;

export function useSocket() {
  const treeStore = useTreeStore();
  const uiStore = useUIStore();
  const authStore = useAuthStore();

  const connect = () => {
    // Evitiamo connessioni multiple
    if (socket && socket.connected) return;

    socket = io('http://localhost:3000');

    socket.on('connect', () => {
      console.log("🟢 Socket connesso");
    });

    // --- ALBERI ---
    socket.on('tree_updated', (t) => {
      // Logica Notifica Criticità
      const wasCritical = treeStore.trees.find(x => x._id === t._id)?.status === 'critical';
      const isMine = authStore.user && authStore.user.adoptedTrees && authStore.user.adoptedTrees.includes(t._id);
      
      if (t.status === 'critical' && !wasCritical && isMine) {
        uiStore.showAlert('S.O.S. ALBERO! 🚨', `Il tuo "${t.name}" è critico!`, 'critical');
      }
      
      treeStore.updateTree(t);
    });

    socket.on('trees_refresh', (all) => {
      treeStore.trees = all;
    });

    // --- METEO ---
    socket.on('weather_update', (w) => {
      if (w !== uiStore.weather) {
        uiStore.setWeather(w);
        // Notifica cambio meteo
        if (['rain', 'rainy', 'sunny'].includes(w)) {
           const msg = w.includes('rain') ? 'La natura innaffia per te.' : 'Il terreno si asciuga.';
           const title = w.includes('rain') ? 'STA PIOVENDO! 🌧️' : 'SOLE ☀️';
           uiStore.showAlert(title, msg, w.includes('rain') ? 'rain' : 'sunny');
        }
      }
    });

    socket.on('weather_map_update', (map) => {
      uiStore.setWeatherMap(map);
    });

    // --- UTENTE (Gamification) ---
    socket.on('user_updated', (u) => {
      // Aggiorniamo l'utente solo se è quello loggato
      if (authStore.user && authStore.user._id === u._id) {
        authStore.setUser(u);
      }
    });

    socket.on('level_up', () => uiStore.triggerLevelUp());

    socket.on('badge_unlocked', (d) => {
      if (authStore.user?.username === d.username) {
        uiStore.triggerBadge(d.badge);
      }
    });
    
    socket.on('connect', () => {
      uiStore.isConnected = true;
      console.log("🟢 Connesso");
    });

    socket.on('disconnect', () => {
      uiStore.isConnected = false;
      console.log("🔴 Disconnesso");
    });
  };

  const waterTree = (treeId) => {
    if (socket && authStore.user) {
      socket.emit('water_tree', { treeId, userId: authStore.user._id });
    }
  };
  
  const forceWater = (treeId, amount) => {
     if (socket) socket.emit('admin_force_water', { treeId, amount });
  };

  return { connect, waterTree, forceWater };
}