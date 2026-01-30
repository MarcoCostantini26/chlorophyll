<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useUIStore } from '../stores/ui';

const username = ref('');
const error = ref('');
const authStore = useAuthStore();
const uiStore = useUIStore();
const router = useRouter();

const handleLogin = async () => {
  if (!username.value) return;
  error.value = '';

  try {
    await authStore.login(username.value);
    
    proceedToApp();
  } catch (e) {
    error.value = "Utente non trovato o errore server.";
  }
};

const handleGuest = () => {
  authStore.guestAccess();
  proceedToApp();
};

const proceedToApp = async () => {
  uiStore.isWidgetAlive = false; 
  await router.push('/');
  setTimeout(() => uiStore.isWidgetAlive = true, 100);
};
</script>

<template>
  <div class="login-overlay">
    <div class="login-card">
      <div class="logo">🍃</div>
      <h2>Benvenuto in Chlorophyll</h2>
      <p>Gestisci il verde urbano della tua città.</p>

      <div class="form-group">
        <input 
          v-model="username" 
          type="text" 
          placeholder="Inserisci il tuo Username..." 
          @keyup.enter="handleLogin"
        />
        <button @click="handleLogin" class="btn-primary">Accedi</button>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div class="divider">oppure</div>

      <button @click="handleGuest" class="btn-secondary">
        Entra come Public Monitor (Ospite)
      </button>
    </div>
  </div>
</template>

<style scoped>
.login-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: linear-gradient(135deg, #2ecc71, #2c3e50); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.login-card { background: white; padding: 40px; border-radius: 20px; text-align: center; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
.logo { font-size: 4rem; margin-bottom: 10px; }
h2 { color: #2c3e50; margin-bottom: 5px; }
p { color: #7f8c8d; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 10px; }
input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; }
.btn-primary { background: #27ae60; color: white; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1rem; }
.btn-primary:hover { background: #219150; }
.divider { margin: 20px 0; color: #aaa; font-size: 0.9rem; }
.btn-secondary { background: transparent; border: 2px solid #95a5a6; color: #7f8c8d; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
.btn-secondary:hover { background: #f4f7f6; color: #333; border-color: #333; }
.error-msg { color: #e74c3c; margin-top: 10px; font-size: 0.9rem; }
</style>