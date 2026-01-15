<script setup>
import { ref } from 'vue';

const props = defineProps(['user']);
const emit = defineEmits(['back', 'logout', 'update-profile']);

// Stato locale per la modifica
const isEditing = ref(false);
const editName = ref(props.user.username);
const editAvatar = ref(props.user.avatar || '👤');

// Lista di avatar selezionabili
const avatars = ['👤', '🦊', '🐻', '🐼', '🐨', '🦁', '🐸', '🐝', '🍄', '🌿', '🌵'];

const saveProfile = async () => {
  if (editName.value.trim().length < 3) return alert("Nome troppo corto!");
  
  try {
    const res = await fetch(`http://localhost:3000/api/users/${props.user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: editName.value,
        avatar: editAvatar.value 
      })
    });

    if (res.ok) {
      const updatedUser = await res.json();
      emit('update-profile', updatedUser); // Dillo ad App.vue
      isEditing.value = false;
    } else {
      alert("Errore salvataggio");
    }
  } catch (e) {
    console.error(e);
    alert("Errore di connessione");
  }
};
</script>

<template>
  <div class="profile-container">
    
    <button class="btn-back" @click="$emit('back')">← Torna alla Home</button>

    <div class="profile-card">
      <div class="card-header">
        <span class="id-label">ID: {{ user._id.slice(-6).toUpperCase() }}</span>
        <span class="role-badge" :class="user.role">{{ user.role.replace('_', ' ') }}</span>
      </div>

      <div class="avatar-section">
        <div v-if="isEditing" class="avatar-grid">
          <div 
            v-for="icon in avatars" 
            :key="icon" 
            class="avatar-option"
            :class="{ selected: editAvatar === icon }"
            @click="editAvatar = icon"
          >
            {{ icon }}
          </div>
        </div>
        <div v-else class="current-avatar">{{ user.avatar || '👤' }}</div>
      </div>

      <div class="info-section">
        <div v-if="isEditing" class="edit-form">
          <label>Nome Utente</label>
          <input v-model="editName" type="text" maxlength="15" />
          <div class="edit-actions">
            <button @click="saveProfile" class="btn-save">Salva</button>
            <button @click="isEditing = false" class="btn-cancel">Annulla</button>
          </div>
        </div>
        
        <div v-else class="view-mode">
          <h1>{{ user.username }}</h1>
          <button @click="isEditing = true" class="btn-edit">✏️ Modifica</button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <span class="val">{{ user.level }}</span>
          <span class="lbl">Livello</span>
        </div>
        <div class="stat-box">
          <span class="val">{{ user.xp }}</span>
          <span class="lbl">XP Totali</span>
        </div>
        <div class="stat-box">
          <span class="val">{{ user.stats?.waterCount || 0 }}</span>
          <span class="lbl">Innaffiature</span>
        </div>
        <div class="stat-box">
          <span class="val">{{ user.stats?.savedTrees || 0 }}</span>
          <span class="lbl">Salvataggi</span>
        </div>
      </div>

      <div class="footer-actions">
        <button @click="$emit('logout')" class="btn-logout">Esci dall'Account</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 600px; margin: 0 auto; padding: 20px;
  animation: fadeIn 0.5s ease;
}

.btn-back {
  background: none; border: none; font-size: 1rem; color: #7f8c8d; cursor: pointer;
  margin-bottom: 20px; font-weight: bold; transition: color 0.2s;
}
.btn-back:hover { color: #2c3e50; transform: translateX(-5px); }

.profile-card {
  background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #eee;
  text-align: center; padding-bottom: 30px;
}

.card-header {
  background: #f8f9fa; padding: 15px 30px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #eee;
}
.id-label { font-family: monospace; color: #95a5a6; letter-spacing: 1px; }

/* AVATAR */
.avatar-section { margin: 30px 0; display: flex; justify-content: center; }
.current-avatar {
  font-size: 6rem; width: 140px; height: 140px;
  background: #f0f2f5; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

.avatar-grid {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 300px;
}
.avatar-option {
  font-size: 2rem; cursor: pointer; padding: 5px; border-radius: 50%; border: 2px solid transparent; transition: all 0.2s;
}
.avatar-option:hover { background: #f0f2f5; transform: scale(1.1); }
.avatar-option.selected { border-color: #2ecc71; background: #eafaf1; }

/* INFO & EDIT */
.info-section h1 { margin: 0; color: #2c3e50; font-size: 2rem; margin-bottom: 10px; }
.btn-edit { background: none; border: 1px solid #ddd; padding: 5px 15px; border-radius: 20px; cursor: pointer; color: #7f8c8d; font-size: 0.8rem; }
.btn-edit:hover { border-color: #2ecc71; color: #2ecc71; }

.edit-form { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.edit-form input { padding: 10px; font-size: 1.2rem; text-align: center; border: 2px solid #eee; border-radius: 8px; width: 200px; }
.edit-form input:focus { border-color: #2ecc71; outline: none; }
.edit-actions { display: flex; gap: 10px; }
.btn-save { background: #2ecc71; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-cancel { background: #e74c3c; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; }

/* STATS */
.stats-row {
  display: flex; justify-content: center; gap: 20px; margin: 30px 0; padding: 0 20px; flex-wrap: wrap;
}
.stat-box {
  background: #f8f9fa; padding: 15px; border-radius: 12px; min-width: 80px;
  display: flex; flex-direction: column; border: 1px solid #eee;
}
.stat-box .val { font-size: 1.5rem; font-weight: 900; color: #2c3e50; }
.stat-box .lbl { font-size: 0.7rem; text-transform: uppercase; color: #95a5a6; margin-top: 5px; }

/* FOOTER */
.btn-logout {
  background: white; border: 2px solid #e74c3c; color: #e74c3c;
  padding: 10px 30px; border-radius: 30px; font-weight: bold; cursor: pointer;
  transition: all 0.2s;
}
.btn-logout:hover { background: #e74c3c; color: white; }

.role-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; color: white; font-weight: bold; text-transform: uppercase; }
.role-badge.green_guardian { background: #27ae60; }
.role-badge.city_manager { background: #8e44ad; }
.role-badge.public_monitor { background: #95a5a6; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>