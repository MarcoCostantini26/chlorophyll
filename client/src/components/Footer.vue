<script setup>
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      
      <div class="footer-left">
        <h3>🍃 Chlorophyll</h3>
        <span class="separator">|</span>
        <p>Città più verdi, vite migliori.</p>
      </div>

      <div class="footer-right">
        <p>&copy; {{ currentYear }} Chlorophyll.</p>
      </div>

    </div>
  </footer>
</template>

<style scoped>
/* 1. SFONDO FULL WIDTH */
.app-footer {
  width: 100%;
  background-color: #1e1e1e;
  border-top: 3px solid #2ecc71;
  color: #95a5a6;
  font-family: 'Inter', sans-serif;
  margin-top: auto; /* Spinge in basso se usato con flexbox */
}

/* 2. CONTENUTO CENTRATO MA SFONDO ESTESO */
.footer-inner {
  max-width: 1400px; /* Stessa larghezza dell'header */
  margin: 0 auto;
  padding: 15px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

h3 {
  margin: 0;
  color: #2ecc71;
  font-size: 1.1rem;
  font-weight: 700;
}

p {
  margin: 0;
  font-size: 0.9rem;
}

.separator {
  color: #444;
  font-size: 1.2rem;
}

@media (max-width: 600px) {
  .footer-inner {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  .separator { display: none; }
}
</style>