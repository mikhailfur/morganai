<template>
  <div class="subscription-view">
    <h1>Управление подпиской</h1>

    <div v-if="authStore.isPremium" class="current-subscription">
      <h2>Текущая подписка</h2>
      <div class="subscription-info">
        <p><strong>Статус:</strong> <span class="premium-badge">Premium</span></p>
        <p><strong>Действует до:</strong> {{ formatDate(authStore.user?.premium_expires_at ?? null) }}</p>
      </div>
    </div>

    <h2>Доступные тарифы</h2>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else class="plans-grid">
        <div
          v-for="(plan, key) in plans"
          :key="String(key)"
          class="plan-card"
        >
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="price-rub">{{ plan.price_rub }} ₽</span>
          <span class="price-usd">${{ plan.price_usd }}</span>
        </div>
        <button
          @click="subscribe(String(key))"
          :disabled="processing"
          class="subscribe-btn"
        >
          {{ processing ? 'Обработка...' : 'Оформить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { SubscriptionPlans } from '@/types'

const authStore = useAuthStore()

const plans = ref<SubscriptionPlans>({})
const loading = ref(false)
const processing = ref(false)

async function fetchPlans() {
  loading.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${apiUrl}/api/v1/subscription/plans`)
    plans.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch plans:', error)
  } finally {
    loading.value = false
  }
}

async function subscribe(planKey: string) {
  processing.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    // Determine payment gateway based on user location
    const gateway = 'tribute' // or 'paddle' for global
    const response = await fetch(`${apiUrl}/api/v1/subscription/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authStore.user?.telegram_id,
        plan_type: planKey,
        payment_gateway: gateway
      })
    })

    if (response.ok) {
      alert('Перенаправление на оплату...')
      // In real implementation, redirect to payment URL
    }
  } catch (error) {
    console.error('Subscription failed:', error)
    alert('Ошибка при оформлении подписки')
  } finally {
    processing.value = false
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Н/Д'
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

onMounted(fetchPlans)
</script>

<style scoped>
.subscription-view {
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 1rem;
}

h2 {
  margin: 2rem 0 1rem 0;
}

.current-subscription {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.premium-badge {
  background: var(--accent);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.plan-card {
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  transition: border-color 0.2s;
}

.plan-card:hover {
  border-color: var(--accent);
}

.plan-card h3 {
  margin: 0 0 1rem 0;
  color: var(--accent);
}

.price {
  margin: 1rem 0;
}

.price-rub {
  font-size: 2rem;
  font-weight: 700;
  display: block;
}

.price-usd {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.subscribe-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}
</style>
