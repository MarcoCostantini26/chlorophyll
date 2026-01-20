import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import ProfileView from '../views/ProfileView.vue';

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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user');
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } else {
    next();
  }
});

export default router;