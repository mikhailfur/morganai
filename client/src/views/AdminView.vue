<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const activeTab = ref<'overview' | 'users' | 'subscriptions' | 'limits' | 'events' | 'finance'>('overview')

interface AdminStats { total_users: number; premium_users: number; active_users: number; total_messages: number }
interface AdminUser { id: number; email: string; username: string; is_premium: boolean; is_admin: boolean; is_banned: boolean; subscription_type: string; subscription_expires_at: number | null; total_messages: number; last_active: number }
interface PlanLimit { plan_type: string; daily_message_limit: number; context_messages: number; context_chars: number; voice_limit: number; voice_window_hours: number }
interface AdminEvent { id: number; admin_id: number; admin_email: string | null; target_email: string | null; action: string; details: any; created_at: number }
interface FinanceData {
  openrouter: { label?: string; usage?: number; limit?: number | null; is_free_tier?: boolean; rate_limit?: { requests: number; interval: string }; error?: string } | null
  model: string
  platform: { total_users: number; premium_users: number; active_users: number; total_messages: number }
}

const stats      = ref<AdminStats>({ total_users: 0, premium_users: 0, active_users: 0, total_messages: 0 })
const users      = ref<AdminUser[]>([])
const planLimits = ref<Record<string, PlanLimit>>({})
const events     = ref<AdminEvent[]>([])
const finance    = ref<FinanceData | null>(null)
const financeLoading = ref(false)
const loading    = ref(true)
const filter     = ref('все')

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
  const res = await apiFetch('/api/admin/events?limit=100').then(r => r.json())
  events.value = res.events || []
}

async function loadFinance() {
  financeLoading.value = true
  try {
    const res = await apiFetch('/api/admin/finance').then(r => r.json())
    finance.value = res
  } finally { financeLoading.value = false }
}

async function switchTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  if (tab === 'limits'  && Object.keys(planLimits.value).length === 0) await loadLimits()
  if (tab === 'events'  && events.value.length === 0) await loadEvents()
  if (tab === 'finance' && !finance.value) await loadFinance()
}

const eventLabels: Record<string, string> = {
  subscription_change: 'Подписка изменена',
  premium_toggle:      'Premium переключён',
  user_banned:         'Пользователь заблокирован',
  user_unbanned:       'Пользователь разблокирован',
  plan_limits_update:  'Лимиты обновлены',
  kyc_verified:        'KYC верифицирован',
  kyc_geo_blocked:     'KYC геоблок',
}
function eventLabel(action: string) { return eventLabels[action] || action }
function eventColor(action: string) {
  if (action.includes('ban'))         return 'var(--danger)'
  if (action.includes('kyc_geo'))     return 'var(--danger)'
  if (action.includes('kyc'))         return 'var(--accent-soft)'
  if (action.includes('subscription') || action.includes('premium')) return 'var(--accent-soft)'
  return 'var(--fg-subtle)'
}

const filteredUsers = computed(() => {
  if (filter.value === 'premium') return users.value.filter(u => u.is_premium)
  if (filter.value === 'free')    return users.value.filter(u => !u.is_premium)
  if (filter.value === 'новые')   return users.value.filter(u => Date.now() - u.last_active < 24 * 60 * 60 * 1000)
  return users.value
})

async function toggleBan(userId: number, isBanned: boolean) {
  await apiFetch(`/api/admin/user/${userId}/ban`, { method: 'PUT', body: JSON.stringify({ is_banned: !isBanned }) })
  const u = users.value.find(u => u.id === userId)
  if (u) u.is_banned = !isBanned
}

const subSearch = ref('')
const subType   = ref<'premium' | 'premium_plus'>('premium')
const subMonths = ref<number | null>(1)
const subMsg    = ref('')

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

const editingLimits = ref<Record<string, Partial<PlanLimit>>>({})
const limitsMsg     = ref('')

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

function formatDate(ts: number) {
  if (!ts) return '—'
  const d   = new Date(ts)
  const now = new Date()
  if (now.toDateString() === d.toDateString())
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU')
}

function planLabel(u: AdminUser) {
  if (!u.is_premium) return 'Free'
  return u.subscription_type === 'premium_plus' ? 'Premium+' : 'Premium'
}

