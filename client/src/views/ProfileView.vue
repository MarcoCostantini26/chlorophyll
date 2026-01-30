<script setup>
import UserProfile from '../components/UserProfile.vue';
</script>

<template>
  <div class="view-container">
    <UserProfile @back="$router.push('/')" />
  </div>
</template>

<style scoped>
.view-container { width: 100%; }
</style>