<template>
  <div class="min-h-screen bg-claude-bg p-4">
    <h1 class="text-2xl font-bold mb-6 text-claude-text">Профиль</h1>
    
    <div class="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
      <div v-if="loading" class="text-center py-8 text-claude-subtext">
        Загрузка профиля...
      </div>
      
      <div v-else-if="error" class="text-red-500 p-4 bg-red-50 rounded-lg">
        {{ error }}
      </div>
      
      <div v-else-if="userData">
        <div class="mb-4">
          <h3 class="font-semibold text-lg mb-2">Данные Telegram</h3>
          <pre class="bg-claude-bg p-3 rounded-lg text-sm overflow-auto">{{ JSON.stringify(userData.telegram_user, null, 2) }}</pre>
        </div>
        
        <div class="text-claude-subtext text-sm">
          <p>ID: <code class="bg-claude-bg px-1 rounded">{{ userData.telegram_user?.id }}</code></p>
          <p>Имя: {{ userData.telegram_user?.first_name }} {{ userData.telegram_user?.last_name }}</p>
          <p>Юзернейм: @{{ userData.telegram_user?.username }}</p>
        </div>
      </div>
      
      <div v-else class="text-center py-8 text-claude-subtext">
        Данные профиля не загружены
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import apiClient from '../services/api.js'

const userData = ref(null)
const loading = ref(false)
const error = ref(null)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const response = await apiClient.get('/api/users/me')
    userData.value = response.data
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err)
    error.value = 'Не удалось загрузить данные профиля'
  } finally {
    loading.value = false
  }
})
</script>
