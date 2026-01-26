<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { io } from 'socket.io-client';

import UserChatWidget from './components/UserChatWidget.vue';
import AdminChatWidget from './components/AdminChatWidget.vue';
import Footer from './components/Footer.vue';

const socket = io('http://localhost:3000');
const router = useRouter();
const route = useRoute();

const trees = ref([]);
const currentUser = ref(JSON.parse(localStorage.getItem('user')) || null);

const isConnected = ref(false);
const currentWeather = ref('sunny');
const showLevelUp = ref(false);
const showBadgeModal = ref(false);
const lastUnlockedBadge = ref({ name: '', desc: '' });
const isWidgetAlive = ref(true);

// --- LOGICA RUOLI ---
const isUser = computed(() => currentUser.value && currentUser.value.role === 'green_guardian');
const isAdmin = computed(() => currentUser.value && currentUser.value.role === 'city_manager');
const isGuest = computed(() => currentUser.value && currentUser.value.role === 'guest');

const handleProfileUpdate = (updatedUser) => {
  currentUser.value = updatedUser; 
  localStorage.setItem('user', JSON.stringify(updatedUser)); 
};

const handleLoginSuccess = async (user) => { 
  isWidgetAlive.value = false;
  handleProfileUpdate(user);
  await nextTick();
  isWidgetAlive.value = true;
  router.push('/');
};

const handleGuestAccess = async () => {
  isWidgetAlive.value = false;
  const guestUser = {
    _id: 'guest',
    username: 'Public Monitor',
    role: 'guest',
    avatar: '👁️',
    xp: 0,
    level: 0,
    badges: [],
    adoptedTrees: []
  };
  handleProfileUpdate(guestUser);
  await nextTick();
  isWidgetAlive.value = true;
  router.push('/'); 
};

const handleLogout = async () => { 
  localStorage.removeItem('user');
  await router.push('/login'); 
  isWidgetAlive.value = false;
  currentUser.value = null;    
  await nextTick();
  isWidgetAlive.value = true;
};

const fetchTrees = async () => { 
  try {
    const res = await fetch('http://localhost:3000/api/trees'); 
    trees.value = await res.json(); 
  } catch (e) { console.error(e); }
};

const waterTree = (treeId) => { 
  if (currentUser.value && !isGuest.value) { 
    socket.emit('water_tree', { treeId, userId: currentUser.value._id }); 
  }
};

const forceWater = ({id, amt}) => { socket.emit('admin_force_water', { treeId: id, amount: amt }); };

const toggleAdopt = async (treeId) => {
  if (!currentUser.value || isGuest.value) return;
  try {
    const res = await fetch('http://localhost:3000/api/users/adopt', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.value._id, treeId })
    });
    if (res.ok) handleProfileUpdate(await res.json());
  } catch (e) { console.error(e); }
};

onMounted(() => {
  const saved = localStorage.getItem('user');
  if (saved) { try { currentUser.value = JSON.parse(saved); } catch (e) { localStorage.removeItem('user'); } }

  fetchTrees();
  socket.on('connect', () => isConnected.value = true);
  socket.on('disconnect', () => isConnected.value = false);
  socket.on('tree_updated', (t) => { const idx = trees.value.findIndex(x => x._id === t._id); if (idx !== -1) { trees.value[idx] = t; trees.value = [...trees.value]; } });
  socket.on('trees_refresh', (all) => trees.value = all);
  socket.on('weather_update', (w) => { if (w !== currentWeather.value) currentWeather.value = w; });
  socket.on('user_updated', (u) => { if (currentUser.value && currentUser.value._id === u._id) handleProfileUpdate(u); });
  socket.on('level_up', () => { showLevelUp.value = true; setTimeout(() => showLevelUp.value = false, 3000); });
  socket.on('badge_unlocked', (d) => { if (currentUser.value?.username === d.username) { lastUnlockedBadge.value = d.badge; showBadgeModal.value = true; setTimeout(() => showBadgeModal.value = false, 4000); } });
});
</script>

