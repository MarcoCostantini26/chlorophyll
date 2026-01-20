<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps(['user']); // L'utente loggato passato dal router o app

const groups = ref([]);
const activeGroup = ref(null);
const messages = ref([]);
const newMessage = ref('');
const showCreateForm = ref(false);

// Form data per nuovo gruppo
const newGroupData = ref({ name: '', location: '', eventDate: '', description: '' });

// 1. CARICA GRUPPI
const fetchGroups = async () => {
  const res = await fetch('http://localhost:3000/api/groups');
  groups.value = await res.json();
};

// 2. CREA GRUPPO
const createGroup = async () => {
  if (!props.user) return alert('Devi essere loggato!');
  
  await fetch('http://localhost:3000/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...newGroupData.value, userId: props.user._id })
  });
  
  newGroupData.value = { name: '', location: '', eventDate: '', description: '' };
  showCreateForm.value = false;
  fetchGroups();
};

// 3. SELEZIONA GRUPPO E CARICA CHAT
const selectGroup = async (group) => {
  activeGroup.value = group;
  loadMessages();
};

const loadMessages = async () => {
  if (!activeGroup.value) return;
  const res = await fetch(`http://localhost:3000/api/groups/${activeGroup.value._id}/messages`);
  messages.value = await res.json();
};

// 4. UNISCITI AL GRUPPO
const joinGroup = async () => {
  if (!props.user) return;
  const res = await fetch(`http://localhost:3000/api/groups/${activeGroup.value._id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: props.user._id })
  });
  const updatedGroup = await res.json();
  // Aggiorna la lista locale
  const idx = groups.value.findIndex(g => g._id === updatedGroup._id);
  if (idx !== -1) groups.value[idx] = updatedGroup;
  activeGroup.value = updatedGroup;
};

// 5. INVIA MESSAGGIO
const sendMessage = async () => {
  if (!newMessage.value.trim() || !props.user) return;
  
  const res = await fetch(`http://localhost:3000/api/groups/${activeGroup.value._id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: props.user._id, text: newMessage.value })
  });
  
  const msg = await res.json();
  messages.value.push(msg);
  newMessage.value = '';
  
  // Auto-scroll in basso (semplificato)
  setTimeout(() => {
    const chatBox = document.querySelector('.chat-history');
    if(chatBox) chatBox.scrollTop = chatBox.scrollHeight;
  }, 100);
};

const isMember = computed(() => {
  if (!activeGroup.value || !props.user) return false;
  return activeGroup.value.members.includes(props.user._id);
});

onMounted(() => {
  fetchGroups();
  // Polling semplice per aggiornare la chat ogni 5 sec (se c'è un gruppo attivo)
  setInterval(() => { if(activeGroup.value) loadMessages(); }, 5000);
});
</script>

