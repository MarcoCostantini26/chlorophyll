import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // Assumo che il router sia qui

import './assets/main.css' // Importiamo il CSS globale

const app = createApp(App)

app.use(createPinia()) // Attiviamo Pinia
app.use(router)

app.mount('#app')