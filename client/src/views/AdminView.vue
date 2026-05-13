<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

interface AdminStats { total_users: number; premium_users: number; active_users: number; total_messages: number }
interface AdminUser { id: number; email: string; username: string; is_premium: boolean; is_admin: boolean; behavior_mode: string; total_messages: number; last_active: number }

const stats = ref<AdminStats>({ total_users: 0, premium_users: 0, active_users: 0, total_messages: 0 })
const users = ref<AdminUser[]>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const [s, u] = await Promise.all([
      fetch('/api/admin/stats', { headers: auth.headers() }).then(r => r.json()),
      fetch('/api/admin/users', { headers: auth.headers() }).then(r => r.json()),
    ])
    stats.value = s
    users.value = u.users || []
  } catch (e) { console.error(e) }
  loading.value = false
})

async function togglePremium(userId: number, current: boolean) {
  await fetch(`/api/admin/user/${userId}/premium`, {
    method: 'PUT', headers: auth.headers(),
    body: JSON.stringify(current ? { is_premium: false } : { is_premium: true, months: 1 }),
  })
  const u = users.value.find(u => u.id === userId)
  if (u) u.is_premium = !current
}

function formatDate(ts: number) {
  return ts ? new Date(ts).toLocaleDateString('ru-RU') : '—'
}
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg-dark)] relative">
    <div class="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />

    <header class="flex items-center gap-3 px-6 py-5 border-b border-white/5">
      <router-link to="/chat" class="btn-ghost text-sm">← Назад</router-link>
      <h1 class="text-xl font-bold">🔐 Админ-панель</h1>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="glass-card p-5 text-center">
          <p class="text-3xl font-bold gradient-text">{{ stats.total_users }}</p>
          <p class="text-xs text-slate-400 mt-1">Пользователей</p>
        </div>
        <div class="glass-card p-5 text-center">
          <p class="text-3xl font-bold text-yellow-400">{{ stats.premium_users }}</p>
          <p class="text-xs text-slate-400 mt-1">Premium</p>
        </div>
        <div class="glass-card p-5 text-center">
          <p class="text-3xl font-bold text-green-400">{{ stats.active_users }}</p>
          <p class="text-xs text-slate-400 mt-1">Активных (24ч)</p>
        </div>
        <div class="glass-card p-5 text-center">
          <p class="text-3xl font-bold text-purple-300">{{ stats.total_messages }}</p>
          <p class="text-xs text-slate-400 mt-1">Сообщений</p>
        </div>
      </div>

      <!-- Users Table -->
      <div class="glass-card overflow-hidden">
        <div class="px-5 py-4 border-b border-white/5">
          <h2 class="font-semibold">👥 Пользователи</h2>
        </div>
        <div v-if="loading" class="p-8 text-center text-slate-400">Загрузка...</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-white/5 text-slate-400 text-xs uppercase">
                <th class="px-5 py-3 text-left">Пользователь</th>
                <th class="px-5 py-3 text-left">Email</th>
                <th class="px-5 py-3 text-center">Режим</th>
                <th class="px-5 py-3 text-center">Сообщений</th>
                <th class="px-5 py-3 text-center">Активность</th>
                <th class="px-5 py-3 text-center">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id" class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td class="px-5 py-3 font-medium">{{ u.username }}</td>
                <td class="px-5 py-3 text-slate-400">{{ u.email }}</td>
                <td class="px-5 py-3 text-center">{{ u.behavior_mode }}</td>
                <td class="px-5 py-3 text-center">{{ u.total_messages }}</td>
                <td class="px-5 py-3 text-center text-slate-400">{{ formatDate(u.last_active) }}</td>
                <td class="px-5 py-3 text-center">
                  <button @click="togglePremium(u.id, u.is_premium)" :class="['px-3 py-1 rounded-full text-xs font-medium transition-all', u.is_premium ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30' : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30']">
                    {{ u.is_premium ? '⭐ Premium' : 'Free' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>
