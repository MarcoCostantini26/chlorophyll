import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'
import AdminAnalyticsView from '../views/AdminAnalyticsView.vue'
import WeatherView from '../views/WeatherView.vue'
import TreeDetailView from '../views/TreeDetailView.vue' 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DashboardView,
      meta: { requiresAuth: true } 
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginView,
      meta: { hideChat: true } 
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/analytics',
      name: 'admin',
      component: AdminAnalyticsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/weather',
      name: 'weather',
      component: WeatherView,
      meta: { requiresAuth: true }
    },
    { 
      path: '/admin/tree/:id', 
      name: 'tree-detail', 
      component: TreeDetailView,
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user'); 
  
  if (to.meta.requiresAuth && !user) {
    next('/login');
  } else {
    next();
  }
});

export default router