<script setup>
import { ref, nextTick, computed } from 'vue';
import { useTreeStore } from '../stores/tree'; // <--- Store
import { useAuthStore } from '../stores/auth';   // <--- Store
import { useUIStore } from '../stores/ui';       // <--- Store

// NIENTE PIÙ PROPS
const treeStore = useTreeStore();
const authStore = useAuthStore();
const uiStore = useUIStore();

const isOpen = ref(false);
const isLoading = ref(false);
const userMessage = ref('');
const messages = ref([{ role: 'assistant', text: 'Ciao! 🌿 Sono Dr. Chlorophyll. Come stanno le tue piante?' }]);
const chatBody = ref(null);

const CATEGORY_MAP = {
  tree: '🌳 Albero', trees: '🌳 Albero', flowerbed: '🌻 Aiuola', 
  vertical_garden: '🧱 Giardino Verticale', hedge: '✂️ Siepe', hedges: '✂️ Siepe', 
  bush: '🌿 Cespuglio / Arbusto', bushes: '🌿 Cespuglio / Arbusto', 
  potted: '🪴 Fioriera', succulent: '🌵 Pianta Grassa', default: '🌱 Pianta Generica'
};

const scrollToBottom = () => nextTick(() => { if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight; });

const sendMessage = async () => {
  if (!userMessage.value.trim() || isLoading.value) return;
  
  const text = userMessage.value;
  messages.value.push({ role: 'user', text });
  userMessage.value = '';
  scrollToBottom();
  isLoading.value = true;

  try {
    // PRENDIAMO I DATI DAGLI STORE
    const myTrees = treeStore.myTrees; // Computed dallo store!
    
    const treesSummary = myTrees.length > 0
      ? myTrees.map(t => {
          const rawCat = t.category ? t.category.toLowerCase() : 'default';
          const catLabel = CATEGORY_MAP[rawCat] || CATEGORY_MAP['default'];
          return `- [${catLabel}] ${t.name} (${t.status}): Acqua ${Math.round(t.waterLevel)}%`;
        }).join('\n')
      : "Nessuna pianta adottata.";

    const contextData = { 
      weather: uiStore.weather, 
      trees_summary: treesSummary 
    };

    // Chiamata diretta (per la chat AI non abbiamo fatto un metodo in api.js, ma va bene fetch qui o puoi spostarla)
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: text, 
        history: messages.value.slice(-6), 
        context: contextData,
        isAdmin: false
      })
    });
    
    const data = await res.json();
    messages.value.push({ role: 'assistant', text: data.message });
  } catch (e) { 
    console.error(e);
    messages.value.push({ role: 'assistant', text: "Errore connessione AI." }); 
  } finally { 
    isLoading.value = false; 
    scrollToBottom(); 
  }
};
</script>

<template>
  <div class="chat-wrapper user-theme">
    <div v-if="isOpen" class="chat-window">
      <div class="header"><span>🌿 Dr. Chlorophyll</span><button @click="isOpen = false">✖</button></div>
      <div class="body" ref="chatBody">
        <div v-for="(msg, i) in messages" :key="i" :class="['msg', msg.role]">{{ msg.text }}</div>
        <div v-if="isLoading" class="msg assistant">...</div>
      </div>
      <div class="footer"><input v-model="userMessage" @keyup.enter="sendMessage" placeholder="Chiedi..." /><button @click="sendMessage">➤</button></div>
    </div>
    <button v-else @click="isOpen = true" class="chat-btn">💬 Dr. Chlorophyll</button>
  </div>
</template>

<style scoped>
/* Incolla lo stile originale */
.chat-wrapper { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; }
.chat-btn { background: #2ecc71; color: white; border: none; padding: 15px 25px; border-radius: 30px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
.chat-window { width: 320px; height: 450px; background: #1e1e1e; border-radius: 15px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border: 1px solid #333; }
.header { background: #27ae60; padding: 15px; color: white; font-weight: bold; display: flex; justify-content: space-between; }
.header button { background: none; border: none; color: white; cursor: pointer; }
.body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #121212; }
.msg { padding: 8px 12px; border-radius: 10px; font-size: 0.9rem; max-width: 80%; }
.msg.assistant { background: #333; color: #ddd; align-self: flex-start; }
.msg.user { background: #2ecc71; color: white; align-self: flex-end; }
.footer { padding: 10px; background: #1e1e1e; display: flex; gap: 10px; }
.footer input { flex: 1; background: #252525; border: 1px solid #444; color: white; padding: 8px; border-radius: 5px; outline: none; }
.footer button { background: #2ecc71; border: none; padding: 0 15px; border-radius: 5px; cursor: pointer; }
</style>