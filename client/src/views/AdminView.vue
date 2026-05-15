<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'

const theme = useThemeStore()

const activeTab = ref<'overview' | 'users' | 'subscriptions' | 'limits' | 'events'>('overview')

interface AdminStats { total_users: number; premium_users: number; active_users: number; total_messages: number }
interface AdminUser { id: number; email: string; username: string; is_premium: boolean; is_admin: boolean; is_banned: boolean; subscription_type: string; subscription_expires_at: number | null; total_messages: number; last_active: number }
interface PlanLimit { plan_type: string; daily_message_limit: number; context_messages: number; context_chars: number; voice_limit: number; voice_window_hours: number }
interface AdminEvent { id: number; admin_email: string; target_email: string | null; action: string; details: any; created_at: number }

const stats = ref<AdminStats>({ total_users: 0, premium_users: 0, active_users: 0, total_messages: 0 })
const users = ref<AdminUser[]>([])
const planLimits = ref<Record<string, PlanLimit>>({})
const events = ref<AdminEvent[]>([])
const loading = ref(true)
const filter = ref('все')

const apiFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, credentials: 'include', headers: { 'Content-Type': 'application/json', ...((opts as any).headers || {}) } })

onMounted(async () => {
  loading.value = true
  try {
    const [s, u] = await Promise.all([
      apiFetch('/api/admin/stats').then(r => r.json()),
      apiFetch('/api/admin/users').then(r => r.json()),
    ])
    stats.value = s
    users.value = u.users || []
  } catch (e) { console.error(e) }
  loading.value = false
})

async function loadLimits() {
  const res = await apiFetch('/api/admin/plan-limits').then(r => r.json())
  planLimits.value = res.limits || {}
}

async function loadEvents() {
  const res = await apiFetch('/api/admin/events?limit=50').then(r => r.json())
  events.value = res.events || []
}

async function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  if (tab === 'limits' && Object.keys(planLimits.value).length === 0) await loadLimits()
  if (tab === 'events' && events.value.length === 0) await loadEvents()
}

// Users tab
const filteredUsers = computed(() => {
  if (filter.value === 'premium') return users.value.filter(u => u.is_premium)
  if (filter.value === 'free') return users.value.filter(u => !u.is_premium)
  if (filter.value === 'новые') return users.value.filter(u => Date.now() - u.last_active < 24 * 60 * 60 * 1000)
  return users.value
})

async function toggleBan(userId: number, isBanned: boolean) {
  await apiFetch(`/api/admin/user/${userId}/ban`, { method: 'PUT', body: JSON.stringify({ is_banned: !isBanned }) })
  const u = users.value.find(u => u.id === userId)
  if (u) u.is_banned = !isBanned
}

// Subscriptions tab
const subSearch = ref('')
const subType = ref<'premium' | 'premium_plus'>('premium')
const subMonths = ref<number | null>(1)
const subMsg = ref('')

const foundUser = computed(() => users.value.find(u => u.email.toLowerCase().includes(subSearch.value.toLowerCase())))

async function grantSubscription() {
  if (!foundUser.value) { subMsg.value = 'Пользователь не найден'; return }
  await apiFetch(`/api/admin/user/${foundUser.value.id}/subscription`, {
    method: 'PUT',
    body: JSON.stringify({ type: subType.value, months: subMonths.value }),
  })
  const u = users.value.find(u => u.id === foundUser.value!.id)
  if (u) {
    u.subscription_type = subType.value
    u.is_premium = true
    u.subscription_expires_at = subMonths.value ? Date.now() + subMonths.value * 30 * 24 * 60 * 60 * 1000 : null
  }
  subMsg.value = `✓ ${subType.value === 'premium_plus' ? 'Premium+' : 'Premium'} выдан ${foundUser.value.email}`
}

async function revokeSubscription(userId: number) {
  await apiFetch(`/api/admin/user/${userId}/subscription`, { method: 'PUT', body: JSON.stringify({ type: 'free' }) })
  const u = users.value.find(u => u.id === userId)
  if (u) { u.subscription_type = 'free'; u.is_premium = false; u.subscription_expires_at = null }
}