<template>
  <div class="community-container">
    
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>🌍 Community</h2>
        <button @click="showCreateForm = !showCreateForm" class="btn-new">
          {{ showCreateForm ? '❌ Chiudi' : '➕ Crea Gruppo' }}
        </button>
      </div>

      <div v-if="showCreateForm" class="create-box">
        <input v-model="newGroupData.name" placeholder="Nome Evento/Gruppo" />
        <input v-model="newGroupData.location" placeholder="📍 Luogo" />
        <input v-model="newGroupData.eventDate" type="date" />
        <textarea v-model="newGroupData.description" placeholder="Descrizione..."></textarea>
        <button @click="createGroup" class="btn-confirm">Pubblica</button>
      </div>

      <div class="groups-list">
        <div 
          v-for="group in groups" 
          :key="group._id" 
          class="group-card"
          :class="{ active: activeGroup && activeGroup._id === group._id }"
          @click="selectGroup(group)"
        >
          <h3>{{ group.name }}</h3>
          <p class="meta">📍 {{ group.location }}</p>
          <p class="meta">📅 {{ new Date(group.eventDate).toLocaleDateString() }}</p>
          <div class="members-badge">👥 {{ group.members.length }} iscritti</div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div v-if="!activeGroup" class="placeholder">
        <p>👈 Seleziona un gruppo per vedere i dettagli e chattare</p>
      </div>

      <div v-else class="group-detail">
        <div class="detail-header">
          <div>
            <h2>{{ activeGroup.name }}</h2>
            <p>{{ activeGroup.description }}</p>
          </div>
          <button v-if="!isMember" @click="joinGroup" class="btn-join">Unisciti al Gruppo</button>
          <span v-else class="joined-tag">✅ Sei iscritto</span>
        </div>

        <div v-if="isMember" class="chat-area">
          <div class="chat-history">
            <div v-if="messages.length === 0" class="no-msg">Nessun messaggio ancora. Rompi il ghiaccio! 🧊</div>
            <div 
              v-for="msg in messages" 
              :key="msg._id" 
              class="msg-bubble"
              :class="{ 'my-msg': msg.user._id === user._id }"
            >
              <small class="msg-author">{{ msg.user.username }}</small>
              <div class="msg-text">{{ msg.text }}</div>
              <small class="msg-time">{{ new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</small>
            </div>
          </div>
          <div class="chat-input">
            <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Scrivi un messaggio..." />
            <button @click="sendMessage">➤</button>
          </div>
        </div>

        <div v-else class="blur-chat">
          <p>🔒 Unisciti al gruppo per accedere alla chat!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-container { display: flex; height: 85vh; gap: 20px;}

/* SIDEBAR */
.sidebar { width: 350px; background: white; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; border: 1px solid #ddd; }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sidebar-header h2 { margin: 0; color: #27ae60; font-size: 1.5rem; }
.btn-new { background: #2c3e50; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; }

.create-box { background: #ecf0f1; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px; }
.create-box input, .create-box textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.btn-confirm { background: #27ae60; color: white; border: none; padding: 8px; cursor: pointer; border-radius: 4px; font-weight: bold; }

.groups-list { overflow-y: auto; flex: 1; }
.group-card { background: #fff; border: 1px solid #eee; padding: 12px; border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.group-card:hover { transform: translateY(-2px); border-color: #27ae60; }
.group-card.active { border: 2px solid #27ae60; background: #eafaf1; }
.group-card h3 { margin: 0 0 5px 0; color: #2c3e50; font-size: 1.1rem; }
.meta { margin: 2px 0; font-size: 0.85rem; color: #7f8c8d; }
.members-badge { margin-top: 8px; font-size: 0.8rem; font-weight: bold; color: #2980b9; background: #ebf5fb; display: inline-block; padding: 2px 6px; border-radius: 4px; }

/* MAIN CONTENT */
.main-content { flex: 1; background: white; border-radius: 12px; border: 1px solid #ddd; overflow: hidden; display: flex; flex-direction: column; }
.placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #bdc3c7; font-size: 1.2rem; }

.group-detail { display: flex; flex-direction: column; height: 100%; }
.detail-header { padding: 20px; border-bottom: 1px solid #eee; background: #fafafa; display: flex; justify-content: space-between; align-items: center; }
.detail-header h2 { margin: 0; color: #2c3e50; }
.btn-join { background: #2980b9; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; }
.joined-tag { background: #2ecc71; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }

/* CHAT */
.chat-area { flex: 1; display: flex; flex-direction: column; background: #e5ddd5; } /* Stile simil-Whatsapp */
.chat-history { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.msg-bubble { max-width: 70%; padding: 8px 12px; border-radius: 8px; background: white; align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.msg-bubble.my-msg { align-self: flex-end; background: #dcf8c6; } /* Verde messaggi miei */
.msg-author { display: block; font-size: 0.7rem; color: #e67e22; font-weight: bold; margin-bottom: 2px; }
.msg-time { display: block; font-size: 0.65rem; color: #999; text-align: right; margin-top: 2px; }
.no-msg { text-align: center; color: #7f8c8d; margin-top: 20px; }

.chat-input { padding: 10px; background: #f0f0f0; display: flex; gap: 10px; }
.chat-input input { flex: 1; padding: 10px; border-radius: 20px; border: 1px solid #ccc; outline: none; }
.chat-input button { width: 40px; height: 40px; border-radius: 50%; border: none; background: #27ae60; color: white; font-weight: bold; cursor: pointer; }

.blur-chat { flex: 1; display: flex; align-items: center; justify-content: center; background: #eee; color: #7f8c8d; font-style: italic; }
</style>