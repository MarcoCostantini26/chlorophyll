import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null);

  const isAdmin = computed(() => user.value && user.value.role === 'city_manager');
  const isGuest = computed(() => user.value && user.value.role === 'guest');
  const isUser = computed(() => user.value && user.value.role === 'green_guardian');

  const setUser = (userData) => {
    user.value = userData;
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const login = async (username) => {
    const data = await api.login(username);
    setUser(data);
    return data;
  };

  const guestAccess = () => {
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
    setUser(guestUser);
  };

  const logout = () => {
    user.value = null;
    localStorage.removeItem('user');
  };

  return { user, isAdmin, isGuest, isUser, login, guestAccess, setUser, logout };
});