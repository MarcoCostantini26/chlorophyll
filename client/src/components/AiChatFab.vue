<script setup>
import { ref, nextTick, watch } from 'vue';

const isOpen = ref(false);
const userMessage = ref('');
const messages = ref([
  { role: 'assistant', text: 'Ciao! Sono Dr. Chlorophyll 🌿. Come posso aiutarti oggi con le tue piante?' }
]);
const isLoading = ref(false);
const chatBody = ref(null);

const toggleChat = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) scrollToBottom();
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight;
  });
};

const sendMessage = async () => {
  if (!userMessage.value.trim() || isLoading.value) return;

  // 1. Aggiungi messaggio utente
  const text = userMessage.value;
  messages.value.push({ role: 'user', text });
  userMessage.value = '';
  scrollToBottom();
  isLoading.value = true;

  try {
    // 2. Prepara la storia (ultimi 4 messaggi per contesto) per l'API
    const history = messages.value.slice(-4).map(m => ({
      role: m.role,
      content: m.text
    }));

    // 3. Chiama il server
    const res = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    });

    const data = await res.json();

    // 4. Aggiungi risposta AI
    messages.value.push({ role: 'assistant', text: data.message });
  } catch (e) {
    messages.value.push({ role: 'assistant', text: "😵‍💫 Ho un po' di nebbia nei circuiti. Riprova più tardi." });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};
</script>

<template>
  <div class="ai-widget-container">
    
    <div v-if="isOpen" class="chat-window">
      <div class="chat-header">
        <div class="bot-info">
          <div class="bot-avatar">🤖</div>
          <div>
            <h4>Dr. Chlorophyll</h4>
            <span class="status">Online</span>
          </div>
        </div>
        <button @click="toggleChat" class="close-btn">✖</button>
      </div>

      <div class="chat-body" ref="chatBody">
        <div 
          v-for="(msg, idx) in messages" 
          :key="idx" 
          class="message-row" 
          :class="msg.role"
        >
          <div class="bubble">
            {{ msg.text }}
          </div>
        </div>
        
        <div v-if="isLoading" class="message-row assistant">
          <div class="bubble typing">...</div>
        </div>
      </div>

      <div class="chat-footer">
        <input 
          v-model="userMessage" 
          @keyup.enter="sendMessage"
          placeholder="Chiedi qualcosa sulla natura..." 
          autofocus
        />
        <button @click="sendMessage" :disabled="!userMessage.trim()">➤</button>
      </div>
    </div>

    <button class="fab-btn" @click="toggleChat">
      <span v-if="!isOpen" class="icon">💬</span>
      <span v-else class="icon">🔽</span>
    </button>

  </div>
</template>

<style scoped>
.ai-widget-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-family: 'Inter', sans-serif;
}

/* FAB BUTTON */
.fab-btn {
  width: 60px; height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border: none;
  box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
}
.fab-btn:hover { transform: scale(1.1); }

/* CHAT WINDOW */
.chat-window {
  width: 350px;
  height: 500px;
  background: #1e1e1e;
  border-radius: 20px;
  margin-bottom: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  display: flex; flex-direction: column;
  overflow: hidden;
  border: 1px solid #333;
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-header {
  background: #27ae60;
  padding: 15px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.bot-info { display: flex; gap: 10px; align-items: center; }
.bot-avatar { background: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.bot-info h4 { margin: 0; font-size: 1rem; }
.status { font-size: 0.75rem; opacity: 0.9; }
.close-btn { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; }

.chat-body {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
  background-image: radial-gradient(#333 1px, transparent 1px);
  background-size: 20px 20px;
}

/* MESSAGGI */
.message-row { display: flex; }
.message-row.user { justify-content: flex-end; }
.message-row.assistant { justify-content: flex-start; }

.bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.4;
  color: #ecf0f1;
}
.message-row.user .bubble {
  background: #27ae60;
  color: white;
  border-bottom-right-radius: 2px;
}
.message-row.assistant .bubble {
  background: #333;
  border-bottom-left-radius: 2px;
}
.typing { font-style: italic; color: #aaa; }

.chat-footer {
  padding: 10px;
  background: #252525;
  border-top: 1px solid #333;
  display: flex; gap: 10px;
}
.chat-footer input {
  flex: 1;
  background: #151515; border: 1px solid #444;
  padding: 10px; border-radius: 20px;
  color: white; outline: none;
}
.chat-footer input:focus { border-color: #2ecc71; }
.chat-footer button {
  background: #2ecc71; color: white; border: none;
  width: 40px; height: 40px; border-radius: 50%;
  cursor: pointer; font-size: 1.2rem;
}
.chat-footer button:disabled { background: #444; color: #777; cursor: not-allowed; }

@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 480px) {
  .chat-window { width: 90vw; height: 70vh; right: 0; bottom: 80px; }
  .ai-widget-container { right: 20px; bottom: 20px; }
}
</style>