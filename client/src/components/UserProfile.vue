<script setup>
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth'; // <--- Importiamo lo store
import { api } from '../services/api';         // <--- Importiamo l'API

// Niente props!
const authStore = useAuthStore();
const emit = defineEmits(['back']); // Logout lo gestisce lo store, back serve per mobile

const isEditing = ref(false);
const editData = ref({ 
  username: authStore.user?.username || '', 
  avatar: authStore.user?.avatar || '👤' 
});

// Sincronizza se l'utente cambia (es. aggiornamento socket)
watch(() => authStore.user, (newUser) => {
  if (newUser) {
    editData.value.username = newUser.username;
    editData.value.avatar = newUser.avatar;
  }
}, { deep: true });

// --- CALCOLI (Usano authStore.user) ---
const user = computed(() => authStore.user);
const nextLevelXp = computed(() => user.value.level * 100);
const progressPercent = computed(() => (user.value.xp % 100));
const badgesCount = computed(() => user.value.badges?.length || 0);
const treesCount = computed(() => user.value.adoptedTrees?.length || 0);
const realWaterGiven = computed(() => Math.floor(user.value.xp / 15) * 5);

const saveProfile = async () => {
  if (!editData.value.username.trim()) return alert("Il nome non può essere vuoto");
  try {
    const updatedUser = await api.updateProfile(user.value._id, {
      avatar: editData.value.avatar,
      username: editData.value.username
    });
    // Aggiorniamo lo store locale subito
    authStore.setUser(updatedUser);
    isEditing.value = false;
  } catch (e) { alert(e.message); }
};

const handleLogout = () => {
  // Possiamo chiamare direttamente il metodo di logout globale o emettere
  // In questo caso, usiamo l'azione diretta per pulizia
  // Ma App.vue gestisce il logout nella header. Qui possiamo invocare un redirect o simile.
  // Per coerenza con il design precedente, lasciamo che sia App.vue o Router a gestire
  // Ma siccome siamo in un componente, l'ideale è chiamare authStore.logout() e redirect.
  // Tuttavia, per semplicità qui usiamo l'emit o chiamiamo authStore.
  authStore.logout();
  window.location.href = '/login'; // O router.push
};

const avatars = ['👤', '👨‍🌾', '👩‍🌾', '🦊', '🐻', '🐝', '🍄', '🌵', '👽', '🤖', '👑', '🧙‍♂️'];
</script>

<template>
  <div class="profile-wide-wrapper" v-if="user">
    <div class="wide-card">
      <div class="card-header">
        <div class="brand-logo">🍃 Chlorophyll</div>
        <button class="btn-back-mobile" @click="$emit('back')">↩</button>
      </div>

      <div v-if="isEditing" class="edit-mode-content">
         <div class="actions-col">
            <button @click="saveProfile" class="btn-save">Salva Modifiche</button>
            <button @click="isEditing = false" class="btn-cancel">Annulla</button>
         </div>
      </div>

      <div v-else class="view-mode-content">
        <div class="left-section">
          <div class="avatar-big">{{ user.avatar }}</div>
          <div class="level-badge">LVL {{ user.level }}</div>
        </div>

        <div class="right-section">
          <div class="user-header">
            <div class="name-box">
              <h1 class="username">{{ user.username }}</h1>
              <span class="role-text">{{ user.role.replace('_', ' ') }}</span>
            </div>
            <div class="actions-top">
              <button @click="isEditing = true" class="btn-action edit">Modifica</button>
              <button @click="handleLogout" class="btn-action logout">Esci</button>
            </div>
          </div>
          <div class="xp-module">
            <div class="xp-info">
              <span>Progresso</span>
              <strong>{{ user.xp }} / {{ nextLevelXp }} XP</strong>
            </div>
            <div class="progress-bg">
              <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-pill">
              <span class="icon">🏆</span> 
              <div class="stat-text"><strong>{{ badgesCount }}</strong><small>Trofei</small></div>
            </div>
            <div class="stat-pill">
              <span class="icon">💧</span> 
              <div class="stat-text"><strong>{{ realWaterGiven }}L</strong><small>Versati</small></div>
            </div>
            <div class="stat-pill highlight">
              <span class="icon">🌲</span> 
              <div class="stat-text"><strong>{{ treesCount }}</strong><small>Alberi</small></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Aggiungi questo stile per il bottone back mobile */
