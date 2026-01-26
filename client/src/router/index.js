import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'
import AdminAnalyticsView from '../views/AdminAnalyticsView.vue'
import WeatherView from '../views/WeatherView.vue'
import TreeDetailView from '../views/TreeDetailView.vue' // <--- ASSICURATI DI AVERE QUESTO FILE CREATO

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: DashboardView
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
      component: ProfileView
    },
    {
      path: '/admin/analytics',
      name: 'admin',
      component: AdminAnalyticsView
    },
    {
      path: '/weather',
      name: 'weather',
      component: WeatherView
    },
    // --- ROTTA DETTAGLIO (CRUCIALE) ---
    { 
      path: '/admin/tree/:id', 
      name: 'tree-detail', 
      component: TreeDetailView 
    }
  ]
})

export default router