const planTypeLabels: Record<string, string> = { free: 'Free', premium: 'Premium', premium_plus: 'Premium+' }

const statCards = [
  { label: 'Пользователи',  field: 'total_users',    icon: '👥' },
  { label: 'Premium',       field: 'premium_users',  icon: '✦'  },
  { label: 'Сообщений',     field: 'total_messages', icon: '💬' },
  { label: 'Активных 24ч',  field: 'active_users',   icon: '⚡' },
]

// shared button class builders
const tabCls = (id: string) => [
  'px-5 h-14 font-mono text-[11px] tracking-[1.4px] uppercase',
  'bg-transparent border-0 border-b-2 cursor-pointer whitespace-nowrap transition-all duration-150',
  activeTab.value === id
    ? 'opacity-100 text-[var(--accent-soft)] border-[var(--accent-soft)]'
    : 'opacity-60 text-[var(--fg)] border-transparent hover:opacity-90',
].join(' ')

const filterCls = (f: string) => [
  'px-3.5 py-1.5 font-mono text-[10px] tracking-[1.4px] uppercase',
  'border-0 cursor-pointer transition-all duration-150',
  filter.value === f
    ? 'bg-violet-500/20 text-[var(--accent-soft)]'
    : 'bg-transparent text-[var(--fg)] hover:bg-[var(--surface-2)]',
].join(' ')

const subTabCls = (val: string, cur: string) => [
  'flex-1 px-3 py-1.5 font-mono text-[10px] tracking-[1.4px] uppercase',
  'border-0 cursor-pointer transition-all duration-150',
  cur === val
    ? 'bg-violet-500/20 text-[var(--accent-soft)]'
    : 'bg-transparent text-[var(--fg)] hover:bg-[var(--surface-2)]',
].join(' ')

