import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue'; // Verifica che il nome file sia corretto
import CommunityView from '../views/CommunityView.vue'; // <--- IMPORTA

const routes = [
  { 
    path: '/login', 
    name: 'Login', 
    component: LoginView 
  },
  { 
    path: '/', 
    name: 'Dashboard', 
    component: DashboardView,
    meta: { requiresAuth: true } 
  },
  { 
    path: '/profile', 
    name: 'Profile', 
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/community',         // <--- NUOVA ROTTA
    name: 'Community', 
    component: CommunityView,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guardia di Navigazione
router.beforeEach((to, from, next) => {
  // Nota: nel tuo App.vue usi localStorage.setItem('user', ...), quindi qui cerchiamo 'user'
  const user = localStorage.getItem('user'); 
  
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } else {
    next();
  }
});

export default router;