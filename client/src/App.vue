<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import { useTreeStore } from './stores/tree';
import { useUIStore } from './stores/ui';
import { useSocket } from './composables/useSocket';
import { useRouter } from 'vue-router';

import Footer from './components/Footer.vue';
import AiFabManager from './components/AiFabManager.vue';

const authStore = useAuthStore();
const treeStore = useTreeStore();
const uiStore = useUIStore();
const socket = useSocket();
const router = useRouter();

onMounted(async () => {
  await treeStore.fetchTrees();
  socket.connect();
});

const toggleMenu = () => uiStore.isMenuOpen = !uiStore.isMenuOpen;
const closeMenu = () => uiStore.isMenuOpen = false;

const handleLogout = async () => {
  closeMenu();
  authStore.logout();
  uiStore.isWidgetAlive = false;
  await router.push('/login');
  setTimeout(() => uiStore.isWidgetAlive = true, 100);
};
</script>

<template>
  <div class="app-root">
    
    <header class="app-header" v-if="authStore.user && !$route.meta.hideChat">
      <div class="header-container">
        <div class="header-left">
          <router-link to="/" class="brand-link" @click="closeMenu">
            <h1 class="main-title">🍃 Chlorophyll</h1>
          </router-link>
          
          <div :class="['status-pill', uiStore.isConnected ? 'online' : 'offline']">
            {{ uiStore.isConnected ? 'Online' : 'Offline' }}
          </div>

          <span v-if="authStore.isGuest" class="guest-badge">👁️ SPETTATORE</span>
        </div>
        
        <nav class="main-nav desktop-nav">
          <router-link to="/" class="nav-item dashboard-link">🌲 Home Page</router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/analytics" class="nav-item admin-link">🎛️ Control Room</router-link>
          <router-link v-if="!authStore.isGuest" to="/profile" class="nav-item profile-link">👤 Profilo</router-link>
          <button @click="handleLogout" class="nav-item btn-logout">Esci</button>
        </nav>

        <button class="hamburger-btn" @click="toggleMenu">☰</button>
      </div>

      <transition name="slide-down">
        <nav v-if="uiStore.isMenuOpen" class="mobile-nav">
          <router-link to="/" class="mobile-link dashboard-link" @click="closeMenu">🌲 Home Page</router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/analytics" class="mobile-link admin-link" @click="closeMenu">🎛️ Control Room</router-link>
          <router-link v-if="!authStore.isGuest" to="/profile" class="mobile-link profile-link" @click="closeMenu">👤 Profilo</router-link>
          <button @click="handleLogout" class="mobile-link btn-mobile-logout">Esci 🚪</button>
        </nav>
      </transition>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>
    
    <Footer v-if="authStore.user && !$route.meta.hideChat" />
    
    <template v-if="uiStore.isWidgetAlive && authStore.user && !$route.meta.hideChat">
      <AiFabManager />
    </template>

    <transition name="drop-in">
      <div v-if="uiStore.alert" class="weather-banner" :class="uiStore.alert.type">
        <div class="weather-icon" v-if="uiStore.alert.type !== 'critical'">
           {{ uiStore.alert.type === 'rain' ? '🌧️' : '☀️' }}
        </div>
        <div class="weather-icon" v-else>🚨</div>
        
        <div class="weather-content">
          <h3>{{ uiStore.alert.title }}</h3>
          <p>{{ uiStore.alert.msg }}</p>
        </div>
      </div>
    </transition>

    <div v-if="uiStore.showLevelUp" class="level-up-modal">🌟 LEVEL UP! 🌟</div>
    
    <div v-if="uiStore.showBadgeModal" class="badge-modal">
      <div class="badge-icon">🏆</div>
      <h3>BADGE SBLOCCATO!</h3>
      <p>{{ uiStore.lastUnlockedBadge.name }}</p>
    </div>

  </div>
</template>