.btn-back-mobile { display: none; background: none; border: none; color: #7f8c8d; font-size: 1.5rem; cursor: pointer; }
@media (max-width: 768px) { .btn-back-mobile { display: block; } }

/* ... (Incolla qui tutto lo stile originale di UserProfile.vue) ... */
/* ... Assicurati di copiare tutto il CSS che c'era nel file originale ... */
.profile-wide-wrapper { display: flex; justify-content: center; align-items: flex-start; min-height: 80vh; padding: 20px 15px; color: #ecf0f1; }
.wide-card { width: 100%; max-width: 850px; background: #1e1e1e; border-radius: 20px; padding: 25px; border: 1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.4); position: relative; overflow: hidden; }
.wide-card::before { content: ''; position: absolute; top:0; left:0; width: 6px; height: 100%; background: linear-gradient(180deg, #2ecc71, #f1c40f); }
.card-header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #333; }
.brand-logo { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #2ecc71; font-size: 0.9rem; }
.view-mode-content { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 30px; }
.left-section { position: relative; text-align: center; min-width: 160px; flex-shrink: 0; }
.avatar-big { width: 140px; height: 140px; background: #2c3e50; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 4rem; border: 4px solid #1e1e1e; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin: 0 auto; }
.level-badge { margin-top: 15px; background: #f1c40f; color: #1e1e1e; font-weight: 900; padding: 6px 15px; border-radius: 20px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.right-section { flex: 1; display: flex; flex-direction: column; gap: 25px; width: 100%; }
.user-header { display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%; }
.name-box { margin-bottom: 5px; }
.username { margin: 0; font-size: 2rem; color: white; line-height: 1; margin-bottom: 5px; }
.role-text { color: #2ecc71; text-transform: uppercase; font-weight: bold; font-size: 0.85rem; letter-spacing: 1px; }
.actions-top { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.btn-action { padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; border: none; font-size: 0.9rem; width: 100%; }
.btn-action.edit { background: #333; color: white; border: 1px solid #444; }
.btn-action.logout { background: transparent; color: #e74c3c; border: 1px solid #e74c3c; }
.xp-module { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid #333; text-align: left; }
.xp-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: #aaa; }
.progress-bg { height: 10px; background: #121212; border-radius: 5px; overflow: hidden; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #f1c40f, #e67e22); border-radius: 5px; transition: width 0.5s; }
.stats-row { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.stat-pill { background: #252525; padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1px solid #333; width: 100%; justify-content: flex-start; }
.stat-pill.highlight { border-color: #2ecc71; background: rgba(46, 204, 113, 0.1); }
.stat-pill .icon { font-size: 1.8rem; }
.stat-text { display: flex; flex-direction: column; text-align: left; }
.stat-text strong { font-size: 1.2rem; color: white; line-height: 1; }
.stat-text small { color: #7f8c8d; text-transform: uppercase; font-weight: bold; font-size: 0.7rem; }
.edit-mode-content h3 { color: #f1c40f; margin-top: 0; }
.edit-grid { display: flex; flex-direction: column; gap: 20px; } 
.input-col { width: 100%; }
.actions-col { display: flex; gap: 10px; width: 100%; } 
.minimal-input { width: 100%; background: #151515; border: 1px solid #444; padding: 15px; border-radius: 8px; color: white; font-size: 1.1rem; }
.mt-20 { margin-top: 20px; display: block; color: #aaa; margin-bottom: 10px; }
.avatars-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.avatars-grid button { font-size: 1.5rem; background: #252525; border: 2px solid transparent; border-radius: 8px; padding: 5px; cursor: pointer; }
.avatars-grid button.active { border-color: #2ecc71; background: rgba(46, 204, 113, 0.15); }
.btn-save { padding: 12px; background: #2ecc71; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; flex: 1; }
.btn-cancel { padding: 12px; background: transparent; border: 2px solid #555; border-radius: 8px; font-weight: bold; cursor: pointer; color: #ccc; flex: 1; }
@media (min-width: 768px) {
  .profile-wide-wrapper { padding-top: 60px; }
  .wide-card { padding: 40px; }
  .view-mode-content { flex-direction: row; text-align: left; gap: 40px; align-items: flex-start; }
  .user-header { flex-direction: row; justify-content: space-between; }
  .username { font-size: 2.5rem; }
  .actions-top { width: auto; display: flex; gap: 10px; }
  .btn-action { width: auto; padding: 10px 18px; }
  .stats-row { flex-direction: row; flex-wrap: wrap; }
  .stat-pill { width: auto; flex: 1; min-width: 110px; justify-content: center; }
  .stat-text { text-align: center; align-items: center; }
  .edit-grid { flex-direction: row; gap: 30px; }
  .actions-col { flex-direction: column; width: auto; justify-content: center; }
  .avatars-grid { grid-template-columns: repeat(6, 1fr); }
  .avatar-big { width: 160px; height: 160px; font-size: 5rem; }
}
</style>