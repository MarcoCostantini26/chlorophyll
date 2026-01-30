import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api';
import { useAuthStore } from './auth';

export const useTreeStore = defineStore('trees', () => {
  const trees = ref([]);
  const authStore = useAuthStore();

  const fetchTrees = async () => {
    try {
      trees.value = await api.getTrees();
    } catch (e) { console.error(e); }
  };

  const fetchFullAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      if (data.allTrees) {
        data.allTrees.forEach(richTree => {
          const idx = trees.value.findIndex(t => t._id === richTree._id);
          if (idx !== -1) {
            trees.value[idx] = { ...trees.value[idx], history: richTree.history };
          } else {
            trees.value.push(richTree);
          }
        });
        trees.value = [...trees.value];
      }
    } catch (e) { console.error("Errore caricamento storico admin", e); }
  };

  const updateTree = (updatedTree) => {
    const idx = trees.value.findIndex(t => t._id === updatedTree._id);
    if (idx !== -1) {
      const oldHistory = trees.value[idx].history;
      trees.value[idx] = { ...updatedTree, history: updatedTree.history || oldHistory };
      trees.value = [...trees.value];
    }
  };

  const myTrees = computed(() => {
    if (!authStore.user || !authStore.user.adoptedTrees) return [];
    return trees.value.filter(t => authStore.user.adoptedTrees.includes(t._id));
  });

  return { trees, fetchTrees, fetchFullAnalytics, updateTree, myTrees };
});