<script setup>
import { ref, computed } from 'vue';

const props = defineProps(['user']);

// Stato per il modale di dettaglio
const selectedBadge = ref(null);

// Definizione completa dei Badge (Metadati)
const allBadges = [
  { 
    id: 'FIRST_DROP', 
    icon: '💧', 
    name: 'Prima Goccia', 
    desc: 'Il primo passo di un lungo viaggio.',
    criteria: 'Innaffia il tuo primo albero.' 
  },
  { 
    id: 'SAVER', 
    icon: '🚑', 
    name: 'Soccorritore', 
    desc: 'Un vero eroe della natura.',
    criteria: 'Salva un albero in stato "Critico" (Rosso).' 
  },
  { 
    id: 'VETERAN', 
    icon: '🎖️', 
    name: 'Veterano', 
    desc: 'La costanza è la chiave.',
    criteria: 'Effettua 20 innaffiature totali.' 
  },
  { 
    id: 'NIGHT_OWL', 
    icon: '🌙', 
    name: 'Guardiano Notturno', 
    desc: 'La natura non dorme mai.',
    criteria: 'Innaffia un albero tra le 22:00 e le 05:00.' 
  }
];

// Helper: Controlla se l'utente ha il badge
const hasBadge = (badgeId) => {
  return props.user && props.user.badges && props.user.badges.includes(badgeId);
};

// Calcolo statistiche
const unlockedCount = computed(() => {
  if (!props.user || !props.user.badges) return 0;
  return props.user.badges.length;
});

const openDetail = (badge) => {
  selectedBadge.value = badge;
};
</script>

<template>
  <div class="badge-card">
    <div class="card-header">
      <h3>🏆 Bacheca Trofei</h3>
      <span class="counter">{{ unlockedCount }} / {{ allBadges.length }}</span>
    </div>
    
    <div class="badge-grid">
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
        
        <div class="detail-icon" :class="{ 'gray': !hasBadge(selectedBadge.id) }">
          {{ selectedBadge.icon }}
        </div>
        
        <h2>{{ selectedBadge.name }}</h2>
        
        <div class="status-tag" :class="hasBadge(selectedBadge.id) ? 'tag-green' : 'tag-gray'">
          {{ hasBadge(selectedBadge.id) ? 'SBLOCCATO ✅' : 'BLOCCATO 🔒' }}
        </div>

        <p class="desc">"{{ selectedBadge.desc }}"</p>
        
        <div class="criteria-box">
          <strong>Come ottenerlo:</strong>
          <p>{{ selectedBadge.criteria }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Card Principale */
.badge-card {
  background: white; 
  padding: 20px; 
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
  border: 1px solid #eee;
  width: 100%;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #f8f9fa;
  padding-bottom: 10px;
}

h3 { margin: 0; font-size: 1.1rem; color: #2c3e50; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.counter { background: #eef2f3; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; color: #7f8c8d; }

/* Griglia */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); /* Responsive */
  gap: 15px;
  justify-items: center;
}

.badge-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
  width: 100%;
}

.badge-slot:hover { transform: translateY(-5px); }

/* Cerchio Icona */
.icon-circle {
  width: 60px; height: 60px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  margin-bottom: 8px;
  transition: all 0.3s;
  border: 3px solid transparent;
}

/* Stile Sbloccato */
.unlocked .icon-circle {
  background: linear-gradient(135deg, #fff, #fef9e7);
  border-color: #f1c40f;
  box-shadow: 0 0 15px rgba(241, 196, 15, 0.4);
}

/* Stile Bloccato */
.locked .icon-circle {
  background: #f1f2f6;
  border-color: #dfe4ea;
  color: #bdc3c7;
}
.locked .lock { font-size: 1.2rem; opacity: 0.5; }

.mini-name {
  font-size: 0.7rem;
  text-align: center;
  font-weight: bold;
  color: #2c3e50;
  line-height: 1.2;
}
.locked .mini-name { color: #95a5a6; }

/* --- MODALE DETTAGLIO --- */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.6); /* Sfondo scuro sfocato */
  backdrop-filter: blur(4px);
  z-index: 5000;
  display: flex; justify-content: center; align-items: center;
  padding: 20px;
}

.detail-card {
  background: white;
  width: 100%; max-width: 320px;
  padding: 30px;
  border-radius: 20px;
  text-align: center;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* In client/src/components/BadgeList.vue -> <style scoped> */

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #f1f2f6; /* Sfondo grigio chiaro */
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #7f8c8d;
  width: 36px;  /* Dimensione fissa per fare un cerchio */
  height: 36px;
  border-radius: 50%; /* Cerchio perfetto */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease; /* Animazione fluida */
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.close-btn:hover {
  background: #e74c3c; /* Diventa rosso all'hover */
  color: white;
  transform: rotate(90deg); /* Ruota leggermente per effetto dinamico */
  box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
}

.detail-icon {
  font-size: 4rem; margin-bottom: 10px;
  filter: drop-shadow(0 5px 10px rgba(0,0,0,0.1));
}
.detail-icon.gray { filter: grayscale(100%) opacity(0.5); }

.detail-card h2 { margin: 0 0 10px 0; color: #2c3e50; }

.status-tag {
  display: inline-block; padding: 5px 12px; border-radius: 20px;
  font-size: 0.75rem; font-weight: bold; margin-bottom: 20px;
}
.tag-green { background: #d4efdf; color: #27ae60; }
.tag-gray { background: #f2f3f4; color: #7f8c8d; }

.desc { font-style: italic; color: #555; margin-bottom: 20px; font-size: 0.95rem; }

.criteria-box {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  border: 1px dashed #ccc;
  text-align: left;
}
.criteria-box strong { display: block; font-size: 0.8rem; color: #e67e22; text-transform: uppercase; margin-bottom: 5px; }
.criteria-box p { margin: 0; font-size: 0.9rem; color: #2c3e50; }

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>