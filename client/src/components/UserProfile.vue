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

const nextLevelXp = computed(() => props.user.level * 100);
const progressPercent = computed(() => (props.user.xp % 100));
const co2Saved = computed(() => (props.user.xp * 0.5).toFixed(1)); 
const waterGiven = computed(() => (props.user.xp * 2)); 
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
    alert("Profilo aggiornato! ✨");
  } catch (e) { alert(e.message); }
};

const avatars = ['👤', '👨‍🌾', '👩‍🌾', '🦊', '🐻', '🐝', '🍄', '🌵', '👽', '🤖', '👑', '🧙‍♂️'];
</script>

<template>
  <div class="profile-wide-wrapper">
    
    <div class="wide-card">
      
      <div class="card-header">
        <div class="brand-logo">🍃 Chlorophyll ID</div>
        <span class="id-chip">#{{ user._id.slice(-6).toUpperCase() }}</span>
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
              <button @click="isEditing = true" class="btn-action edit">
                Modifica
              </button>
              <button @click="$emit('logout')" class="btn-action logout">
                Esci
              </button>
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
              <span class="icon">🌍</span> 
              <div class="stat-text">
                <strong>{{ co2Saved }}kg</strong> 
                <small>CO₂</small>
              </div>
            </div>
            <div class="stat-pill">
              <span class="icon">💧</span> 
              <div class="stat-text">
                <strong>{{ waterGiven }}L</strong> 
                <small>H₂O</small>
              </div>
            </div>
            <div class="stat-pill highlight">
              <span class="icon">🌲</span> 
              <div class="stat-text">
                <strong>{{ treesCount }}</strong> 
                <small>Alberi</small>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
/* WRAPPER GENERALE */
.profile-wide-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 80vh;
  padding-top: 60px;
  padding-left: 20px;
  padding-right: 20px;
  color: #ecf0f1;
}

/* CARD WIDE */
.wide-card {
  width: 100%;
  max-width: 850px; 
  background: #1e1e1e;
  border-radius: 24px;
  padding: 40px;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  position: relative;
  overflow: hidden;
}
.wide-card::before {
  content: ''; position: absolute; top:0; left:0; width: 6px; height: 100%;
  background: linear-gradient(180deg, #2ecc71, #f1c40f);
}

/* HEADER */
.card-header { display: flex; justify-content: space-between; margin-bottom: 40px; padding-bottom: 15px; border-bottom: 1px solid #333; }
.brand-logo { font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #2ecc71; }
.id-chip { font-family: monospace; color: #7f8c8d; background: #121212; padding: 4px 8px; border-radius: 4px; border: 1px solid #333; font-size: 0.8rem; }

/* LAYOUT ORIZZONTALE */
.view-mode-content { display: flex; gap: 40px; align-items: flex-start; }

/* SINISTRA */
.left-section { position: relative; text-align: center; min-width: 160px; flex-shrink: 0; }
.avatar-big {
  width: 160px; height: 160px; background: #2c3e50; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 5rem;
  border: 4px solid #1e1e1e; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin: 0 auto;
}
.level-badge {
  margin-top: 15px; background: #f1c40f; color: #1e1e1e;
  font-weight: 900; padding: 6px 15px; border-radius: 20px;
  display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

/* DESTRA */
.right-section { flex: 1; display: flex; flex-direction: column; gap: 25px; width: 100%; }

.user-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; }
.username { margin: 0; font-size: 2.5rem; color: white; line-height: 1; margin-bottom: 5px; }
.role-text { color: #2ecc71; text-transform: uppercase; font-weight: bold; font-size: 0.9rem; letter-spacing: 1px; }

/* PULSANTI ESPLICITI */
.actions-top { display: flex; gap: 10px; }
.btn-action {
  padding: 10px 18px; border-radius: 10px; font-weight: bold; cursor: pointer; border: none; font-size: 0.9rem; transition: transform 0.2s;
}
.btn-action.edit { background: #333; color: white; border: 1px solid #444; }
.btn-action.edit:hover { background: #444; }
.btn-action.logout { background: transparent; color: #e74c3c; border: 1px solid #e74c3c; }
.btn-action.logout:hover { background: #e74c3c; color: white; }

/* XP MODULE */
.xp-module { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid #333; }
.xp-info { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: #aaa; }
.progress-bg { height: 10px; background: #121212; border-radius: 5px; overflow: hidden; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #f1c40f, #e67e22); border-radius: 5px; transition: width 0.5s; }

/* STATS ROW */
.stats-row { display: flex; gap: 15px; flex-wrap: wrap; }
.stat-pill { 
  background: #252525; padding: 12px 20px; border-radius: 12px; 
  display: flex; align-items: center; gap: 15px; border: 1px solid #333; flex: 1; min-width: 110px;
}
.stat-pill.highlight { border-color: #2ecc71; background: rgba(46, 204, 113, 0.1); }
.stat-pill .icon { font-size: 1.8rem; }
.stat-text { display: flex; flex-direction: column; }
.stat-text strong { font-size: 1.2rem; color: white; line-height: 1; }
.stat-text small { color: #7f8c8d; text-transform: uppercase; font-weight: bold; font-size: 0.7rem; }

/* EDIT MODE STYLES */
.edit-mode-content h3 { color: #f1c40f; margin-top: 0; }
.edit-grid { display: flex; gap: 30px; }
.input-col { flex: 2; }
.actions-col { flex: 1; display: flex; flex-direction: column; gap: 15px; justify-content: center; }

.minimal-input { width: 100%; background: #151515; border: 1px solid #444; padding: 15px; border-radius: 8px; color: white; font-size: 1.1rem; box-sizing: border-box; }
.minimal-input:focus { border-color: #2ecc71; outline: none; }
.mt-20 { margin-top: 20px; display: block; color: #aaa; margin-bottom: 10px; }

.avatars-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.avatars-grid button { font-size: 1.5rem; background: #252525; border: 2px solid transparent; border-radius: 8px; padding: 5px; cursor: pointer; transition: 0.2s; }
.avatars-grid button.active { border-color: #2ecc71; background: rgba(46, 204, 113, 0.15); transform: scale(1.1); }

.btn-save { padding: 15px; background: #2ecc71; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; font-size: 1rem; width: 100%; }
.btn-cancel { padding: 15px; background: transparent; border: 2px solid #555; border-radius: 8px; font-weight: bold; cursor: pointer; color: #ccc; width: 100%; }

/* --- RESPONSIVE MOBILE (Sotto 768px) --- */
@media (max-width: 768px) {
  .wide-card { padding: 25px; }
  
  /* Layout verticale */
  .view-mode-content { flex-direction: column; align-items: center; text-align: center; gap: 30px; }
  
  /* Header utente stackato */
  .user-header { flex-direction: column; align-items: center; width: 100%; text-align: center; }
  .name-box { margin-bottom: 10px; }
  .actions-top { width: 100%; justify-content: center; display: grid; grid-template-columns: 1fr 1fr; }
  .btn-action { width: 100%; justify-content: center; }

  /* Edit Mode */
  .edit-grid { flex-direction: column; }
  .actions-col { flex-direction: row; }
  
  /* Avatar Grid */
  .avatars-grid { grid-template-columns: repeat(4, 1fr); }
  
  /* Stats verticali o a griglia */
  .stats-row { width: 100%; }
}
</style>