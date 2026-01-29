<script setup>
import { ref, nextTick } from 'vue';
import { useTreeStore } from '../stores/tree'; // <--- USIAMO LO STORE ALBERI

// NIENTE PIÙ PROPS
const treeStore = useTreeStore();

const isOpen = ref(false);
const isLoading = ref(false);
const userMessage = ref('');
const messages = ref([
  { role: 'assistant', text: 'Benvenuto Admin. City Brain online. 🧠' }
]);
const chatBody = ref(null);

const scrollToBottom = () => nextTick(() => { if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight; });

const sendMessage = async () => {
  if (!userMessage.value.trim() || isLoading.value) return;

  const text = userMessage.value;
  messages.value.push({ role: 'user', text });
  userMessage.value = '';
  scrollToBottom();
  isLoading.value = true;

  try {
    // 1. PRENDIAMO I DATI DALLO STORE (Reattività live!)
    const allTrees = treeStore.trees || [];
    
    // Calcoli statistici (identici a prima, ma su dati store)
    const totalTrees = allTrees.length;
    const criticalList = allTrees.filter(t => t.status === 'critical');
    const thirstyList = allTrees.filter(t => t.status === 'thirsty');
    const totalWater = allTrees.reduce((sum, t) => sum + t.waterLevel, 0);
    const avgWater = totalTrees > 0 ? Math.round(totalWater / totalTrees) : 0;

    // 2. GENERIAMO LA LISTA COMPLETA DEI NOMI
    const fullTreeList = allTrees.map(t => 
      `- ${t.name} [${t.status.toUpperCase()}, ${Math.round(t.waterLevel)}%]`
    ).join('\n');

    const contextData = {
      totalTrees,
      criticalTrees: criticalList.length,
      thirstyTrees: thirstyList.length,
      avgWater,
      fullTreeList: fullTreeList 
    };

    // 3. INVIO AL SERVER
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: text, 
        history: messages.value.slice(-6), 
        context: contextData,
        isAdmin: true 
      })
    });

    const data = await res.json();
    messages.value.push({ role: 'assistant', text: data.message });

  } catch (e) {
    console.error(e);
    messages.value.push({ role: 'assistant', text: "Errore connessione sistema." });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};
</script>

<template>
  <div class="chat-wrapper admin-theme">
    
    <div v-if="isOpen" class="chat-window">
      <div class="header">
        <div class="header-title">
          <span>🎛️ City Brain AI</span>
          <span class="status-dot"></span>
        </div>
        <button @click="isOpen = false">✖</button>
      </div>

      <div class="body" ref="chatBody">
        <div v-for="(msg, i) in messages" :key="i" :class="['msg', msg.role]">
          {{ msg.text }}
        </div>
        <div v-if="isLoading" class="msg assistant typing">Analisi dati in corso...</div>
      </div>

      <div class="footer">
        <input 
          v-model="userMessage" 
          @keyup.enter="sendMessage" 
          placeholder="Es: Quanti alberi sono critici?" 
          autofocus
        />
        <button @click="sendMessage">➤</button>
      </div>
    </div>
    
    <button v-else @click="isOpen = true" class="chat-btn">
      ⚙️ Assistente Admin
    </button>
  </div>
</template>

<style scoped>
/* STESSO STILE DI PRIMA */
.chat-wrapper { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; font-family: 'Inter', sans-serif; }

/* STILE VIOLA (Admin) */
.chat-btn { 
  background: #8e44ad; color: white; border: none; padding: 15px 25px; 
  border-radius: 30px; font-weight: bold; cursor: pointer; 
  box-shadow: 0 4px 15px rgba(142, 68, 173, 0.4); 
  transition: transform 0.2s;
}
.chat-btn:hover { transform: scale(1.05); background: #9b59b6; }

.chat-window { 
  width: 350px; height: 500px; background: #1e1e1e; border-radius: 15px; 
  display: flex; flex-direction: column; overflow: hidden; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.6); border: 2px solid #8e44ad; 
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.header { 
  background: #8e44ad; padding: 15px; color: white; font-weight: bold; 
  display: flex; justify-content: space-between; align-items: center; 
}
.header-title { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 8px; height: 8px; background: #2ecc71; border-radius: 50%; box-shadow: 0 0 5px #2ecc71; }
.header button { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; }

.body { 
  flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; 
  background: #121212; 
}

.msg { padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; max-width: 85%; line-height: 1.4; }
.msg.assistant { background: #2c3e50; color: #ecf0f1; align-self: flex-start; border-bottom-left-radius: 2px; border: 1px solid #34495e; }
.msg.user { background: #8e44ad; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.typing { font-style: italic; color: #7f8c8d; font-size: 0.8rem; }

.footer { padding: 12px; background: #1e1e1e; display: flex; gap: 10px; border-top: 1px solid #333; }
.footer input { 
  flex: 1; background: #252525; border: 1px solid #444; color: white; 
  padding: 10px; border-radius: 8px; outline: none; 
}
.footer input:focus { border-color: #8e44ad; }
.footer button { background: #8e44ad; border: none; padding: 0 15px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; }

@keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>