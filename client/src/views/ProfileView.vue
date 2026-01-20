<script setup>
import UserProfile from '../components/UserProfile.vue';

const props = defineProps(['user']); // Riceve user da App.vue
const emit = defineEmits(['logout', 'update-profile']);
</script>

<template>
  <div class="view-container">
    <UserProfile 
      :user="props.user" 
      @back="$router.push('/')" 
      @logout="$emit('logout')"
      @update-profile="(u) => $emit('update-profile', u)"
    />
  </div>
</template>

<style scoped>
.view-container { padding-top: 40px; }
</style>