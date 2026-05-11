import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCharacterStore = defineStore('characters', () => {
  // State
  const characters = ref([
    {
      id: 1,
      name: 'Морган',
      description: 'Твой личный ИИ-ассистент и собеседник',
      avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
      behavior_mode: 'psychologist',
      is_default: true,
    },
    {
      id: 2,
      name: 'Алекса',
      description: 'Эксперт по продуктивности и учёбе',
      avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
      behavior_mode: 'study',
      is_default: false,
    },
    {
      id: 3,
      name: 'Деймос',
      description: 'Российский персонаж в ночной атмосфере',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      behavior_mode: 'nsfw',
      is_default: false,
    },
  ])

  const selectedCharacter = ref(null)
  const isPremium = ref(false)
  const loading = ref(false)

  // Getters
  const premiumLockedCharacters = computed(() => {
    return characters.value.filter(c => c.behavior_mode === 'nsfw' && !isPremium.value)
  })

  const availableCharacters = computed(() => {
    return characters.value.filter(c => c.behavior_mode !== 'nsfw' || isPremium.value)
  })

  // Actions
  function selectCharacter(character) {
    selectedCharacter.value = character
  }

  function createCharacter(characterData) {
    const newId = Math.max(...characters.value.map(c => c.id), 0) + 1
    characters.value.push({
      id: newId,
      ...characterData,
      created_at: new Date().toISOString(),
    })
  }

  function removeCharacter(id) {
    const idx = characters.value.findIndex(c => c.id === id)
    if (idx > -1) characters.value.splice(idx, 1)
    if (selectedCharacter.value?.id === id) selectedCharacter.value = null
  }

  return {
    characters,
    selectedCharacter,
    isPremium,
    loading,
    premiumLockedCharacters,
    availableCharacters,
    selectCharacter,
    createCharacter,
    removeCharacter,
  }
})