<template>
  <div class="app-root">
    
    <header class="app-header" v-if="currentUser && !route.meta.hideChat">
      <div class="header-container">
        <div class="header-left">
          <router-link to="/" class="brand-link">
            <h1 class="main-title">🍃 Chlorophyll</h1>
          </router-link>
          
          <span v-if="isGuest" class="guest-badge">👁️ SPETTATORE</span>
          <div :class="['status-pill', isConnected ? 'online' : 'offline']">{{ isConnected ? 'Online' : 'Offline' }}</div>
        </div>
        
        <nav class="main-nav">
          <router-link to="/" class="nav-item">🌲 Dashboard</router-link>
          <router-link v-if="isAdmin" to="/admin/analytics" class="nav-item admin-link">🎛️ Control Room</router-link>
          <router-link v-if="!isGuest" to="/profile" class="nav-item">👤 Profilo</router-link>
          <button @click="handleLogout" class="nav-item btn-logout">Esci 🚪</button>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <router-view 
          :user="currentUser" 
          :trees="trees"
          :weather="currentWeather"
          :isConnected="isConnected"
          @login-success="handleLoginSuccess"
          @guest-access="handleGuestAccess" 
          @logout="handleLogout"
          @update-profile="handleProfileUpdate" 
          @water="waterTree"
          @force-water="forceWater"
          @adopt="toggleAdopt"
        />
      </div>
    </main>
    
    <Footer v-if="currentUser && !route.meta.hideChat" />
    
    <template v-if="isWidgetAlive && currentUser && !route.meta.hideChat">
      <UserChatWidget v-if="isUser" :key="'user-' + currentUser._id" :trees="trees" :weather="currentWeather" :user="currentUser" />
      <AdminChatWidget v-if="isAdmin" :key="'admin-' + currentUser._id" :user="currentUser" :trees="trees" />
    </template>

    <div v-if="showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    <div v-if="showBadgeModal" class="badge-modal"><div class="badge-icon">🏆</div><h3>BADGE SBLOCCATO!</h3><p>{{ lastUnlockedBadge.name }}</p></div>
  </div>
</template>

<style>
.app-root { display: flex; flex-direction: column; min-height: 100vh; }

html, body { margin: 0; padding: 0; width: 100%; font-family: 'Inter', sans-serif; background-color: #121212; color: #ecf0f1; }
.app-header { position: fixed; top: 0; left: 0; width: 100%; height: 70px; background: #1e1e1e; border-bottom: 2px solid #333; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; }
.header-container { display: flex; justify-content: space-between; align-items: center; height: 100%; padding: 0 30px; max-width: 1400px; margin: 0 auto; }
.main-content { padding-top: 90px; padding-bottom: 40px; flex: 1; box-sizing: border-box; }
.content-wrapper { max-width: 1400px; margin: 0 auto; padding: 0 20px; }
.header-left { display: flex; align-items: center; gap: 15px; }

/* FIX STILE LINK TITOLO */
.brand-link { text-decoration: none; display: flex; align-items: center; transition: transform 0.2s; }
.brand-link:hover { transform: scale(1.02); cursor: pointer; }
.main-title { color: #2ecc71; font-size: 1.5rem; margin: 0; font-weight: 800; } 

.status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; color: white; text-transform: uppercase; }
.online { background: #2ecc71; } .offline { background: #e74c3c; }
.main-nav { display: flex; gap: 20px; align-items: center; }
.nav-item { text-decoration: none; color: #bdc3c7; font-weight: 600; font-size: 0.95rem; transition: color 0.2s; background: none; border: none; font-family: inherit; cursor: pointer; display: flex; align-items: center; height: 70px; border-bottom: 3px solid transparent; }
.nav-item:hover { color: #2ecc71; }
.nav-item.router-link-active { color: #2ecc71; border-bottom-color: #2ecc71; } 
.admin-link { color: #9b59b6 !important; }
.admin-link:hover { color: #8e44ad !important; text-shadow: 0 0 10px rgba(142, 68, 173, 0.4); }
.btn-logout { color: #e74c3c !important; height: auto; border: 1px solid #e74c3c; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; line-height: 1; border-bottom: 1px solid #e74c3c !important; }
.btn-logout:hover { background: #e74c3c; color: white !important; }
.guest-badge { background: #3498db; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
.level-up-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #f1c40f; color: white; padding: 20px 40px; border-radius: 50px; font-size: 2rem; z-index: 3000; font-weight: 900; animation: popIn 0.5s; }
.badge-modal { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -50%); background: #2c3e50; border: 4px solid #f1c40f; color: white; padding: 30px; text-align: center; border-radius: 20px; z-index: 4000; animation: popIn 0.5s; min-width: 300px; }
.badge-modal .badge-icon { font-size: 5rem; margin-bottom: 15px; display: block; }
@keyframes popIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; }}
</style>