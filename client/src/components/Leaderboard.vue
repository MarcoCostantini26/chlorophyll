<script setup>
import { ref, onMounted } from 'vue';

const leaders = ref([]);

const fetchLeaderboard = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/users/leaderboard');
    if (res.ok) leaders.value = await res.json();
  } catch (e) { console.error(e); }
};

onMounted(() => {
  fetchLeaderboard();
  setInterval(fetchLeaderboard, 5000); // Aggiorna ogni 5 sec
});
</script>

<template>
  <div class="leaderboard-card">
    <h3>🏆 Classifica</h3>
    <ul>
      <li v-for="(user, index) in leaders" :key="user._id">
        <span class="rank">
          <span v-if="index === 0">🥇</span>
          <span v-else-if="index === 1">🥈</span>
          <span v-else-if="index === 2">🥉</span>
          <span v-else>{{ index + 1 }}.</span>
        </span>
        <div class="info">
          <span class="name">{{ user.username }}</span>
          <span class="details">Lvl {{ user.level }} • {{ user.xp }} XP</span>
        </div>
      </li>
      <li v-if="leaders.length === 0" class="empty">Nessun dato</li>
    </ul>
  </div>
</template>

<style scoped>
.leaderboard-card {
  background: white; padding: 15px; border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee; height: fit-content;
}
h3 { margin: 0 0 10px 0; font-size: 1rem; color: #f1c40f; text-transform: uppercase; text-align: center; }
ul { list-style: none; padding: 0; margin: 0; }
li { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #f9f9f9; }
.rank { width: 30px; font-weight: bold; font-size: 1.2rem; text-align: center; }
.info { display: flex; flex-direction: column; margin-left: 10px; }
.name { font-weight: bold; color: #2c3e50; font-size: 0.9rem; }
.details { font-size: 0.75rem; color: #7f8c8d; }
.empty { text-align: center; color: #ccc; font-style: italic; font-size: 0.8rem; }
</style>