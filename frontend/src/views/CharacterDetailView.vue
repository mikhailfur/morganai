<template>
  <div class="min-h-screen bg-claude-bg p-4">
    <button 
      @click="router.back()" 
      class="mb-4 text-claude-accent hover:underline flex items-center gap-1"
    >
      ← Назад
    </button>
    
    <div v-if="store.loading" class="text-center py-8 text-claude-subtext">
      Загрузка персонажа...
    </div>
    
    <div v-else-if="store.error" class="text-red-500 p-4 bg-red-50 rounded-lg">
      {{ store.error }}
    </div>
    
    <div 
      v-else-if="store.selectedCharacter" 
      class="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto"
    >
      <img 
        :src="store.selectedCharacter.avatar_url" 
        :alt="store.selectedCharacter.name"
        class="w-24 h-24 rounded-full mb-4 object-cover mx-auto"
      >
      <h1 class="text-2xl font-bold text-center mb-2 text-claude-text">
        {{ store.selectedCharacter.name }}
      </h1>
      <p class="text-claude-subtext text-center mb-4">
        {{ store.selectedCharacter.description }}
      </p>
      
      <div class="mb-4 text-center">
        <span class="inline-block px-3 py-1 bg-claude-accent/10 text-claude-accent rounded-full text-sm">
          Режим: {{ store.selectedCharacter.behavior_mode }}
        </span>
      </div>
      
      <button 
        @click="selectCharacter"
        class="w-full py-2 bg-claude-accent text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Выбрать этого персонажа
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore.js'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

onMounted(() => {
  const id = route.params.id
  if (id) {
    store.fetchCharacterById(id)
  }
})

function selectCharacter() {
  store.selectCharacter(store.selectedCharacter)
  router.push({ name: 'characters' })
}
</script>
