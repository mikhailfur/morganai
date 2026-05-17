<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Card    from '../components/ui/Card.vue'
import Input   from '../components/ui/Input.vue'
import Button  from '../components/ui/Button.vue'
import Modal   from '../components/ui/Modal.vue'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

// ─── Tabs ─────────────────────────────────────────────────────────────────
const tabs = [
  { id: 'profile',  label: 'Профиль',     svg: 'M12 12a5 5 0 110-10 5 5 0 010 10zm-7 8a7 7 0 0114 0H5z' },
  { id: 'general',  label: 'Основные',    svg: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
  { id: 'billing',  label: 'Подписка',    svg: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id: 'privacy',  label: 'Приватность', svg: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
{ id: 'account',  label: 'Аккаунт',     svg: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', danger: true },
]
const activeTab = ref('profile')

// ─── Modes ────────────────────────────────────────────────────────────────
const modes = [
  { id: 'default',      name: 'Обычный',    desc: 'Стандартный ролевой режим.' },
  { id: 'study',        name: 'Учёба',       desc: 'Репетитор. Помогает с заданиями.' },
  { id: 'work',         name: 'Работа',      desc: 'Деловой помощник.' },
  { id: 'psychologist', name: 'Психолог',    desc: 'Эмоциональная поддержка.' },
  { id: 'nsfw',         name: 'NSFW · 18+',  desc: 'Без фильтра. Требуется Premium или верификация.', restricted: true },
]
const modeError      = ref('')
const nsfwGeoBlocked = ref(false)

async function setMode(mode: string) {
  const m = modes.find(m => m.id === mode)
  if (m?.restricted && !auth.canNsfw) {
    modeError.value = 'NSFW доступен с Premium или после верификации 18+'
    setTimeout(() => modeError.value = '', 3000)
    return
  }
  try {
    await auth.updateSettings({ behavior_mode: mode })
    modeError.value = ''
    nsfwGeoBlocked.value = false
  } catch (e: any) {
    const msg: string = e.message || ''
    if (msg.includes('регион') || msg.includes('geo')) nsfwGeoBlocked.value = true
    modeError.value = msg
    setTimeout(() => { modeError.value = ''; nsfwGeoBlocked.value = false }, 4000)
  }
}

// ─── KYC ──────────────────────────────────────────────────────────────────
const showKyc   = ref(false)
const kycLoading = ref(false)
const kycError   = ref('')
const kycSuccess = ref(false)

async function startKycVerification() {
  kycLoading.value = true; kycError.value = ''
  try {
    const result = await auth.startKycSession()
    if (result.already_verified) { showKyc.value = false; await auth.fetchUser(); return }
    if (result.session_url) {
      if (result.session_id) sessionStorage.setItem('kyc_session_id', result.session_id)
      window.open(result.session_url, '_blank', 'noopener,noreferrer')
      showKyc.value = false
    }
  } catch (e: any) { kycError.value = e.message || 'Ошибка' }
  finally { kycLoading.value = false }
}

onMounted(async () => {
  if (route.query.kyc !== 'done') return
  const sessionIdFromUrl     = route.query.verificationSessionId as string | undefined
  const sessionIdFromStorage = sessionStorage.getItem('kyc_session_id') || undefined
  const sessionId = sessionIdFromUrl || sessionIdFromStorage
  router.replace({ query: {} })
  sessionStorage.removeItem('kyc_session_id')
  if (sessionId) {
    activeTab.value = 'privacy'
    kycLoading.value = true; kycError.value = ''
    try {
      const result = await auth.verifyKycReturn(sessionId)
      if (result.verified) kycSuccess.value = true
      else if (result.geo_blocked) kycError.value = 'KYC верификация недоступна в вашем регионе'
      else await auth.fetchUser()
    } catch { await auth.fetchUser() }
    finally { kycLoading.value = false }
  } else { await auth.fetchUser() }
})

// ─── Password ─────────────────────────────────────────────────────────────
const showPasswordModal = ref(false)
const pwCurrent = ref(''); const pwNew = ref(''); const pwConfirm = ref('')
const pwError   = ref(''); const pwSuccess = ref(false); const pwLoading = ref(false)

function openPasswordModal() {
  pwCurrent.value = ''; pwNew.value = ''; pwConfirm.value = ''
  pwError.value = ''; pwSuccess.value = false; showPasswordModal.value = true
}

async function submitPasswordChange() {
  if (!pwCurrent.value || !pwNew.value || !pwConfirm.value) { pwError.value = 'Заполните все поля'; return }
  if (pwNew.value !== pwConfirm.value) { pwError.value = 'Новые пароли не совпадают'; return }
  if (pwNew.value.length < 8) { pwError.value = 'Минимум 8 символов'; return }
  pwLoading.value = true
  try {
    await auth.changePassword(pwCurrent.value, pwNew.value)
    pwSuccess.value = true
    setTimeout(() => { showPasswordModal.value = false }, 1500)
  } catch (e: any) { pwError.value = e.message }
  finally { pwLoading.value = false }
}

// ─── Delete ───────────────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deletePassword  = ref(''); const deleteError = ref(''); const deleteLoading = ref(false)

function openDeleteModal() { deletePassword.value = ''; deleteError.value = ''; showDeleteModal.value = true }

async function submitDelete() {
  if (!deletePassword.value) { deleteError.value = 'Введите пароль'; return }
  deleteLoading.value = true
  try { await auth.deleteAccount(deletePassword.value); router.push('/') }
  catch (e: any) { deleteError.value = e.message }
  finally { deleteLoading.value = false }
}

async function clearChat() {
  const { useChatStore } = await import('../stores/chat')
  const chat = useChatStore()
  if (confirm('Очистить всю историю чата?'))
    await chat.clearHistory(auth.user?.selected_character || 'morgan')
}
</script>

<template>
  <div class="flex h-dvh bg-[#090514] text-[var(--fg)] overflow-hidden">

    <!-- ─── Sidebar (desktop) ───────────────────────────────────── -->
    <aside class="hidden md:flex w-56 flex-col shrink-0 border-r border-[var(--border)] bg-[#120d24]">

      <!-- Brand / back -->
      <div class="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-4 shrink-0">
        <router-link to="/chat" class="flex items-center gap-2.5 group">
          <div class="flex size-8 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white text-sm font-bold">M</div>
          <span class="text-sm font-semibold text-[var(--fg-muted)] group-hover:text-[var(--fg)]
                       transition-colors duration-150">← В чат</span>
        </router-link>
      </div>

      <!-- Tabs -->
      <nav class="flex-1 overflow-y-auto p-2 space-y-0.5">
        <button
          v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm
                 transition-all duration-150 border"
          :class="[
            activeTab === t.id
              ? (t.danger ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-violet-500/15 border-violet-500/30 text-violet-200')
              : (t.danger ? 'border-transparent text-red-400/70 hover:bg-red-500/5 hover:border-red-500/20' : 'border-transparent text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]'),
          ]"
        >
          <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path :d="t.svg" />
          </svg>
          {{ t.label }}
        </button>
      </nav>
    </aside>

    <!-- ─── Main content ────────────────────────────────────────── -->
    <div class="flex flex-1 flex-col min-w-0 overflow-hidden">

      <!-- Mobile top bar -->
      <div class="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)]
                  bg-[#090514]/80 backdrop-blur-md px-4 md:hidden">
        <router-link to="/chat"
          class="flex items-center gap-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]
                 transition-colors duration-150">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          В чат
        </router-link>
        <span class="text-sm font-semibold text-[var(--fg)]">Настройки</span>
      </div>

      <!-- Mobile tab switcher -->
      <div class="flex gap-1 overflow-x-auto px-4 py-2.5 border-b border-[var(--border)] shrink-0 md:hidden"
           style="scrollbar-width:none">
        <button
          v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono tracking-wider uppercase
                 border transition-all duration-150 whitespace-nowrap"
          :class="activeTab === t.id
            ? (t.danger ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-violet-600/20 border-violet-500/40 text-violet-300')
            : (t.danger ? 'border-[var(--border)] text-red-400/60' : 'border-[var(--border)] text-[var(--fg-subtle)]')"
        >
          <svg class="size-3 shrink-0" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="t.svg" />
          </svg>
          {{ t.label }}
        </button>
      </div>

      <!-- Content area -->
      <div class="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8" style="scrollbar-width:thin">
        <div class="mx-auto max-w-2xl space-y-4">

          <!-- ── Profile ── -->
          <template v-if="activeTab === 'profile'">
            <h2 class="text-xl font-semibold tracking-tight text-[var(--fg)]">Профиль</h2>

            <Card padding="md">
              <div class="space-y-4">
                <div class="flex items-center gap-4">
                  <div class="flex size-14 items-center justify-center rounded-full
                              bg-gradient-to-br from-indigo-600 to-fuchsia-600
                              text-2xl font-bold text-white shrink-0">
                    {{ (auth.user?.username || 'U')[0].toUpperCase() }}
                  </div>
                  <div>
                    <div class="text-base font-semibold text-[var(--fg)]">{{ auth.user?.username }}</div>
                    <div class="text-sm text-[var(--fg-muted)]">{{ auth.user?.email }}</div>
                  </div>
                </div>

                <div class="border-t border-[var(--border)] pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-1">Тариф</div>
                    <div class="text-sm font-semibold"
                         :class="auth.isPremium ? 'text-violet-300' : 'text-[var(--fg-muted)]'">
                      {{ auth.user?.subscription_type === 'premium_plus' ? '✦ Premium+' : auth.isPremium ? '✦ Premium' : 'Free' }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-1">Сообщений всего</div>
                    <div class="text-sm font-semibold text-[var(--fg)]">{{ auth.user?.total_messages || 0 }}</div>
                  </div>
                  <div v-if="auth.user?.subscription_expires_at">
                    <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-1">Подписка до</div>
                    <div class="text-sm font-semibold text-[var(--fg)]">
                      {{ new Date(auth.user.subscription_expires_at).toLocaleDateString('ru-RU') }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-1">Верификация 18+</div>
                    <div class="text-sm font-semibold" :class="auth.isKycVerified ? 'text-emerald-400' : 'text-[var(--fg-muted)]'">
                      {{ auth.isKycVerified ? '✓ Подтверждено' : 'Не пройдена' }}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <!-- Voice stats -->
            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-3">Голосовых сообщений сегодня</div>
              <div class="flex items-end justify-between mb-2">
                <span class="text-3xl font-semibold text-violet-300">{{ auth.user?.voice_count_today || 0 }}</span>
                <span class="text-sm text-[var(--fg-subtle)]">/ 20</span>
              </div>
              <div class="flex gap-1">
                <div
                  v-for="i in 20" :key="i"
                  class="flex-1 h-1.5 rounded-sm transition-all duration-300"
                  :class="i <= (auth.user?.voice_count_today || 0)
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600'
                    : 'bg-[var(--surface-3)]'"
                />
              </div>
            </Card>
          </template>

          <!-- ── General ── -->
          <template v-else-if="activeTab === 'general'">
            <h2 class="text-xl font-semibold tracking-tight text-[var(--fg)]">Основные</h2>

            <!-- Mode error -->
            <div v-if="modeError"
                 class="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {{ modeError }}
            </div>

            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-3">Режим поведения</div>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="m in modes" :key="m.id"
                  @click="m.restricted && !auth.canNsfw ? undefined : setMode(m.id)"
                  class="flex flex-col gap-1 rounded-[10px] border p-3 transition-all duration-150"
                  :class="[
                    auth.user?.behavior_mode === m.id
                      ? 'bg-violet-500/15 border-violet-500/40'
                      : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]',
                    m.restricted && !auth.canNsfw ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-[var(--fg)]">{{ m.name }}</span>
                    <span v-if="auth.user?.behavior_mode === m.id"
                          class="text-[10px] text-violet-400">● активен</span>
                    <span v-else-if="m.restricted && !auth.canNsfw"
                          class="text-[10px] text-[var(--fg-subtle)]">✦ Premium</span>
                  </div>
                  <p class="text-xs text-[var(--fg-muted)]">{{ m.desc }}</p>
                  <p v-if="m.restricted && nsfwGeoBlocked" class="text-xs text-red-400">✖ Недоступно в регионе</p>
                </div>
              </div>
            </Card>
          </template>

          <!-- ── Billing ── -->
          <template v-else-if="activeTab === 'billing'">
            <h2 class="text-xl font-semibold tracking-tight text-[var(--fg)]">Подписка</h2>

            <Card padding="md" :class="auth.isPremium ? 'border-violet-500/30 shadow-[0_0_32px_-8px_rgb(124_58_237_/_0.3)]' : ''">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-2">Текущий план</div>
                  <div class="text-3xl font-semibold tracking-tight text-[var(--fg)]">
                    {{ auth.user?.subscription_type === 'premium_plus' ? 'Premium+' : auth.isPremium ? 'Premium' : 'Базовый' }}
                  </div>
                  <div v-if="auth.user?.subscription_expires_at" class="mt-1 text-sm text-[var(--fg-muted)]">
                    Активна до {{ new Date(auth.user.subscription_expires_at).toLocaleDateString('ru-RU') }}
                  </div>
                </div>
                <div v-if="auth.isPremium"
                     class="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30
                            px-3 py-1 text-xs font-mono text-emerald-400">
                  ● Активна
                </div>
              </div>

              <div v-if="auth.isPremium" class="mt-4 border-t border-[var(--border)] pt-4">
                <div class="flex justify-between text-sm text-[var(--fg-muted)] mb-2">
                  <span>Сообщений сегодня</span>
                  <span>{{ auth.user?.daily_messages_count || 0 }} / ∞</span>
                </div>
              </div>
            </Card>

            <div v-if="!auth.isPremium" class="flex gap-3">
              <Button variant="primary" size="md" as="router-link" to="/pricing">
                ✦ Перейти на Premium
              </Button>
            </div>

            <!-- Feature comparison -->
            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-3">Что входит в Premium</div>
              <ul class="space-y-2">
                <li v-for="feat in ['500 сообщений в день', 'Все персонажи платформы', 'Голосовые ответы', 'NSFW-режим', 'Расширенный контекст']"
                    :key="feat" class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                  <svg class="size-4 shrink-0 text-violet-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                  {{ feat }}
                </li>
              </ul>
            </Card>
          </template>

          <!-- ── Privacy ── -->
          <template v-else-if="activeTab === 'privacy'">
            <h2 class="text-xl font-semibold tracking-tight text-[var(--fg)]">Приватность</h2>

            <!-- KYC status -->
            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-3">
                Верификация возраста (18+)
              </div>

              <div v-if="kycLoading" class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Проверяем результат верификации...
              </div>

              <div v-else-if="kycSuccess || auth.isKycVerified"
                   class="flex items-center gap-2 text-sm text-emerald-400">
                <svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                Возраст подтверждён — NSFW разблокирован
              </div>

              <template v-else>
                <div v-if="kycError" class="mb-3 rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {{ kycError }}
                </div>
                <p class="text-sm text-[var(--fg-muted)] mb-4 leading-relaxed">
                  Подтверди возраст через сервис Didit, чтобы разблокировать NSFW-режим без Premium.
                  После нажатия откроется новая вкладка.
                </p>
                <Button variant="ghost" size="sm" @click="showKyc = true">
                  Подтвердить возраст 18+
                </Button>
              </template>
            </Card>

            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-3">Данные и приватность</div>
              <p class="text-sm text-[var(--fg-muted)] leading-relaxed">
                Ваши диалоги хранятся в зашифрованном виде. Мы не продаём данные и не передаём третьим лицам.
                Удалить все данные можно в разделе «Аккаунт».
              </p>
            </Card>
          </template>

          <!-- ── Account (danger zone) ── -->
          <template v-else-if="activeTab === 'account'">
            <h2 class="text-xl font-semibold tracking-tight text-[var(--fg)]">Аккаунт</h2>

            <Card padding="md">
              <div class="text-[11px] font-mono tracking-wider uppercase text-[var(--fg-subtle)] mb-4">Безопасность</div>
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-medium text-[var(--fg)]">Сменить пароль</div>
                  <div class="text-xs text-[var(--fg-muted)] mt-0.5">Обновить пароль от аккаунта</div>
                </div>
                <Button variant="ghost" size="sm" @click="openPasswordModal">Сменить</Button>
              </div>
            </Card>

            <!-- Danger zone -->
            <Card padding="md" class="border-red-500/20">
              <div class="text-[11px] font-mono tracking-wider uppercase text-red-400/80 mb-4">Опасная зона</div>
              <div class="space-y-4">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <div class="text-sm font-medium text-[var(--fg)]">Очистить историю чата</div>
                    <div class="text-xs text-[var(--fg-muted)] mt-0.5">Удалит все сообщения безвозвратно</div>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    class="!text-red-400 !border-red-500/30 hover:!bg-red-500/10"
                    @click="clearChat"
                  >Очистить</Button>
                </div>
                <div class="border-t border-[var(--border)] pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div class="text-sm font-medium text-[var(--fg)]">Удалить аккаунт</div>
                    <div class="text-xs text-[var(--fg-muted)] mt-0.5">Все данные будут удалены навсегда</div>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    class="!text-red-400 !border-red-500/30 hover:!bg-red-500/10"
                    @click="openDeleteModal"
                  >Удалить</Button>
                </div>
              </div>
            </Card>
          </template>

        </div>
      </div>
    </div>
  </div>

  <!-- ─── KYC Modal ──────────────────────────────────────────────────── -->
  <Modal :open="showKyc" title="Подтверждение возраста 18+" size="sm"
         @update:open="val => !val && (showKyc = false)" @close="showKyc = false">
    <div class="space-y-4">
      <p class="text-sm text-[var(--fg-muted)] leading-relaxed">
        Для доступа к NSFW-контенту необходимо пройти верификацию через <strong class="text-[var(--fg)]">Didit</strong>.
        После нажатия откроется новая вкладка — вернитесь сюда после завершения.
      </p>
      <div v-if="kycError"
           class="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {{ kycError }}
      </div>
    </div>
    <template #footer>
      <div class="flex gap-2">
        <Button variant="primary" size="md" :loading="kycLoading" @click="startKycVerification">
          Начать верификацию
        </Button>
        <Button variant="ghost" size="md" @click="showKyc = false">Отмена</Button>
      </div>
    </template>
  </Modal>

  <!-- ─── Password Modal ────────────────────────────────────────────── -->
  <Modal :open="showPasswordModal" title="Смена пароля" size="sm"
         @update:open="val => !val && (showPasswordModal = false)" @close="showPasswordModal = false">
    <div class="space-y-4">
      <div v-if="pwSuccess"
           class="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
        Пароль успешно изменён
      </div>
      <div v-if="pwError"
           class="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {{ pwError }}
      </div>
      <Input v-model="pwCurrent" label="Текущий пароль" type="password" placeholder="••••••••" />
      <Input v-model="pwNew" label="Новый пароль" type="password" placeholder="Мин. 8 символов" hint="Минимум 8 символов" />
      <Input v-model="pwConfirm" label="Повторите пароль" type="password" placeholder="••••••••" />
    </div>
    <template #footer>
      <div class="flex gap-2">
        <Button variant="primary" size="md" :loading="pwLoading" @click="submitPasswordChange">Сохранить</Button>
        <Button variant="ghost" size="md" @click="showPasswordModal = false">Отмена</Button>
      </div>
    </template>
  </Modal>

  <!-- ─── Delete Modal ──────────────────────────────────────────────── -->
  <Modal :open="showDeleteModal" title="Удалить аккаунт" size="sm"
         @update:open="val => !val && (showDeleteModal = false)" @close="showDeleteModal = false">
    <div class="space-y-4">
      <p class="text-sm text-[var(--fg-muted)] leading-relaxed">
        Это действие <strong class="text-red-400">необратимо</strong>. Все ваши данные, история чатов
        и настройки будут удалены навсегда.
      </p>
      <div v-if="deleteError"
           class="rounded-[8px] border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {{ deleteError }}
      </div>
      <Input v-model="deletePassword" label="Пароль для подтверждения" type="password" placeholder="••••••••" />
    </div>
    <template #footer>
      <div class="flex gap-2">
        <Button
          variant="ghost" size="md"
          class="!text-red-400 !border-red-500/30 hover:!bg-red-500/10"
          :loading="deleteLoading"
          @click="submitDelete"
        >Удалить навсегда</Button>
        <Button variant="ghost" size="md" @click="showDeleteModal = false">Отмена</Button>
      </div>
    </template>
  </Modal>
</template>
