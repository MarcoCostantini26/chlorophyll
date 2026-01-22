<script setup>
import UserChatWidget from './UserChatWidget.vue';
import AdminChatWidget from './AdminChatWidget.vue';

const props = defineProps(['user', 'trees', 'weather']);
</script>

<template>
  <div class="fab-manager-container">
    <div v-if="!user"></div>

    <AdminChatWidget 
      v-else-if="user.role === 'city_manager'" 
      :key="`admin-${user._id}`"
    />

    <UserChatWidget 
      v-else 
      :trees="trees" 
      :weather="weather" 
      :key="`user-${user._id}`"
    />
  </div>
</template>

<style scoped>
/* Un contenitore semplice che non interferisce con il layout fisso dei figli */
.fab-manager-container {
  display: contents;
}
</style>