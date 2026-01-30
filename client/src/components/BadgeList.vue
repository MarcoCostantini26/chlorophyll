<script setup>
import { ref, computed } from 'vue';

const props = defineProps(['user']);
const selectedBadge = ref(null);

const allBadges = [
  { id: 'FIRST_DROP', icon: '💧', name: 'Prima Goccia', desc: 'Hai curato la tua prima pianta.', criteria: 'Effettua 1 innaffiatura.' },
  { id: 'SAVER', icon: '🚑', name: 'Soccorritore', desc: 'Hai salvato una vita vegetale.', criteria: 'Innaffia un albero con acqua < 20%.' },
  { id: 'VETERAN', icon: '🎖️', name: 'Veterano', desc: 'La costanza è la tua forza.', criteria: 'Raggiungi 20 innaffiature totali.' },
  { id: 'GREEN_THUMB', icon: '🌿', name: 'Pollice Verde', desc: 'Maestro della flora.', criteria: 'Raggiungi il livello 5.' },
  { id: 'GUARDIAN', icon: '🛡️', name: 'Guardiano', desc: 'Hai adottato un albero.', criteria: 'Adotta un albero dalla dashboard.' }
];

const hasBadge = (badgeId) => props.user && props.user.badges && props.user.badges.includes(badgeId);
const unlockedCount = computed(() => (!props.user || !props.user.badges) ? 0 : props.user.badges.length);
const openDetail = (badge) => selectedBadge.value = badge;
</script>

<template>
  <div class="badge-card">
    <div class="card-header">
      <h3>🏆 Bacheca Trofei</h3>
      <span class="counter">{{ unlockedCount }} / {{ allBadges.length }}</span>
    </div>
    
    <div class="badge-scroll-container">
      <div 
        v-for="badge in allBadges" 
        :key="badge.id" 
        class="badge-slot"
        :class="{ 'unlocked': hasBadge(badge.id), 'locked': !hasBadge(badge.id) }"
        @click="openDetail(badge)"
      >
        <div class="icon-circle">
          <span v-if="hasBadge(badge.id)" class="emoji">{{ badge.icon }}</span>
          <span v-else class="lock">🔒</span>
        </div>
        <span class="mini-name">{{ badge.name }}</span>
      </div>
    </div>

    <div v-if="selectedBadge" class="modal-overlay" @click.self="selectedBadge = null">
      <div class="detail-card">
        <button class="close-btn" @click="selectedBadge = null">✖</button>
        <div class="detail-icon" :class="{ 'gray': !hasBadge(selectedBadge.id) }">{{ selectedBadge.icon }}</div>
        <h2>{{ selectedBadge.name }}</h2>
        <div class="status-tag" :class="hasBadge(selectedBadge.id) ? 'tag-green' : 'tag-gray'">
          {{ hasBadge(selectedBadge.id) ? 'SBLOCCATO ✅' : 'BLOCCATO 🔒' }}
        </div>
        <p class="desc">"{{ selectedBadge.desc }}"</p>
        <div class="criteria-box"><strong>Come ottenerlo:</strong><p>{{ selectedBadge.criteria }}</p></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge-card {
  background: white; 
  padding: 10px 15px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
  border: 1px solid #eee;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden; 
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  border-bottom: 1px solid #f8f9fa;
  padding-bottom: 5px;
}

h3 { margin: 0; font-size: 0.9rem; color: #2c3e50; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.counter { background: #eef2f3; padding: 2px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: bold; color: #7f8c8d; }

.badge-scroll-container {
  display: flex;
  gap: 10px; 
  overflow-x: auto; 
  padding-bottom: 4px;
  scroll-behavior: smooth;
  align-items: center; 
  height: 100%; 
}

.badge-scroll-container::-webkit-scrollbar { height: 4px; }
.badge-scroll-container::-webkit-scrollbar-track { background: transparent; }
.badge-scroll-container::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }

.badge-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
  
  flex: 0 0 calc((100% - 40px) / 5);
  min-width: 60px; 
}

.badge-slot:hover { transform: translateY(-3px); }

.icon-circle {
  width: 100%; 
  aspect-ratio: 1 / 1; 
  max-width: 55px;
  
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  
  font-size: 1.6rem;
  
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
  margin-bottom: 2px; 
  transition: all 0.3s;
  border: 2px solid transparent;
}

.unlocked .icon-circle { background: linear-gradient(135deg, #fff, #fef9e7); border-color: #f1c40f; box-shadow: 0 0 10px rgba(241, 196, 15, 0.4); }
.locked .icon-circle { background: #f1f2f6; border-color: #dfe4ea; color: #bdc3c7; }
.locked .lock { font-size: 1.1rem; opacity: 0.5; }

.mini-name { 
  font-size: 0.6rem; 
  text-align: center; 
  font-weight: bold; 
  color: #2c3e50; 
  line-height: 1; 
  white-space: nowrap; 
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.locked .mini-name { color: #95a5a6; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 5000; display: flex; justify-content: center; align-items: center; padding: 20px; }
.detail-card { background: white; width: 100%; max-width: 320px; padding: 30px; border-radius: 20px; text-align: center; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.3); animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.close-btn { position: absolute; top: 15px; right: 15px; z-index: 10; background: #f1f2f6; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #7f8c8d; font-size: 1.1rem; font-weight: bold; transition: all 0.2s ease; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.close-btn:hover { background: #e74c3c; color: white; transform: scale(1.1); box-shadow: 0 4px 10px rgba(231, 76, 60, 0.3); }
.close-btn:active { transform: scale(0.95); }
.detail-icon { font-size: 4rem; margin-bottom: 10px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.1)); position: relative; z-index: 1; }
.detail-icon.gray { filter: grayscale(100%) opacity(0.5); }
.detail-card h2 { margin: 0 0 10px 0; color: #2c3e50; }
.status-tag { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; margin-bottom: 20px; }
.tag-green { background: #d4efdf; color: #27ae60; }
.tag-gray { background: #f2f3f4; color: #7f8c8d; }
.desc { font-style: italic; color: #555; margin-bottom: 20px; font-size: 0.95rem; }
.criteria-box { background: #f8f9fa; padding: 15px; border-radius: 12px; border: 1px dashed #ccc; text-align: left; }
.criteria-box strong { display: block; font-size: 0.8rem; color: #e67e22; text-transform: uppercase; margin-bottom: 5px; }
.criteria-box p { margin: 0; font-size: 0.9rem; color: #2c3e50; }
@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>