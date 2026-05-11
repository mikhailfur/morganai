/**
 * characterStore.js — Хранилище персонажей (Pinia).
 * 
 * Работает с реальным API бэкенда через api.js.
 * Все комментарии и сообщения на русском языке.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../services/api.js'

export const useCharacterStore = defineStore('characters', () => {
  // State
  const characters = ref([])
  const selectedCharacter = ref(null)
  const isPremium = ref(false)
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const premiumLockedCharacters = computed(() => {
    return characters.value.filter(c => c.behavior_mode === 'nsfw' && !isPremium.value)
  })

  const availableCharacters = computed(() => {
    return characters.value.filter(c => c.behavior_mode !== 'nsfw' || isPremium.value)
  })

  // Actions
  async function fetchCharacters() {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/api/characters')
      characters.value = response.data
    } catch (err) {
      console.error('Ошибка загрузки персонажей:', err)
      error.value = 'Не удалось загрузить список персонажей. Попробуйте позже.'
    } finally {
      loading.value = false
    }
  }

  async function fetchCharacterById(id) {
    loading.value = true
    error.value = null
    try {
      const response = await apiClient.get(`/api/characters/${id}`)
      selectedCharacter.value = response.data
      return response.data
    } catch (err) {
      console.error(`Ошибка загрузки персонажа ${id}:`, err)
      error.value = 'Не удалось загрузить данные персонажа.'
      return null
    } finally {
      loading.value = false
    }
  }

  function selectCharacter(character) {
    selectedCharacter.value = character
  }

  return {
    characters,
    selectedCharacter,
    isPremium,
    loading,
    error,
    premiumLockedCharacters,
    availableCharacters,
    fetchCharacters,
    fetchCharacterById,
    selectCharacter,
  }
})
