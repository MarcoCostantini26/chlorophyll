<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps(['user']);
const emit = defineEmits(['back', 'logout', 'update-profile']);

const isEditing = ref(false);

const editData = ref({ 
  username: props.user?.username || '', 
  avatar: props.user?.avatar || '👤' 
});

watch(() => props.user, (newUser) => {
  editData.value.username = newUser.username;
  editData.value.avatar = newUser.avatar;
}, { deep: true });

// --- CALCOLI ---
const nextLevelXp = computed(() => props.user.level * 100);
const progressPercent = computed(() => (props.user.xp % 100));
const badgesCount = computed(() => props.user.badges ? props.user.badges.length : 0);
const realWaterGiven = computed(() => {
  const actions = Math.floor(props.user.xp / 15); 
  return actions * 5; 
});
const treesCount = computed(() => props.user.adoptedTrees ? props.user.adoptedTrees.length : 0);

const saveProfile = async () => {
  if (!editData.value.username.trim()) return alert("Il nome non può essere vuoto");
  try {
    const res = await fetch(`http://localhost:3000/api/users/${props.user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        avatar: editData.value.avatar,
        username: editData.value.username
      })
    });
    if (!res.ok) throw new Error("Errore aggiornamento");
    const updatedUser = await res.json();
    emit('update-profile', updatedUser);
    isEditing.value = false;
    // Feedback visivo o alert
  } catch (e) { alert(e.message); }
};

const avatars = ['👤', '👨‍🌾', '👩‍🌾', '🦊', '🐻', '🐝', '🍄', '🌵', '👽', '🤖', '👑', '🧙‍♂️'];
</script>

<template>
  <div class="profile-wide-wrapper">
    
    <div class="wide-card">
      
      <div class="card-header">
        <div class="brand-logo">🍃 Chlorophyll</div>
      </div>

      <div v-if="isEditing" class="edit-mode-content">
        <h3>Modifica Identità</h3>
        <div class="edit-grid">
          <div class="input-col">
            <label>Nome Utente</label>
            <input v-model="editData.username" type="text" class="minimal-input" />
            
            <label class="mt-20">Scegli Avatar</label>
            <div class="avatars-grid">
              <button 
                v-for="av in avatars" :key="av" 
                @click="editData.avatar = av"
                :class="{ active: editData.avatar === av }"
              >{{ av }}</button>
            </div>
          </div>
          
          <div class="actions-col">
            <button @click="saveProfile" class="btn-save">Salva Modifiche</button>
            <button @click="isEditing = false" class="btn-cancel">Annulla</button>
          </div>
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
              <button @click="$emit('logout')" class="btn-action logout">Esci</button>
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
/* --- 1. STILI BASE (MOBILE FIRST) --- */
.profile-wide-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 80vh;
  /* Padding ridotto su mobile perché App.vue ha già spazio header */
  padding: 20px 15px; 
  color: #ecf0f1;
}

.wide-card {
  width: 100%;
  max-width: 850px; 
  background: #1e1e1e;
  border-radius: 20px;
  padding: 25px; /* Padding interno ridotto per mobile */
  border: 1px solid #333;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  position: relative;
  overflow: hidden;
}
.wide-card::before {
  content: ''; position: absolute; top:0; left:0; width: 6px; height: 100%;
  background: linear-gradient(180deg, #2ecc71, #f1c40f);
}

/* Header Card */
.card-header { display: flex; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #333; }
.brand-logo { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #2ecc71; font-size: 0.9rem; }
.id-chip { font-family: monospace; color: #7f8c8d; background: #121212; padding: 2px 6px; border-radius: 4px; border: 1px solid #333; font-size: 0.75rem; }

/* -- SEZIONE PROFILO (Mobile: Colonna) -- */
.view-mode-content { 
  display: flex; 
  flex-direction: column; /* Default: Colonna */
  align-items: center; 
  text-align: center; 
  gap: 30px; 
}

/* Avatar Section */
.left-section { position: relative; text-align: center; min-width: 160px; flex-shrink: 0; }
.avatar-big {
  width: 140px; height: 140px; background: #2c3e50; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 4rem;
  border: 4px solid #1e1e1e; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin: 0 auto;
}
.level-badge {
  margin-top: 15px; background: #f1c40f; color: #1e1e1e;
  font-weight: 900; padding: 6px 15px; border-radius: 20px;
  display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

/* Info Section */
.right-section { flex: 1; display: flex; flex-direction: column; gap: 25px; width: 100%; }

.user-header { 
  display: flex; flex-direction: column; /* Default: Stack */
  align-items: center; 
  gap: 15px; width: 100%; 
}
.name-box { margin-bottom: 5px; }
.username { margin: 0; font-size: 2rem; color: white; line-height: 1; margin-bottom: 5px; }
.role-text { color: #2ecc71; text-transform: uppercase; font-weight: bold; font-size: 0.85rem; letter-spacing: 1px; }

/* Buttons */
.actions-top { 
  display: grid; grid-template-columns: 1fr 1fr; /* 2 bottoni affiancati */
  gap: 10px; width: 100%; 
}
.btn-action {
  padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; border: none; font-size: 0.9rem; width: 100%;
}
.btn-action.edit { background: #333; color: white; border: 1px solid #444; }
.btn-action.logout { background: transparent; color: #e74c3c; border: 1px solid #e74c3c; }

/* XP Module */
.xp-module { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid #333; text-align: left; }
.xp-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; color: #aaa; }
.progress-bg { height: 10px; background: #121212; border-radius: 5px; overflow: hidden; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #f1c40f, #e67e22); border-radius: 5px; transition: width 0.5s; }

/* Stats Row (Mobile: Stack o Grid stretta) */
.stats-row { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.stat-pill { 
  background: #252525; padding: 12px 20px; border-radius: 12px; 
  display: flex; align-items: center; gap: 15px; border: 1px solid #333; 
  width: 100%; justify-content: flex-start; /* Allinea a sx su mobile */
}
.stat-pill.highlight { border-color: #2ecc71; background: rgba(46, 204, 113, 0.1); }
.stat-pill .icon { font-size: 1.8rem; }
.stat-text { display: flex; flex-direction: column; text-align: left; }
.stat-text strong { font-size: 1.2rem; color: white; line-height: 1; }
.stat-text small { color: #7f8c8d; text-transform: uppercase; font-weight: bold; font-size: 0.7rem; }

/* EDIT MODE (Mobile: Colonna) */
.edit-mode-content h3 { color: #f1c40f; margin-top: 0; }
.edit-grid { display: flex; flex-direction: column; gap: 20px; } /* Stack verticale */
.input-col { width: 100%; }
.actions-col { display: flex; gap: 10px; width: 100%; } /* Bottoni affiancati */

.minimal-input { width: 100%; background: #151515; border: 1px solid #444; padding: 15px; border-radius: 8px; color: white; font-size: 1.1rem; }
.mt-20 { margin-top: 20px; display: block; color: #aaa; margin-bottom: 10px; }

.avatars-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.avatars-grid button { font-size: 1.5rem; background: #252525; border: 2px solid transparent; border-radius: 8px; padding: 5px; cursor: pointer; }
.avatars-grid button.active { border-color: #2ecc71; background: rgba(46, 204, 113, 0.15); }

.btn-save { padding: 12px; background: #2ecc71; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; flex: 1; }
.btn-cancel { padding: 12px; background: transparent; border: 2px solid #555; border-radius: 8px; font-weight: bold; cursor: pointer; color: #ccc; flex: 1; }


/* --- 2. MEDIA QUERY DESKTOP (Tablet & PC - >768px) --- */
@media (min-width: 768px) {
  .profile-wide-wrapper { padding-top: 60px; }
  .wide-card { padding: 40px; }

  /* Layout Orizzontale */
  .view-mode-content { flex-direction: row; text-align: left; gap: 40px; align-items: flex-start; }
  
  .user-header { flex-direction: row; justify-content: space-between; }
  .username { font-size: 2.5rem; }
  .actions-top { width: auto; display: flex; gap: 10px; }
  .btn-action { width: auto; padding: 10px 18px; }

  .stats-row { flex-direction: row; flex-wrap: wrap; }
  .stat-pill { width: auto; flex: 1; min-width: 110px; justify-content: center; }
  .stat-text { text-align: center; align-items: center; }

  /* Edit Mode Desktop */
  .edit-grid { flex-direction: row; gap: 30px; }
  .actions-col { flex-direction: column; width: auto; justify-content: center; }
  .avatars-grid { grid-template-columns: repeat(6, 1fr); }
  .avatar-big { width: 160px; height: 160px; font-size: 5rem; }
}
</style>