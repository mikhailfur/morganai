<template>
  <div class="characters-view">
    <h1>Выберите персонажа</h1>

    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else class="characters-grid">
      <div
        v-for="char in characters"
        :key="char.id"
        class="character-card"
        :class="{ selected: userStore.selectedCharacter?.id === char.id }"
        @click="selectCharacter(char)"
      >
        <div class="avatar">
          <img v-if="char.avatar_url" :src="char.avatar_url" :alt="char.name">
          <div v-else class="avatar-placeholder">{{ char.name.charAt(0) }}</div>
        </div>
        <h3>{{ char.name }}</h3>
        <span v-if="char.is_nsfw" class="badge nsfw">NSFW</span>
        <span v-if="char.is_premium && !authStore.isPremium" class="badge premium">Premium</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import type { CharacterResponse } from '@/types'

const authStore = useAuthStore()
const userStore = useUserStore()

const characters = ref<CharacterResponse[]>([])
const loading = ref(false)

async function fetchCharacters() {
  loading.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const response = await fetch(`${apiUrl}/api/v1/characters?include_nsfw=${authStore.isPremium}`)
    characters.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch characters:', error)
  } finally {
    loading.value = false
  }
}

async function selectCharacter(character: CharacterResponse) {
  if (character.is_premium && !authStore.isPremium) {
    alert('Этот персонаж доступен только для Premium пользователей')
    return
  }

  const success = await userStore.selectCharacter(character.id)
  if (success) {
    userStore.selectedCharacter = character
    alert(`Персонаж "${character.name}" выбран!`)
  }
}

onMounted(fetchCharacters)
</script>

<style scoped>
.characters-view {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 2rem;
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.character-card {
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.character-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.character-card.selected {
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}

.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  color: white;
}

h3 {
  margin: 0.5rem 0;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0.25rem;
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
