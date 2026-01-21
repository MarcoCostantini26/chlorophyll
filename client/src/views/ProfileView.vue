<script setup>
import UserProfile from '../components/UserProfile.vue';

// Riceviamo 'trees' da App.vue per mostrare i dettagli delle piante adottate
const props = defineProps(['user', 'trees']); 
const emit = defineEmits(['logout', 'update-profile']);
</script>

<template>
  <div class="view-container">
    <UserProfile 
      :user="props.user" 
      :trees="props.trees"
      @back="$router.push('/')" 
      @logout="$emit('logout')"
      @update-profile="(u) => $emit('update-profile', u)"
    />
  </div>
</template>

<style scoped>
.view-container { 
  /* Rimuovi padding extra se gestito globalmente, o lascialo minimo */
  width: 100%;
}
</style>