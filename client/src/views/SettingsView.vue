<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const modes = [
  { id: 'default', icon: '💬', name: 'Обычный', desc: 'Обычное общение без ограничений' },
  { id: 'study', icon: '📚', name: 'Учёба', desc: 'Помощь с заданиями и обучением' },
  { id: 'work', icon: '💼', name: 'Работа', desc: 'Деловое общение и планирование' },
  { id: 'psychologist', icon: '🧠', name: 'Психолог', desc: 'Поддержка и психологическая помощь' },
  { id: 'nsfw', icon: '🔥', name: 'NSFW', desc: 'Взрослый контент (18+)', premium: true },
]

async function setMode(mode: string) {
  await auth.updateSettings({ behavior_mode: mode })
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-dark)] relative">
    <div class="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />

    <header class="flex items-center gap-3 px-6 py-5 border-b border-white/5">
      <router-link to="/chat" class="btn-ghost text-sm">← Назад</router-link>
      <h1 class="text-xl font-bold">⚙️ Настройки</h1>
    </header>

    <main class="max-w-2xl mx-auto px-6 py-8">
      <!-- Behavior Modes -->
      <section class="mb-10">
        <h2 class="text-lg font-semibold mb-4">Режим поведения</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            v-for="m in modes" :key="m.id"
            @click="setMode(m.id)"
            :class="[
              'mode-card text-left',
              auth.user?.behavior_mode === m.id ? 'active' : '',
              m.premium && !auth.isPremium ? 'opacity-40 cursor-not-allowed' : ''
            ]"
            :disabled="m.premium && !auth.isPremium"
          >
            <div class="flex items-center gap-3 mb-2">
              <span class="text-2xl">{{ m.icon }}</span>
              <span class="font-semibold">{{ m.name }}</span>
              <span v-if="m.premium" class="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">Premium</span>
            </div>
            <p class="text-sm text-slate-400">{{ m.desc }}</p>
          </button>
        </div>
      </section>

      <!-- Account Info -->
      <section class="glass-card p-6">
        <h2 class="text-lg font-semibold mb-4">Аккаунт</h2>
        <div class="flex flex-col gap-3 text-sm">
          <div class="flex justify-between"><span class="text-slate-400">Email</span><span>{{ auth.user?.email }}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Имя</span><span>{{ auth.user?.username }}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Статус</span><span>{{ auth.isPremium ? '⭐ Premium' : 'Free' }}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Сообщений</span><span>{{ auth.user?.total_messages || 0 }}</span></div>
        </div>
      </section>
    </main>
  </div>
</template>
