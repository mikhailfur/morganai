<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')

async function handleRegister() {
  error.value = ''
  try {
    await auth.register(email.value, username.value, password.value)
    router.push('/chat')
  } catch (e: any) {
    error.value = e.message
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 relative">
    <div class="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
    <div class="fixed bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />

    <div class="glass-card w-full max-w-md p-8 relative z-10 animate-fade-in">
      <div class="text-center mb-8">
        <router-link to="/" class="inline-flex items-center gap-2 mb-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white">M</div>
        </router-link>
        <h1 class="text-2xl font-bold">Создать аккаунт</h1>
        <p class="text-slate-400 mt-1">Присоединяйся к Morgan AI</p>
      </div>

      <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">{{ error }}</div>
        <input v-model="username" type="text" placeholder="Имя пользователя" class="input-field" required />
        <input v-model="email" type="email" placeholder="Email" class="input-field" required />
        <input v-model="password" type="password" placeholder="Пароль (мин. 6 символов)" class="input-field" minlength="6" required />
        <button type="submit" class="btn-primary w-full mt-2" :disabled="auth.loading">
          {{ auth.loading ? 'Создаём...' : 'Создать аккаунт' }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-400 mt-6">
        Уже есть аккаунт? <router-link to="/login" class="text-purple-400 hover:text-purple-300 font-medium">Войди</router-link>
      </p>
    </div>
  </div>
</template>