// Plan limits tab
const editingLimits = ref<Record<string, Partial<PlanLimit>>>({})
const limitsMsg = ref('')

function startEdit(pt: string) {
  if (!editingLimits.value[pt]) editingLimits.value[pt] = { ...planLimits.value[pt] }
}

async function saveLimits(pt: string) {
  const data = editingLimits.value[pt]
  if (!data) return
  await apiFetch('/api/admin/plan-limits', { method: 'PUT', body: JSON.stringify({ plan_type: pt, ...data }) })
  planLimits.value[pt] = { ...planLimits.value[pt], ...data } as PlanLimit
  delete editingLimits.value[pt]
  limitsMsg.value = `✓ Лимиты для ${pt} сохранены`
  setTimeout(() => limitsMsg.value = '', 3000)
}

// Helpers
function formatDate(ts: number) {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU')
}

function planLabel(u: AdminUser) {
  if (!u.is_premium) return 'Free'
  return u.subscription_type === 'premium_plus' ? 'Premium+' : 'Premium'
}

const planTypeLabels: Record<string, string> = { free: 'Free', premium: 'Premium', premium_plus: 'Premium+' }
const statCards = [
  { label: 'ЮЗЕРЫ',       field: 'total_users',    kanji: '人' },
  { label: 'PREMIUM',     field: 'premium_users',  kanji: '✦' },
  { label: 'СООБЩ.',      field: 'total_messages', kanji: '言' },
  { label: 'АКТИВНЫХ 24Ч', field: 'active_users',  kanji: '心' },
]
</script>

