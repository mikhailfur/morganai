<template>
  <div class="modes-view">
    <h1>Выберите режим поведения</h1>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else class="modes-list">
      <div
        v-for="mode in modes"
        :key="mode.id"
        class="mode-card"
        :class="{ selected: userStore.selectedMode?.id === mode.id }"
        @click="selectMode(mode)"
      >
        <div class="mode-info">
          <h3>{{ mode.name }}</h3>
          <p class="mode-prompt">{{ mode.prompt_addition.substring(0, 100) }}...</p>
        </div>
        <div class="mode-badges">
          <span v-if="mode.is_nsfw" class="badge nsfw">NSFW</span>
          <span v-if="mode.is_premium && !authStore.isPremium" class="badge premium">Premium</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import type { BehaviorModeResponse } from '@/types'

const authStore = useAuthStore()
const userStore = useUserStore()

const modes = ref<BehaviorModeResponse[]>([])
const loading = ref(false)

async function fetchModes() {
  loading.value = true
  try {
    const response = await fetch('/api/v1/modes', {
      headers: {
        'Authorization': 'Bearer dummy-token'
      }
    })
    modes.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch modes:', error)
  } finally {
    loading.value = false
  }
}

async function selectMode(mode: BehaviorModeResponse) {
  if (mode.is_premium && !authStore.isPremium) {
    alert('Этот режим доступен только для Premium пользователей')
    return
  }

  if (mode.is_nsfw && !authStore.isPremium) {
    alert('NSFW режим доступен только для Premium пользователей')
    return
  }

  const success = await userStore.selectMode(mode.id)
  if (success) {
    userStore.selectedMode = mode
    alert(`Режим "${mode.name}" выбран!`)
  }
}

onMounted(fetchModes)
</script>

<style scoped>
.modes-view {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
}

.modes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-card {
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mode-card:hover {
  border-color: var(--accent);
}

.mode-card.selected {
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}

.mode-info h3 {
  margin: 0 0 0.5rem 0;
}

.mode-prompt {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.mode-badges {
  display: flex;
  gap: 0.5rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.nsfw {
  background: var(--danger);
  color: white;
}

.badge.premium {
  background: var(--accent);
  color: white;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}
</style>
