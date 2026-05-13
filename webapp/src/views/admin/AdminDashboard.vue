<template>
  <div class="admin-dashboard">
    <h1>Админ-панель</h1>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Всего пользователей</div>
          <div class="stat-value">{{ stats.total_users }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Premium пользователи</div>
          <div class="stat-value premium">{{ stats.premium_users }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Активные подписки</div>
          <div class="stat-value">{{ stats.active_subscriptions }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">% Premium</div>
          <div class="stat-value">{{ stats.premium_percentage }}%</div>
        </div>
      </div>

      <div class="admin-actions">
        <h2>Управление пользователями</h2>
        <div class="grant-premium">
          <input
            v-model="grantUserId"
            type="number"
            placeholder="Telegram ID пользователя"
            class="input"
          >
          <input
            v-model="grantDays"
            type="number"
            placeholder="Дней Premium"
            class="input"
          >
          <button @click="grantPremium" :disabled="!grantUserId" class="btn">
            Выдать Premium
          </button>
        </div>

        <p v-if="grantMessage" class="message" :class="grantSuccess ? 'success' : 'error'">
          {{ grantMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  total_users: 0,
  premium_users: 0,
  active_subscriptions: 0,
  premium_percentage: 0
})
const loading = ref(false)
const grantUserId = ref('')
const grantDays = ref(30)
const grantMessage = ref('')
const grantSuccess = ref(false)

async function fetchStats() {
  loading.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${apiUrl}/api/v1/admin/stats`, {
      headers: { 'Authorization': 'Bearer dummy-token' }
    })
    stats.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    loading.value = false
  }
}

async function grantPremium() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(
      `${apiUrl}/api/v1/admin/users/${grantUserId.value}/grant-premium?days=${grantDays.value}`,
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer dummy-token' }
      }
    )

    if (response.ok) {
      grantMessage.value = `Premium успешно выдан пользователю ${grantUserId.value} на ${grantDays.value} дней`
      grantSuccess.value = true
      grantUserId.value = ''
      await fetchStats()
    } else {
      grantMessage.value = 'Ошибка при выдаче Premium'
      grantSuccess.value = false
    }
  } catch (error) {
    grantMessage.value = 'Ошибка при выдаче Premium'
    grantSuccess.value = false
  }
}

onMounted(fetchStats)
</script>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-value.premium {
  color: var(--accent);
}

.admin-actions {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
}

h2 {
  margin: 0 0 1.5rem 0;
}

.grant-premium {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.input {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  color: var(--text-primary);
  font-size: 1rem;
}

.btn {
  background: var(--accent);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.message.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.message.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}
</style>
