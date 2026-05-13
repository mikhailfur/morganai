<template>
  <div class="home-view">
    <div v-if="!authStore.isAuthenticated" class="auth-container">
      <div class="logo">Morgan AI</div>
      <h1 class="title">Добро пожаловать в Morgan AI</h1>
      <p class="subtitle">Персональные ИИ-ассистенты в Telegram</p>

      <div v-if="!initialized" class="loading">
        Проверка авторизации...
      </div>

      <div v-else-if="!authenticated" class="error-message">
        Доступ разрешен только из Telegram WebApp
        <br>
        <small>Пожалуйста, откройте через бота в Telegram</small>
      </div>

      <div v-else class="success-message">
        Добро пожаловать, {{ authStore.user?.first_name }}!
        <br>
        <router-link to="/characters" class="button-link">
          Выбрать персонажа
        </router-link>
      </div>
    </div>

    <div v-else class="dashboard">
      <h2>Привет, {{ authStore.user?.first_name }}!</h2>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Статус</div>
          <div class="stat-value" :class="authStore.isPremium ? 'premium' : 'free'">
            {{ authStore.isPremium ? 'Premium' : 'Free' }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Персонаж</div>
          <div class="stat-value">
            {{ userStore.selectedCharacter?.name || 'Не выбран' }}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Режим</div>
          <div class="stat-value">
            {{ userStore.selectedMode?.name || 'Не выбран' }}
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <router-link to="/characters" class="action-card">
          <h3>Персонажи</h3>
          <p>Выберите ИИ-персонажа</p>
        </router-link>

        <router-link to="/modes" class="action-card">
          <h3>Режимы</h3>
          <p>Настройте поведение</p>
        </router-link>

        <router-link to="/subscription" class="action-card">
          <h3>Подписка</h3>
          <p>Управление Premium</p>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

const authStore = useAuthStore()
const userStore = useUserStore()
const initialized = ref(false)
const authenticated = ref(false)

onMounted(async () => {
  // Get initData from Telegram WebApp
  const tg = (window as any).Telegram?.WebApp
  if (tg) {
    tg.ready()

    const initData = tg.initData
    if (initData) {
      const result = await authStore.validateInitData(initData)
      authenticated.value = result
    } else {
      authenticated.value = false
    }
  } else {
    // Not in Telegram WebApp
    authenticated.value = false
  }

  initialized.value = true
})
</script>

<style scoped>
.home-view {
  padding: 2rem;
}

.auth-container {
  max-width: 500px;
  margin: 4rem auto;
  text-align: center;
}

.logo {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 1rem;
}

.title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
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
  font-size: 1.25rem;
  font-weight: 600;
}

.stat-value.premium {
  color: var(--accent);
}

.stat-value.free {
  color: var(--text-secondary);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.action-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  text-decoration: none;
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.action-card:hover {
  border-color: var(--accent);
}

.action-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--accent);
}

.action-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.button-link {
  display: inline-block;
  background: var(--accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 1rem;
}

.error-message {
  color: var(--danger);
  margin-top: 2rem;
}

.success-message {
  margin-top: 2rem;
}
</style>