const actBtn  = 'font-mono text-[11px] tracking-[0.08em] text-[var(--accent-soft)] bg-transparent border border-violet-500/30 rounded-[6px] px-2.5 py-1 cursor-pointer transition-all hover:bg-violet-500/15 whitespace-nowrap'
const dangerBtn = 'font-mono text-[11px] tracking-[0.08em] text-[var(--danger)] bg-transparent border border-red-500/40 rounded-[6px] px-2.5 py-1 cursor-pointer transition-all hover:bg-red-500/15 whitespace-nowrap'
const editCell  = 'cursor-pointer px-1.5 py-1 rounded transition-all font-mono text-[13px] hover:bg-[var(--surface-2)]'
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--fg)] relative z-10">

    <!-- Header -->
    <header class="sticky top-0 z-50 flex justify-between items-center
                   px-6 md:px-10 h-14
                   border-b border-[var(--border)]
                   bg-[#090514]/80 backdrop-blur-md">
      <router-link to="/" class="flex items-center gap-2.5 no-underline">
        <div class="flex size-8 items-center justify-center rounded-[8px]
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-white font-bold text-sm">M</div>
        <span class="font-semibold text-[var(--fg)] text-[15px]">Morgan AI</span>
        <span class="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--fg-subtle)]
                     px-2 py-0.5 border border-[var(--border)] rounded-[6px]">Admin</span>
      </router-link>
      <router-link to="/chat" class="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] no-underline transition-colors">
        ← Чат
      </router-link>
    </header>

    <!-- Title -->
    <div class="px-6 md:px-10 pt-6 pb-0">
      <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-2">
        ✦ Admin · Управление
      </div>
      <h1 class="font-bold text-[clamp(24px,4vw,40px)] tracking-[-0.03em] text-[var(--fg)] mb-5">
        Панель управления
      </h1>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-[var(--border)] bg-[var(--surface)] px-6 md:px-10 overflow-x-auto"
         style="scrollbar-width:none">
      <button v-for="[id, label] in [
        ['overview','Обзор'],['users','Пользователи'],['subscriptions','Подписки'],
        ['limits','Лимиты'],['events','Лог событий'],['finance','Финансы']
      ]" :key="id" @click="switchTab(id as any)" :class="tabCls(id)">
        {{ label }}
      </button>
    </div>

    <main class="px-6 md:px-10 py-7 max-w-[1400px]">

      <!-- ── OVERVIEW ── -->
      <div v-if="activeTab === 'overview'">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="s in statCards" :key="s.label"
               class="bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-5">
            <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-3">
              {{ s.icon }} {{ s.label }}
            </div>
            <div class="font-bold text-[40px] text-[var(--fg)] tracking-[-0.04em] leading-none">
              {{ (stats as any)[s.field] || 0 }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── USERS ── -->
      <div v-if="activeTab === 'users'">
        <div class="flex flex-wrap justify-between items-center gap-3 mb-4">
          <span class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)]">
            Пользователи ({{ users.length }})
          </span>
          <div class="flex border border-[var(--border)]">
            <button v-for="(f, i) in ['все', 'premium', 'free', 'новые']" :key="f"
                    @click="filter = f" :class="filterCls(f)"
                    :style="{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }">
              {{ f }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="py-10 text-center font-mono text-[11px] tracking-[1.4px] uppercase
                                   text-[var(--fg)] opacity-50 border border-[var(--border)]">
          Загрузка...
        </div>

        <div v-else class="border border-violet-500/10 overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-[var(--surface-2)] font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)]">
                <th class="px-4 py-3 text-left font-normal">Email</th>
                <th class="px-4 py-3 text-left font-normal">Имя</th>
                <th class="px-4 py-3 text-left font-normal">План</th>
                <th class="px-4 py-3 text-left font-normal">Сообщ.</th>
                <th class="px-4 py-3 text-left font-normal">Активность</th>
                <th class="px-4 py-3 text-right font-normal">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in filteredUsers" :key="u.id"
                  :class="['border-t border-[var(--border)]', i % 2 ? 'bg-[var(--surface-2)]' : 'bg-[var(--bg)]']"
                  :style="{ opacity: u.is_banned ? 0.5 : 1 }">
                <td class="px-4 py-3">
                  {{ u.email }}
                  <span v-if="u.is_admin" class="font-mono text-[9px] text-[var(--accent)] border border-[var(--accent)] px-1.5 py-0.5 ml-1.5 tracking-[1.2px]">ADMIN</span>
                  <span v-if="u.is_banned" class="font-mono text-[9px] text-[var(--danger)] border border-[var(--danger)] px-1.5 py-0.5 ml-1">BAN</span>
                </td>
                <td class="px-4 py-3">{{ u.username }}</td>
                <td class="px-4 py-3 font-mono text-[11px] tracking-[1px] uppercase"
                    :class="u.is_premium ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]'">
                  {{ planLabel(u) }}
                </td>
                <td class="px-4 py-3 font-mono text-[12px]">{{ u.total_messages }}</td>
                <td class="px-4 py-3 font-mono text-[11px] opacity-60">{{ formatDate(u.last_active) }}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-2 justify-end">
                    <button v-if="u.is_premium" :class="actBtn" @click="revokeSubscription(u.id)">Отозвать</button>
                    <button :class="dangerBtn" @click="toggleBan(u.id, u.is_banned)">
                      {{ u.is_banned ? 'Разбан' : 'Бан' }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="px-4 py-8 text-center italic text-[var(--fg)] opacity-50">
                  Нет пользователей
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── SUBSCRIPTIONS ── -->
      <div v-if="activeTab === 'subscriptions'">
        <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-5">
          Выдача подписок
        </div>

        <div class="border border-[var(--border)] p-6 max-w-[560px]">
          <div class="mb-4">
            <label class="font-mono text-[10px] tracking-[1.2px] uppercase text-[var(--fg)] opacity-60 block mb-1.5">
              Поиск по email
            </label>
            <input v-model="subSearch" class="m-input w-full" placeholder="user@example.com" />
            <div v-if="subSearch && foundUser" class="mt-1.5 text-[13px] text-[var(--accent)] font-mono">
              Найден: {{ foundUser.email }} ({{ planLabel(foundUser) }})
            </div>
            <div v-if="subSearch && !foundUser" class="mt-1.5 text-[13px] text-[var(--fg-muted)] font-mono">
              Не найден
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="font-mono text-[10px] tracking-[1.2px] uppercase text-[var(--fg)] opacity-60 block mb-1.5">
                Тип подписки
              </label>
              <div class="flex border border-[var(--border)]">
                <button v-for="[val, lbl] in [['premium','Premium'],['premium_plus','Premium+']]" :key="val"
                        @click="subType = val as any" :class="subTabCls(val, subType)">
                  {{ lbl }}
                </button>
              </div>
            </div>
            <div>
              <label class="font-mono text-[10px] tracking-[1.2px] uppercase text-[var(--fg)] opacity-60 block mb-1.5">
                Срок
              </label>
              <div class="flex flex-wrap border border-[var(--border)]">
                <button v-for="m in [1, 3, 6, 12, null]" :key="String(m)"
                        @click="subMonths = m"
                        :class="subTabCls(String(m), String(subMonths))"
                        style="min-width: 36px;">
                  {{ m ? m + 'м' : '∞' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="subMsg" class="mb-3 pl-3 border-l-[3px] border-[var(--accent)] text-[13px] text-[var(--accent)] font-mono">
            {{ subMsg }}
          </div>

          <button :class="actBtn" @click="grantSubscription" :disabled="!foundUser">
            Выдать подписку
          </button>
        </div>

        <div class="mt-8">
          <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-3">
            Активные подписки
          </div>
          <div class="border border-[var(--border)]">
            <div v-for="(u, i) in users.filter(u => u.is_premium)" :key="u.id"
                 class="flex justify-between items-center px-4 py-3"
                 :style="{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }">
              <div>
                <div class="text-[14px]">{{ u.email }}</div>
                <div class="font-mono text-[10px] mt-0.5 opacity-60 uppercase tracking-[1px]">
                  {{ planLabel(u) }} · {{ u.subscription_expires_at ? 'до ' + new Date(u.subscription_expires_at).toLocaleDateString('ru-RU') : 'навсегда' }}
                </div>
              </div>
              <button :class="dangerBtn" @click="revokeSubscription(u.id)">Отозвать</button>
            </div>
            <div v-if="users.filter(u => u.is_premium).length === 0"
                 class="px-4 py-6 text-center italic text-[var(--fg)] opacity-50">
              Нет активных подписок
            </div>
          </div>
        </div>
      </div>

      <!-- ── LIMITS ── -->
      <div v-if="activeTab === 'limits'">
        <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-5">
          Лимиты по тарифам
        </div>
        <div v-if="limitsMsg" class="mb-4 pl-3 border-l-[3px] border-[var(--accent)] text-[13px] text-[var(--accent)] font-mono">
          {{ limitsMsg }}
        </div>

        <div class="border border-[var(--border)] overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-[var(--surface-2)] font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)]">
                <th class="px-4 py-3 text-left font-normal">Тариф</th>
                <th class="px-4 py-3 text-left font-normal">Сообщ./день</th>
                <th class="px-4 py-3 text-left font-normal">История</th>
                <th class="px-4 py-3 text-left font-normal">Контекст (симв.)</th>
                <th class="px-4 py-3 text-left font-normal">Голос / окно</th>
                <th class="px-4 py-3 text-right font-normal">Сохранить</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pt, idx) in ['free', 'premium', 'premium_plus']" :key="pt"
                  :class="['border-t border-[var(--border)]', idx % 2 ? 'bg-[var(--surface-2)]' : 'bg-[var(--bg)]']">
                <td class="px-4 py-3 font-mono text-[11px] tracking-[1px] uppercase"
                    :class="pt === 'free' ? 'text-[var(--fg-muted)]' : 'text-[var(--accent)]'">
                  {{ planTypeLabels[pt] }}
                </td>
                <template v-if="planLimits[pt]">
                  <td class="px-4 py-2">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].daily_message_limit"
                           type="number" class="m-input w-20 py-1 px-2" @focus="startEdit(pt)" />
                    <span v-else @dblclick="startEdit(pt)" :class="editCell">
                      {{ planLimits[pt].daily_message_limit }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].context_messages"
                           type="number" class="m-input w-20 py-1 px-2" />
                    <span v-else @dblclick="startEdit(pt)" :class="editCell">
                      {{ planLimits[pt].context_messages }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <input v-if="editingLimits[pt]" v-model.number="editingLimits[pt].context_chars"
                           type="number" class="m-input w-24 py-1 px-2" />
                    <span v-else @dblclick="startEdit(pt)" :class="editCell">
                      {{ planLimits[pt].context_chars.toLocaleString() }}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <span v-if="editingLimits[pt]" class="flex gap-1.5 items-center">
                      <input v-model.number="editingLimits[pt].voice_limit" type="number" class="m-input w-16 py-1 px-2" />
                      <span class="text-[12px] opacity-60">/</span>
                      <input v-model.number="editingLimits[pt].voice_window_hours" type="number" class="m-input w-14 py-1 px-2" />
                      <span class="text-[12px] opacity-60">ч</span>
                    </span>
                    <span v-else @dblclick="startEdit(pt)" :class="editCell">
                      {{ planLimits[pt].voice_limit }} / {{ planLimits[pt].voice_window_hours }}ч
                    </span>
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button v-if="editingLimits[pt]" :class="actBtn" @click="saveLimits(pt)">Сохранить</button>
                    <button v-else :class="actBtn" @click="startEdit(pt)">Изменить</button>
                  </td>
                </template>
                <td v-else colspan="5" class="px-4 py-3 font-mono text-[11px] opacity-50">Загрузка...</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2.5 font-mono text-[10px] text-[var(--fg)] opacity-50 tracking-[1px]">
          Двойной клик по значению для редактирования. 9999 = безлимит.
        </div>
      </div>

      <!-- ── EVENTS ── -->
      <div v-if="activeTab === 'events'">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)]">
            Лог событий ({{ events.length }})
          </span>
          <button :class="actBtn" @click="loadEvents">↺ Обновить</button>
        </div>

        <div class="border border-[var(--border)] overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-[var(--surface-2)] font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)]">
                <th class="px-4 py-3 text-left font-normal whitespace-nowrap">Когда</th>
                <th class="px-4 py-3 text-left font-normal">Источник</th>
                <th class="px-4 py-3 text-left font-normal">Действие</th>
                <th class="px-4 py-3 text-left font-normal">Пользователь</th>
                <th class="px-4 py-3 text-left font-normal">Детали</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in events" :key="e.id"
                  :class="['border-t border-[var(--border)]', i % 2 ? 'bg-[var(--surface-2)]' : 'bg-[var(--bg)]']">
                <td class="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap opacity-70">
                  {{ formatDate(e.created_at) }}
                </td>
                <td class="px-4 py-2.5 text-[12px] font-mono">
                  <span v-if="!e.admin_email || e.admin_id === 0"
                        class="opacity-50 text-[10px] tracking-[1px] uppercase">Система</span>
                  <span v-else>{{ e.admin_email }}</span>
                </td>
                <td class="px-4 py-2.5 font-mono text-[11px] tracking-[0.8px] uppercase whitespace-nowrap"
                    :style="{ color: eventColor(e.action) }">
                  {{ eventLabel(e.action) }}
                </td>
                <td class="px-4 py-2.5 text-[13px] opacity-70">{{ e.target_email || '—' }}</td>
                <td class="px-4 py-2.5 font-mono text-[10px] opacity-55 max-w-[260px] truncate">
                  {{ e.details ? JSON.stringify(e.details) : '—' }}
                </td>
              </tr>
              <tr v-if="events.length === 0">
                <td colspan="5" class="px-4 py-8 text-center italic text-[var(--fg)] opacity-50">
                  Нет событий
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── FINANCE ── -->
      <div v-if="activeTab === 'finance'">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-5">
          <span class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)]">
            Финансы и баланс
          </span>
          <button :class="actBtn" @click="loadFinance">↺ Обновить</button>
        </div>

        <div v-if="financeLoading" class="py-10 text-center font-mono text-[11px] tracking-[1.4px] uppercase
                                          text-[var(--fg)] opacity-50 border border-[var(--border)]">
          Загрузка...
        </div>

        <div v-else-if="finance">
          <!-- OpenRouter block -->
          <div class="border border-[var(--border)] mb-4">
            <div class="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5
                        bg-[var(--surface-2)] border-b border-[var(--border)]">
              <span class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)]">OpenRouter API</span>
              <span class="font-mono text-[11px] opacity-60">{{ finance.model }}</span>
            </div>

            <div v-if="finance.openrouter?.error" class="p-5 text-[var(--danger)] font-mono text-[12px]">
              ✖ {{ finance.openrouter.error }}
            </div>
            <div v-else>
              <div class="grid grid-cols-1 sm:grid-cols-3">
                <div class="px-6 py-5 border-b sm:border-b-0 sm:border-r border-[var(--border)]">
                  <div class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)] mb-2">Потрачено</div>
                  <div class="font-bold text-[36px] text-[var(--danger)] tracking-[-1px] leading-none">
                    ${{ (finance.openrouter?.usage ?? 0).toFixed(4) }}
                  </div>
                </div>
                <div class="px-6 py-5 border-b sm:border-b-0 sm:border-r border-[var(--border)]">
                  <div class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)] mb-2">Лимит</div>
                  <div class="font-bold text-[36px] text-[var(--fg)] tracking-[-1px] leading-none">
                    {{ finance.openrouter?.limit != null ? '$' + Number(finance.openrouter.limit).toFixed(2) : '∞' }}
                  </div>
                </div>
                <div class="px-6 py-5">
                  <div class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)] mb-2">Осталось</div>
                  <div class="font-bold text-[36px] tracking-[-1px] leading-none"
                       :class="finance.openrouter?.limit != null ? 'text-[var(--accent)]' : 'text-[var(--fg-subtle)]'">
                    {{ finance.openrouter?.limit != null
                       ? '$' + (Number(finance.openrouter.limit) - (finance.openrouter?.usage ?? 0)).toFixed(4)
                       : '—' }}
                  </div>
                </div>
              </div>

              <div v-if="finance.openrouter?.limit != null" class="px-6 py-4 border-t border-[var(--border)]">
                <div class="h-1.5 bg-[var(--surface-3)] relative overflow-hidden rounded-sm">
                  <div class="h-full bg-[var(--danger)] transition-[width] duration-500"
                       :style="{ width: Math.min((finance.openrouter?.usage ?? 0) / Number(finance.openrouter.limit) * 100, 100) + '%' }">
                  </div>
                </div>
                <div class="mt-1.5 font-mono text-[10px] opacity-50 tracking-[1px]">
                  {{ ((finance.openrouter?.usage ?? 0) / Number(finance.openrouter.limit) * 100).toFixed(2) }}% лимита использовано
                </div>
              </div>

              <div class="flex flex-wrap gap-6 px-6 py-3.5 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <span class="font-mono text-[10px] tracking-[1px] opacity-60">
                  Free tier: <span :class="finance.openrouter?.is_free_tier ? 'text-[var(--accent)]' : ''">
                    {{ finance.openrouter?.is_free_tier ? 'Да' : 'Нет' }}
                  </span>
                </span>
                <span v-if="finance.openrouter?.rate_limit" class="font-mono text-[10px] tracking-[1px] opacity-60">
                  Rate limit: {{ finance.openrouter.rate_limit.requests }} req / {{ finance.openrouter.rate_limit.interval }}
                </span>
                <span v-if="finance.openrouter?.label" class="font-mono text-[10px] tracking-[1px] opacity-60">
                  Ключ: {{ finance.openrouter.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Platform stats -->
          <div class="border border-[var(--border)]">
            <div class="px-5 py-3.5 bg-[var(--surface-2)] border-b border-[var(--border)]">
              <span class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)]">
                Статистика платформы
              </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4">
              <div v-for="(item, i) in [
                { label: 'Всего юзеров',  value: finance.platform.total_users },
                { label: 'Premium',       value: finance.platform.premium_users },
                { label: 'Активных 24ч',  value: finance.platform.active_users },
                { label: 'Сообщений',     value: finance.platform.total_messages.toLocaleString() },
              ]" :key="item.label"
                 class="px-6 py-5"
                 :style="{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }">
                <div class="font-mono text-[10px] tracking-[1.4px] uppercase text-[var(--fg-subtle)] mb-2">
                  {{ item.label }}
                </div>
                <div class="font-bold text-[32px] text-[var(--fg)] tracking-[-1px] leading-none">
                  {{ item.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>
