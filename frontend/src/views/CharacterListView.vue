<template>
  <div class="min-h-screen bg-claude-bg p-4">
    <h1 class="text-2xl font-bold mb-6 text-claude-text">Персонажи</h1>
    
    <div v-if="store.loading" class="text-center py-8 text-claude-subtext">
      Загрузка персонажей...
    </div>
    
    <div v-else-if="store.error" class="text-red-500 p-4 bg-red-50 rounded-lg">
      {{ store.error }}
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="char in store.availableCharacters" 
        :key="char.id"
        class="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
        @click="goToDetail(char.id)"
      >
        <img 
          :src="char.avatar_url" 
          :alt="char.name" 
          class="w-16 h-16 rounded-full mb-3 object-cover"
        >
        <h3 class="font-semibold text-lg mb-1 text-claude-text">{{ char.name }}</h3>
        <p class="text-claude-subtext text-sm">{{ char.description }}</p>
        <span 
          v-if="char.behavior_mode === 'nsfw' && !store.isPremium" 
          class="text-xs text-red-500 mt-2 block"
        >
          🔒 Только для Premium
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore.js'

const store = useCharacterStore()
const router = useRouter()

onMounted(() => {
  store.fetchCharacters()
})

function goToDetail(id) {
  router.push({ name: 'character-detail', params: { id } })
}
</script>
