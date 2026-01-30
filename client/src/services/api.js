const BASE_URL = 'http://localhost:3000/api';

export const api = {
  async getTrees() {
    const res = await fetch(`${BASE_URL}/trees`);
    return res.json();
  },
  async getTreeDetail(id) {
    const res = await fetch(`${BASE_URL}/trees/${id}`);
    if (!res.ok) throw new Error('Albero non trovato');
    return res.json();
  },
  
  async login(username) {
    const res = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!res.ok) throw new Error('Login fallito');
    return res.json();
  },
  
  async adoptTree(userId, treeId) {
    const res = await fetch(`${BASE_URL}/users/adopt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, treeId })
    });
    if (!res.ok) throw new Error('Errore adozione');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${BASE_URL}/admin/stats`);
    if (!res.ok) throw new Error('Errore stats');
    return res.json();
  },
  async getLogs() {
    const res = await fetch(`${BASE_URL}/admin/logs`);
    if (!res.ok) throw new Error('Errore logs');
    return res.json();
  },
  async clearLogs() {
    await fetch(`${BASE_URL}/admin/logs`, { method: 'DELETE' });
  },

  async updateProfile(userId, data) {
    const res = await fetch(`${BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Errore aggiornamento profilo");
    return res.json();
  },

  async getForecast(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,weathercode&forecast_days=2&timezone=auto`;
    const res = await fetch(url);
    return res.json();
  },

  async getAnalytics() {
    const res = await fetch(`${BASE_URL}/admin/analytics`);
    if (!res.ok) throw new Error('Errore analytics');
    return res.json();
  }
};