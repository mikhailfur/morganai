import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserResponse } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref<UserResponse | null>(null)
  const initData = ref('')

  const isPremium = computed(() => user.value?.is_premium || false)

  async function validateInitData(data: string) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiUrl}/api/v1/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: data })
      })

      const result = await response.json()

      if (result.valid) {
        isAuthenticated.value = true
        user.value = result.user
        initData.value = data
        return true
      }

      return false
    } catch (error) {
      console.error('Auth validation failed:', error)
      return false
    }
  }

  function logout() {
    isAuthenticated.value = false
    user.value = null
    initData.value = ''
  }

  return {
    isAuthenticated,
    user,
    initData,
    isPremium,
    validateInitData,
    logout
  }
})
