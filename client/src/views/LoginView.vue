<script setup>
import Login from '../components/Login.vue';

const emit = defineEmits(['login-success', 'guest-access']);
</script>

<template>
  <Login 
    @login-success="(u) => $emit('login-success', u)" 
    @guest-access="() => $emit('guest-access')" 
  />
</template>