<template>
  <div style="min-height: 100vh; background: var(--bg); color: var(--fg);">

    <!-- Header -->
    <header style="display: flex; justify-content: space-between; align-items: flex-end; padding: 24px 40px 0; border-bottom: var(--border);">
      <div style="padding-bottom: 20px;">
        <router-link to="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 14px;">
          <img :src="'/logo.png'" alt="Morgan" style="height: 40px; border-radius: 5px; display: block;" />
          <span style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent);">Morgan</span>
        </router-link>
        <div class="editorial-label" style="color: var(--accent2);">
          <span style="opacity: 0.55;">✦</span>
          ADMIN · УПРАВЛЕНИЕ
        </div>
        <div class="display-heading" style="font-size: clamp(28px, 4vw, 48px); margin-top: 8px;">
          Панель <span style="font-style: italic; color: var(--accent3);">управления.</span>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; padding-bottom: 20px;">
        <router-link to="/chat" class="btn-ghost btn-sm" style="text-decoration: none;">← Чат</router-link>
        <button @click="theme.toggle()" class="theme-toggle">{{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}</button>
      </div>
    </header>

    <!-- Tabs -->
    <div style="display: flex; border-bottom: var(--border); background: var(--bg-alt); padding: 0 40px; overflow-x: auto;">
      <button
        v-for="t in [['overview','Обзор'],['users','Пользователи'],['subscriptions','Подписки'],['limits','Лимиты'],['events','Лог событий']]"
        :key="t[0]"
        @click="switchTab(t[0] as any)"
        class="admin-tab"
        :class="{ active: activeTab === t[0] }"
      >{{ t[1] }}</button>
    </div>

    <main style="padding: 28px 40px; max-width: 1400px;">

      <!-- ── OVERVIEW ── -->
      <div v-if="activeTab === 'overview'">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: var(--border);">
          <div v-for="(s, i) in statCards" :key="s.label" class="stat-card" :style="{ borderLeft: i > 0 ? 'var(--border)' : 'none' }">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; color: var(--meta);">{{ s.label }}</div>
              <div style="font-family: var(--font-display); font-weight: 600; font-size: 24px; color: var(--accent2); line-height: 0.8;">{{ s.kanji }}</div>
            </div>
            <div style="font-family: var(--font-display); font-weight: 200; font-size: 44px; color: var(--fg); margin-top: 10px; letter-spacing: -1.5px; line-height: 0.95;">
              {{ (stats as any)[s.field] || 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── USERS ── -->
      <div v-if="activeTab === 'users'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div class="editorial-label" style="color: var(--fg); opacity: 0.7;">
            <span style="opacity: 0.55;">02</span>
            ПОЛЬЗОВАТЕЛИ ({{ users.length }})
          </div>
          <div style="display: flex; gap: 0; border: var(--border);">
            <span v-for="(f, i) in ['все', 'premium', 'free', 'новые']" :key="f" @click="filter = f" class="filter-tab" :class="{ active: filter === f }" :style="{ borderLeft: i > 0 ? 'var(--border)' : 'none' }">{{ f }}</span>
          </div>
        </div>

        <div v-if="loading" style="padding: 40px; text-align: center; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.5; border: var(--border);">Загрузка...</div>

        <div v-else style="border: var(--border); overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-alt); font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--meta);">
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Email</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Имя</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">План</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Сообщ.</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Активность</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 400;">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in filteredUsers" :key="u.id" :style="{ background: i % 2 ? 'var(--bg-alt)' : 'var(--bg)', borderTop: 'var(--border)', opacity: u.is_banned ? 0.5 : 1 }">
                <td style="padding: 12px 16px; font-size: 13px;">
                  {{ u.email }}
                  <span v-if="u.is_admin" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent); border: 1px solid var(--accent); padding: 1px 5px; margin-left: 6px; letter-spacing: 1.2px;">ADMIN</span>
                  <span v-if="u.is_banned" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent2); border: 1px solid var(--accent2); padding: 1px 5px; margin-left: 4px;">BAN</span>
                </td>
                <td style="padding: 12px 16px; font-family: var(--font-display); font-size: 14px;">{{ u.username }}</td>
                <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase;" :style="{ color: u.is_premium ? 'var(--accent)' : 'var(--fg-dim)' }">{{ planLabel(u) }}</td>
                <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 12px;">{{ u.total_messages }}</td>
                <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; opacity: 0.6;">{{ formatDate(u.last_active) }}</td>
                <td style="padding: 12px 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                  <button class="act-btn" @click="revokeSubscription(u.id)" v-if="u.is_premium">Отозвать</button>
                  <button class="act-btn danger" @click="toggleBan(u.id, u.is_banned)">{{ u.is_banned ? 'Разбан' : 'Бан' }}</button>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" style="padding: 32px; text-align: center; font-family: var(--font-display); font-style: italic; color: var(--fg); opacity: 0.5;">Нет пользователей</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── SUBSCRIPTIONS ── -->
      <div v-if="activeTab === 'subscriptions'">
        <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 20px;">
          <span style="opacity: 0.55;">03</span>
          ВЫДАЧА ПОДПИСОК
        </div>

        <div style="border: var(--border); padding: 24px; max-width: 560px;">
          <div style="margin-bottom: 16px;">
            <label class="field-label">Поиск по email</label>
            <input v-model="subSearch" class="m-input" style="width: 100%;" placeholder="user@example.com" />
            <div v-if="subSearch && foundUser" style="margin-top: 6px; font-size: 13px; color: var(--accent); font-family: var(--font-mono);">
              Найден: {{ foundUser.email }} ({{ planLabel(foundUser) }})
            </div>
            <div v-if="subSearch && !foundUser" style="margin-top: 6px; font-size: 13px; color: var(--fg-dim); font-family: var(--font-mono);">Не найден</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <label class="field-label">Тип подписки</label>
              <div style="display: flex; gap: 0; border: var(--border); margin-top: 4px;">
                <button v-for="t in [['premium', 'Premium'], ['premium_plus', 'Premium+']]" :key="t[0]" @click="subType = t[0] as any" class="filter-tab" :class="{ active: subType === t[0] }" style="flex: 1;">{{ t[1] }}</button>
              </div>
            </div>
            <div>
              <label class="field-label">Срок</label>
              <div style="display: flex; gap: 0; border: var(--border); margin-top: 4px; flex-wrap: wrap;">
                <button v-for="m in [1, 3, 6, 12, null]" :key="String(m)" @click="subMonths = m" class="filter-tab" :class="{ active: subMonths === m }" style="flex: 1; min-width: 36px;">{{ m ? m + 'м' : '∞' }}</button>
              </div>
            </div>
          </div>

          <div v-if="subMsg" style="margin-bottom: 12px; padding: 8px 12px; border-left: 3px solid var(--accent); font-size: 13px; color: var(--accent); font-family: var(--font-mono);">{{ subMsg }}</div>

          <button class="btn-primary btn-sm" @click="grantSubscription" :disabled="!foundUser">Выдать подписку</button>
        </div>

        <!-- Active subscriptions list -->
        <div style="margin-top: 32px;">
          <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 12px;">
            <span style="opacity: 0.55;">·</span>
            АКТИВНЫЕ ПОДПИСКИ
          </div>
          <div style="border: var(--border);">
            <div v-for="(u, i) in users.filter(u => u.is_premium)" :key="u.id" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;" :style="{ borderTop: i > 0 ? 'var(--border)' : 'none' }">
              <div>
                <div style="font-size: 14px;">{{ u.email }}</div>
                <div style="font-family: var(--font-mono); font-size: 10px; margin-top: 2px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">
                  {{ planLabel(u) }} · {{ u.subscription_expires_at ? 'до ' + new Date(u.subscription_expires_at).toLocaleDateString('ru-RU') : 'навсегда' }}
                </div>
              </div>
              <button class="act-btn danger" @click="revokeSubscription(u.id)">Отозвать</button>
            </div>
            <div v-if="users.filter(u => u.is_premium).length === 0" style="padding: 24px; text-align: center; font-family: var(--font-display); font-style: italic; opacity: 0.5;">Нет активных подписок</div>
          </div>
        </div>
      </div>

      <!-- ── LIMITS ── -->
      <div v-if="activeTab === 'limits'">
        <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 20px;">
          <span style="opacity: 0.55;">04</span>
          ЛИМИТЫ ПО ТАРИФАМ
        </div>
        <div v-if="limitsMsg" style="margin-bottom: 16px; padding: 8px 12px; border-left: 3px solid var(--accent); font-size: 13px; color: var(--accent); font-family: var(--font-mono);">{{ limitsMsg }}</div>

        <div style="border: var(--border);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-alt); font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--meta);">
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Тариф</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Сообщ./день</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">История (сообщ.)</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Контекст (символы)</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Голос / окно</th>
                <th style="padding: 12px 16px; text-align: right; font-weight: 400;">Сохранить</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pt, idx) in ['free', 'premium', 'premium_plus']" :key="pt" :style="{ background: idx % 2 ? 'var(--bg-alt)' : 'var(--bg)', borderTop: 'var(--border)' }">
                <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase;" :style="{ color: pt === 'free' ? 'var(--fg-dim)' : 'var(--accent)' }">
                  {{ planTypeLabels[pt] }}
                </td>
                <template v-if="planLimits[pt]">
                  <td style="padding: 8px 16px;">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].daily_message_limit" type="number" class="m-input" style="width: 80px; padding: 4px 8px;" @focus="startEdit(pt)" />
                    <span v-else @dblclick="startEdit(pt)" class="editable-cell">{{ planLimits[pt].daily_message_limit }}</span>
                  </td>
                  <td style="padding: 8px 16px;">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].context_messages" type="number" class="m-input" style="width: 80px; padding: 4px 8px;" />
                    <span v-else @dblclick="startEdit(pt)" class="editable-cell">{{ planLimits[pt].context_messages }}</span>
                  </td>
                  <td style="padding: 8px 16px;">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].context_chars" type="number" class="m-input" style="width: 100px; padding: 4px 8px;" />
                    <span v-else @dblclick="startEdit(pt)" class="editable-cell">{{ planLimits[pt].context_chars.toLocaleString() }}</span>
                  </td>
                  <td style="padding: 8px 16px;">
                    <span v-if="editingLimits[pt]" style="display: flex; gap: 6px; align-items: center;">
                      <input v-model.number="editingLimits[pt].voice_limit" type="number" class="m-input" style="width: 60px; padding: 4px 8px;" />
                      <span style="font-size: 12px; opacity: 0.6;">/</span>
                      <input v-model.number="editingLimits[pt].voice_window_hours" type="number" class="m-input" style="width: 50px; padding: 4px 8px;" />
                      <span style="font-size: 12px; opacity: 0.6;">ч</span>
                    </span>
                    <span v-else @dblclick="startEdit(pt)" class="editable-cell">{{ planLimits[pt].voice_limit }} / {{ planLimits[pt].voice_window_hours }}ч</span>
                  </td>
                  <td style="padding: 8px 16px; text-align: right;">
                    <button v-if="editingLimits[pt]" class="act-btn" @click="saveLimits(pt)">Сохранить</button>
                    <button v-else class="act-btn" @click="startEdit(pt)">Изменить</button>
                  </td>
                </template>
                <td v-else colspan="5" style="padding: 12px 16px; font-family: var(--font-mono); font-size: 11px; opacity: 0.5;">Загрузка...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top: 10px; font-family: var(--font-mono); font-size: 10px; color: var(--fg); opacity: 0.5; letter-spacing: 1px;">Двойной клик по значению для редактирования. 9999 = безлимит.</div>
      </div>

      <!-- ── EVENTS ── -->
      <div v-if="activeTab === 'events'">
        <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 16px;">
          <span style="opacity: 0.55;">05</span>
          ЛОГ СОБЫТИЙ
        </div>
        <div style="border: var(--border);">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--bg-alt); font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--meta);">
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Когда</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Админ</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Действие</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Цель</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 400;">Детали</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in events" :key="e.id" :style="{ background: i % 2 ? 'var(--bg-alt)' : 'var(--bg)', borderTop: 'var(--border)' }">
                <td style="padding: 10px 16px; font-family: var(--font-mono); font-size: 11px; white-space: nowrap;">{{ formatDate(e.created_at) }}</td>
                <td style="padding: 10px 16px; font-size: 13px;">{{ e.admin_email }}</td>
                <td style="padding: 10px 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--accent2);">{{ e.action }}</td>
                <td style="padding: 10px 16px; font-size: 13px; opacity: 0.7;">{{ e.target_email || '—' }}</td>
                <td style="padding: 10px 16px; font-family: var(--font-mono); font-size: 11px; opacity: 0.6;">{{ e.details ? JSON.stringify(e.details) : '—' }}</td>
              </tr>
              <tr v-if="events.length === 0">
                <td colspan="5" style="padding: 32px; text-align: center; font-family: var(--font-display); font-style: italic; opacity: 0.5;">Нет событий</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.admin-tab {
  padding: 14px 20px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  border: none;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  opacity: 0.6;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.admin-tab:hover { opacity: 0.9; }
.admin-tab.active { opacity: 1; color: var(--accent); border-bottom-color: var(--accent); }

.filter-tab {
  padding: 6px 14px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  border: none;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  transition: background 0.15s;
}
.filter-tab.active { background: var(--accent); color: var(--bg); }

.act-btn {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--accent);
  background: transparent;
  border: 1px solid var(--accent);
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.act-btn:hover { background: var(--accent); color: var(--bg); }
.act-btn.danger { color: var(--accent2); border-color: var(--accent2); }
.act-btn.danger:hover { background: var(--accent2); color: var(--bg); }

.field-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--fg);
  opacity: 0.6;
}

.editable-cell {
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 2px;
  transition: background 0.15s;
  font-family: var(--font-mono);
  font-size: 13px;
}
.editable-cell:hover { background: var(--bg-alt); }

@media (max-width: 900px) {
  header { padding: 20px 16px 0 !important; }
  main { padding: 20px 16px !important; }
  div[style*="grid-template-columns: repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
}
</style>
