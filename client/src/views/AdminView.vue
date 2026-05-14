<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()

interface AdminStats { total_users: number; premium_users: number; active_users: number; total_messages: number }
interface AdminUser { id: number; email: string; username: string; is_premium: boolean; is_admin: boolean; behavior_mode: string; total_messages: number; last_active: number }

const stats = ref<AdminStats>({ total_users: 0, premium_users: 0, active_users: 0, total_messages: 0 })
const users = ref<AdminUser[]>([])
const loading = ref(true)
const filter = ref('all')

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
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU')
}

const statCards = [
  { label: 'ЮЗЕРЫ',       field: 'total_users',    kanji: '人', suffix: '', delta: '+ 38 за сутки' },
  { label: 'PREMIUM',     field: 'premium_users',  kanji: '✦', suffix: '', delta: '' },
  { label: 'СООБЩ. / ДЕНЬ', field: 'total_messages', kanji: '言', suffix: '', delta: '+ 12% w/w' },
  { label: 'АКТИВНЫХ 24Ч', field: 'active_users',   kanji: '心', suffix: '', delta: '' },
]
</script>

<template>
  <div style="min-height: 100vh; background: var(--bg); color: var(--fg);">

    <!-- Header -->
    <header style="
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 32px 48px 28px;
      border-bottom: var(--border);
    ">
      <div>
        <div class="editorial-label" style="color: var(--accent2);">
          <span style="opacity: 0.55;">✦</span>
          ADMIN · УПРАВЛЕНИЕ
        </div>
        <div class="display-heading" style="font-size: clamp(32px, 4vw, 56px); margin-top: 12px;">
          Сводка <span style="font-style: italic; color: var(--accent3);">за сегодня.</span>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <router-link to="/chat" class="btn-ghost btn-sm" style="text-decoration: none;">← Назад</router-link>
        <button @click="theme.toggle()" class="theme-toggle">{{ theme.isDark ? '☀️' : '🌙' }}</button>
      </div>
    </header>

    <main style="padding: 28px 48px; max-width: 1400px;">

      <!-- Stats row -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: var(--border);">
        <div v-for="(s, i) in statCards" :key="s.label" class="stat-card" :style="{ borderLeft: i > 0 ? 'var(--border)' : 'none' }">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; color: var(--meta);">{{ s.label }}</div>
            <div style="font-family: var(--font-display); font-weight: 600; font-size: 24px; color: var(--accent2); line-height: 0.8;">{{ s.kanji }}</div>
          </div>
          <div style="font-family: var(--font-display); font-weight: 200; font-size: 44px; color: var(--fg); margin-top: 10px; letter-spacing: -1.5px; line-height: 0.95;">
            {{ (stats as any)[s.field] }}
          </div>
          <div v-if="s.delta" style="font-family: var(--font-mono); font-size: 10px; margin-top: 6px; color: var(--accent2); letter-spacing: 0.8px;">{{ s.delta }}</div>
        </div>
      </div>

      <!-- Users table -->
      <div style="margin-top: 28px;">
        <!-- Table header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
          <div class="editorial-label" style="color: var(--fg); opacity: 0.7;">
            <span style="opacity: 0.55;">02</span>
            ПОЛЬЗОВАТЕЛИ
          </div>
          <div style="display: flex; gap: 0; border: var(--border);">
            <span
              v-for="(f, i) in ['все', 'premium', 'free', 'новые']" :key="f"
              @click="filter = f"
              :style="{
                padding: '6px 14px',
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? 'var(--bg)' : 'var(--fg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                borderLeft: i > 0 ? 'var(--border)' : 'none',
                cursor: 'pointer',
              }"
            >{{ f }}</span>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" style="padding: 40px; text-align: center; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.5; border: var(--border);">
          Загрузка...
        </div>

        <div v-else style="border: var(--border);">
          <!-- Header row -->
          <div style="
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
            padding: 12px 18px;
            border-bottom: var(--border);
            font-family: var(--font-mono);
            font-size: 10px;
            letter-spacing: 1.6px;
            text-transform: uppercase;
            color: var(--meta);
            background: var(--bg-alt);
          ">
            <span>Email</span>
            <span>Имя</span>
            <span>План</span>
            <span>Сообщ.</span>
            <span>Активность</span>
            <span style="text-align: right;">Действия</span>
          </div>

          <!-- User rows -->
          <div
            v-for="(u, i) in users" :key="u.id"
            style="
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
              padding: 14px 18px;
              align-items: center;
              font-family: var(--font-display);
              font-size: 14px;
              font-weight: 300;
              color: var(--fg);
              transition: background 0.15s;
            "
            :style="{ borderTop: i > 0 ? 'var(--border)' : 'none', background: i % 2 ? 'var(--bg-alt)' : 'var(--bg)' }"
          >
            <span style="display: flex; align-items: center; gap: 8px; font-family: var(--font-ui); font-size: 13px;">
              {{ u.email }}
              <span v-if="u.is_admin" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent); border: 1px solid var(--accent); padding: 1px 6px; letter-spacing: 1.2px;">ADMIN</span>
            </span>
            <span>{{ u.username }}</span>
            <span :style="{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: u.is_premium ? 'var(--accent)' : 'var(--fg-dim)',
              fontWeight: u.is_premium ? '600' : '400',
            }">{{ u.is_premium ? 'Premium' : 'Free' }}</span>
            <span style="font-family: var(--font-mono); font-size: 13px;">{{ u.total_messages }}</span>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--fg); opacity: 0.6;">{{ formatDate(u.last_active) }}</span>
            <span style="text-align: right;">
              <button
                @click="togglePremium(u.id, u.is_premium)"
                style="
                  font-family: var(--font-mono);
                  font-size: 11px;
                  color: var(--accent);
                  background: transparent;
                  border: none;
                  cursor: pointer;
                  letter-spacing: 1.2px;
                  text-decoration: underline;
                "
              >Premium ↔</button>
            </span>
          </div>

          <div v-if="users.length === 0" style="padding: 32px; text-align: center; font-family: var(--font-display); font-style: italic; color: var(--fg); opacity: 0.5;">
            Нет пользователей
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
@media (max-width: 900px) {
  header { padding: 24px 20px 20px !important; }
  main { padding: 20px !important; }
  div[style*="grid-template-columns: repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
  div[style*="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr"] {
    grid-template-columns: 1.5fr 1fr 1fr !important;
  }
  div[style*="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr"] > span:nth-child(4),
  div[style*="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr"] > span:nth-child(5) {
    display: none;
  }
}
</style>
