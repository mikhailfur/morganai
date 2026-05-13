import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CharacterResponse, BehaviorModeResponse } from '@/types'

export const useUserStore = defineStore('user', () => {
  const selectedCharacter = ref<CharacterResponse | null>(null)
  const selectedMode = ref<BehaviorModeResponse | null>(null)

  async function selectCharacter(characterId: number) {
    try {
      const response = await fetch(`/api/v1/users/${characterId}/select-character`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function selectMode(modeId: number) {
    try {
      const response = await fetch(`/api/v1/users/${modeId}/select-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return response.ok
    } catch {
      return false
    }
  }

  return {
    selectedCharacter,
    selectedMode,
    selectCharacter,
    selectMode
  }
})
