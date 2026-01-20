import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';
import CommunityView from '../views/CommunityView.vue';
import AdminAnalyticsView from '../views/AdminAnalyticsView.vue'; // <--- NUOVO IMPORT

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
    path: '/community',
    name: 'Community', 
    component: CommunityView,
    meta: { requiresAuth: true }
  },
  { 
    path: '/admin/analytics',   // <--- NUOVA ROTTA ANALYTICS
    name: 'AdminAnalytics', 
    component: AdminAnalyticsView,
    meta: { requiresAuth: true } // Opzionale: potresti voler controllare anche il ruolo qui
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guardia di Navigazione Globale
router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user'); 
  
  // Se la rotta richiede auth e non c'è utente -> Login
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } 
  // Se l'utente cerca di andare in area admin ma non è city_manager (Opzionale, per sicurezza)
  else if (to.path.startsWith('/admin') && user) {
    const userData = JSON.parse(user);
    if (userData.role !== 'city_manager') {
      alert("Accesso negato: Area riservata City Manager");
      next('/'); // Rimanda alla home
    } else {
      next();
    }
  }
  else {
    next();
  }
});

export default router;