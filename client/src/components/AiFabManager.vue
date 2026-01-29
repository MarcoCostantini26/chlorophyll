<script setup>
import { useAuthStore } from '../stores/auth';
import UserChatWidget from './UserChatWidget.vue';
import AdminChatWidget from './AdminChatWidget.vue';

const authStore = useAuthStore();
// Nessuna prop necessaria!
</script>

<template>
  <div class="fab-manager-container">
    <AdminChatWidget 
      v-if="authStore.isAdmin" 
      :key="'admin'" 
    />
    <UserChatWidget 
      v-else-if="authStore.isUser" 
      :key="'user'" 
    />
  </div>
</template>

<style scoped>
.fab-manager-container { display: contents; }
</style>