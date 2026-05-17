<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import type { UserCharacter } from '../types'
import Button from '../components/ui/Button.vue'
import CharacterPickerModal from '../components/CharacterPickerModal.vue'
import CharacterEditorModal from '../components/CharacterEditorModal.vue'

const router = useRouter()
const auth   = useAuthStore()
const chat   = useChatStore()

// ── Layout state ───────────────────────────────────────────────────────────
const mobileView  = ref<'sidebar' | 'chat'>('sidebar')
const sidebarTab  = ref<'discover' | 'chats' | 'favorites'>('chats')

// ── Discover state ─────────────────────────────────────────────────────────
const discoverSearch   = ref('')
const discoverCategory = ref('Все')
const discoverCats = ['Все', '🔥 Популярные', '🎭 Ролевые', '🧙 Фэнтези', '🧠 Помощники', '💼 Работа', '🎮 Игры']

const discoverChars = computed(() => {
  const all = [...chat.characters, ...chat.publicCharacters]
  const q = discoverSearch.value.trim().toLowerCase()
  return q ? all.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)) : all
})

// ── Refs ──────────────────────────────────────────────────────────────────
const messageInput        = ref('')
const messagesContainer   = ref<HTMLElement | null>(null)
const fileInput           = ref<HTMLInputElement | null>(null)
const isRecording         = ref(false)
const showNsfwBlockedPopup = ref(false)
const showCharacterPicker = ref(false)
const showCreateChar      = ref(false)
const editingChar         = ref<UserCharacter | null>(null)

// ── Current character ──────────────────────────────────────────────────────
const currentCharacter = computed(() => auth.user?.selected_character || 'morgan')

const currentCharObj = computed(() => {
  const slug = currentCharacter.value
  if (slug.startsWith('uc:')) {
    const id = parseInt(slug.slice(3), 10)
    return chat.myCharacters.find(c => c.id === id)
        || chat.publicCharacters.find(c => c.id === id)
  }
  return chat.characters.find(c => c.slug === slug)
})

const charName    = computed(() => currentCharObj.value?.name    || 'Морган')
const charInitial = computed(() => charName.value[0].toUpperCase())
const charAvatar  = computed(() => (currentCharObj.value as any)?.avatar_url ?? null)
const charDesc    = computed(() => (currentCharObj.value as any)?.description ?? 'AI-персонаж, готовый к диалогу.')

// Character tags (decorative)
const charTags = computed(() => {
  const slug = currentCharacter.value
  if (slug === 'morgan')    return ['#ролевой', '#умная', '#загадочная']
  if (slug.startsWith('uc:')) return ['#пользовательский', '#уникальный']
  return ['#AI', '#персонаж']
})

// ── Greetings / suggestions ────────────────────────────────────────────────
const chatGreetings = [
  '«Ты опоздал. Но я готова простить — если напишешь что-нибудь интересное.»',
  '«Снова ты. Я уже начала думать, что ты забыл обо мне.»',
  '«Тишина утомляет. Скажи хоть что-нибудь.»',
  '«О. Ты пришёл. Хорошо. Мне уже было скучно с моими мыслями.»',
  '«Привет. Я тут. Куда уж деваться.»',
]
const randomGreeting = chatGreetings[Math.floor(Math.random() * chatGreetings.length)]

const suggestions = [
  { icon: '✨', text: 'Расскажи что-нибудь о себе' },
  { icon: '💬', text: 'Как ты сегодня?' },
  { icon: '🎲', text: 'Придумаем что-нибудь интересное?' },
  { icon: '🔮', text: 'Есть секрет, которым хочешь поделиться?' },
]

// ── Modules (per-character) ────────────────────────────────────────────────
const currentCharModules = computed(() => {
  if (currentCharacter.value.startsWith('uc:')) return []
  const char = currentCharObj.value as any
  if (!char?.modules?.length) return []
  return char.modules.filter((m: any) => !m.isNsfw || auth.canNsfw)
})

const activeModuleId = computed(() => chat.characterModules[currentCharacter.value] ?? null)

async function setModule(moduleId: string) {
  const slug = currentCharacter.value
  if (slug.startsWith('uc:')) return
  try { await chat.setCharacterModule(slug, moduleId) } catch { /* */ }
}

watch(() => chat.nsfwBlocked, (blocked) => {
  if (blocked) {
    showNsfwBlockedPopup.value = true
    setTimeout(() => {
      showNsfwBlockedPopup.value = false
      chat.nsfwBlocked = false
    }, 6000)
  }
})

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  chat.isLoading  = false
  chat.isStreaming = false
  await Promise.all([
    chat.fetchCharacters(),
    chat.fetchMyCharacters(),
    chat.fetchPublicCharacters(),
  ])
  await chat.fetchHistory(currentCharacter.value)
  if (!currentCharacter.value.startsWith('uc:')) await chat.fetchCharacterModule(currentCharacter.value)
  nextTick(scrollToBottom)
})

watch(() => chat.messages.length, () => nextTick(scrollToBottom))
watch(() => chat.messages[chat.messages.length - 1]?.content, () => nextTick(scrollToBottom))

// ── Scroll ─────────────────────────────────────────────────────────────────
function scrollToBottom() {
  if (messagesContainer.value)
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

// ── Messaging ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = messageInput.value.trim()
  if (!text || chat.isLoading) return
  messageInput.value = ''
  await chat.sendMessage(text, currentCharacter.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

function triggerFileUpload() { fileInput.value?.click() }

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await chat.sendImage(file, '', currentCharacter.value)
  target.value = ''
}

async function sendSuggestion(text: string) {
  messageInput.value = text
  await sendMessage()
}

// ── Formatting ─────────────────────────────────────────────────────────────
function formatTime(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatContent(raw: string) {
  let out = raw.replace(/\[VOICE:[^\]]*\]/g, '')
  out = out.replace(/\(([^)]{2,})\)/g, '<span class="msg-thought">($1)</span>')
  out = out.replace(/\*([^*\n]+)\*/g, '<em class="msg-action">$1</em>')
  out = out.replace(/\n/g, '<br>')
  return out
}

// ── Character switch ────────────────────────────────────────────────────────
async function switchCharacter(slug: string) {
  await auth.updateSettings({ selected_character: slug })
  await chat.fetchHistory(slug)
  if (!slug.startsWith('uc:')) await chat.fetchCharacterModule(slug)
  showCharacterPicker.value = false
  mobileView.value = 'chat'
}

// ── User character ──────────────────────────────────────────────────────────
function openCreateChar() { editingChar.value = null; showCreateChar.value = true }
function onCharSaved(_char: UserCharacter) { showCreateChar.value = false; chat.fetchMyCharacters() }
function onCharDeleted(id: number) {
  if (currentCharacter.value === `uc:${id}`) switchCharacter('morgan')
  showCreateChar.value = false
}

// ── Misc ───────────────────────────────────────────────────────────────────
async function handleLogout() { await auth.logout(); router.push('/') }
function getCharInitial(name: string) { return (name || 'M')[0].toUpperCase() }
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-[#090514] text-[var(--fg)]">

    <!-- ══════════════════════════════════════════════════
         SIDEBAR
    ══════════════════════════════════════════════════ -->
    <aside :class="[
      'flex-col w-80 shrink-0 border-r border-violet-500/10 bg-[#120d24]',
      mobileView === 'sidebar' ? 'flex' : 'hidden md:flex',
    ]">

      <!-- Brand + Create CTA -->
      <div class="flex h-14 shrink-0 items-center justify-between border-b border-violet-500/10 px-4">
        <div class="flex items-center gap-2.5">
          <div class="flex size-8 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white text-sm font-bold shadow-[0_4px_16px_-4px_rgb(124_58_237_/_0.6)]">M</div>
          <span class="text-sm font-semibold tracking-tight text-[var(--fg)]">Morgan AI</span>
        </div>
        <Button variant="primary" size="sm" @click="openCreateChar">
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Создать
        </Button>
      </div>

      <!-- Nav tabs: Discover / Chats / Favorites -->
      <div class="flex shrink-0 gap-0.5 border-b border-violet-500/10 px-3 pt-2 pb-0">
        <button
          v-for="tab in [
            { id: 'discover',   label: 'Discover',   icon: '🔍' },
            { id: 'chats',      label: 'Chats',      icon: '💬' },
            { id: 'favorites',  label: 'Favorites',  icon: '★' },
          ]"
          :key="tab.id"
          @click="sidebarTab = (tab.id as 'discover' | 'chats' | 'favorites')"
          class="flex-1 pb-2 pt-1.5 text-center text-[11px] font-mono tracking-wider uppercase
                 border-b-2 transition-all duration-150"
          :class="sidebarTab === tab.id
            ? 'border-violet-500 text-violet-300'
            : 'border-transparent text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
        >{{ tab.icon }} {{ tab.label }}</button>
      </div>

      <!-- ── DISCOVER tab ── -->
      <template v-if="sidebarTab === 'discover'">
        <!-- Search -->
        <div class="px-3 pt-3 pb-2 shrink-0">
          <div class="flex items-center gap-2 rounded-[10px] border border-violet-500/10
                      bg-[var(--surface)] px-3 py-2 focus-within:border-violet-500/30
                      transition-colors duration-150">
            <svg class="size-3.5 shrink-0 text-[var(--fg-subtle)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              v-model="discoverSearch"
              placeholder="Поиск персонажей..."
              class="flex-1 bg-transparent text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] outline-none"
            />
          </div>
        </div>
        <!-- Category tags -->
        <div class="flex gap-1.5 overflow-x-auto px-3 pb-2 shrink-0" style="scrollbar-width:none">
          <button
            v-for="cat in discoverCats" :key="cat"
            @click="discoverCategory = cat"
            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wider
                   uppercase border transition-all duration-150 whitespace-nowrap"
            :class="discoverCategory === cat
              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
              : 'border-[var(--border)] text-[var(--fg-subtle)] hover:border-violet-500/20 hover:text-[var(--fg)]'"
          >{{ cat }}</button>
        </div>
        <!-- Characters grid -->
        <div class="flex-1 overflow-y-auto px-3 pb-3" style="scrollbar-width:thin">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="c in discoverChars" :key="(c as any).slug || (c as any).id"
              @click="switchCharacter((c as any).slug ? (c as any).slug : `uc:${(c as any).id}`)"
              class="flex flex-col items-center gap-1.5 rounded-[12px] border p-2.5 text-center
                     transition-all duration-150"
              :class="currentCharacter === ((c as any).slug || `uc:${(c as any).id}`)
                ? 'border-violet-500/40 bg-violet-500/10'
                : 'border-[var(--border)] hover:border-violet-500/20 hover:bg-[var(--surface-2)]'"
            >
              <div class="relative flex size-12 items-center justify-center rounded-[10px]
                          bg-gradient-to-br from-violet-600 to-indigo-600
                          text-white font-bold text-lg overflow-hidden">
                <img v-if="(c as any).avatar_url" :src="(c as any).avatar_url" :alt="c.name"
                     class="size-full object-cover object-top" />
                <span v-else>{{ getCharInitial(c.name) }}</span>
              </div>
              <div class="w-full">
                <div class="text-[11px] font-semibold text-[var(--fg)] truncate">{{ c.name }}</div>
                <div class="text-[9px] text-[var(--fg-subtle)] truncate">
                  {{ c.description?.slice(0, 22) }}{{ (c.description?.length ?? 0) > 22 ? '…' : '' }}
                </div>
              </div>
            </button>
          </div>
          <p v-if="discoverChars.length === 0"
             class="pt-8 text-center text-xs text-[var(--fg-subtle)]">Ничего не найдено</p>
        </div>
      </template>

      <!-- ── CHATS tab ── -->
      <template v-else-if="sidebarTab === 'chats'">
        <div class="flex-1 overflow-y-auto px-2 py-2" style="scrollbar-width:thin">
          <!-- Active user character -->
          <div
            v-if="currentCharacter.startsWith('uc:')"
            class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 mb-1
                   bg-violet-500/15 border border-violet-500/30"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-[10px]
                        bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white font-bold text-sm">
              {{ getCharInitial(currentCharObj?.name || 'М') }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-violet-200 truncate">{{ currentCharObj?.name || 'Мой персонаж' }}</div>
              <div class="text-[10px] text-violet-400">● активен</div>
            </div>
          </div>

          <!-- Canonical characters -->
          <button
            v-for="c in chat.characters" :key="c.slug"
            @click="switchCharacter(c.slug)"
            class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left
                   border transition-all duration-150 mb-1"
            :class="currentCharacter === c.slug
              ? 'bg-violet-500/15 border-violet-500/30'
              : 'border-transparent hover:bg-[var(--surface-2)] hover:border-violet-500/10'"
          >
            <div class="relative flex size-10 shrink-0 items-center justify-center rounded-[10px]
                        bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm overflow-hidden">
              <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name"
                   class="size-full object-cover object-top" />
              <span v-else>{{ getCharInitial(c.name) }}</span>
              <span v-if="currentCharacter === c.slug"
                    class="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-[#120d24]" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 text-sm font-medium leading-tight"
                   :class="currentCharacter === c.slug ? 'text-violet-200' : 'text-[var(--fg)]'">
                {{ c.name }}
                <span v-if="c.is_premium" class="text-[9px] text-violet-400/70">✦</span>
              </div>
              <div class="mt-0.5 text-[10px] text-[var(--fg-subtle)] truncate">
                {{ c.description?.slice(0, 30) }}{{ (c.description?.length ?? 0) > 30 ? '…' : '' }}
              </div>
            </div>
          </button>

          <!-- Browse all -->
          <button
            @click="showCharacterPicker = true"
            class="mt-1 flex w-full items-center gap-2 rounded-[10px] border border-dashed
                   border-violet-500/20 px-3 py-2 text-xs text-[var(--fg-subtle)]
                   hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5
                   transition-all duration-150"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Все персонажи
          </button>
        </div>
      </template>

      <!-- ── FAVORITES tab ── -->
      <template v-else>
        <div class="flex-1 overflow-y-auto px-2 py-2" style="scrollbar-width:thin">
          <p v-if="chat.myCharacters.length === 0"
             class="pt-12 text-center text-xs text-[var(--fg-subtle)] leading-relaxed px-4">
            Здесь будут ваши персонажи.<br />
            Нажмите «+ Создать» чтобы добавить первого.
          </p>
          <button
            v-for="c in chat.myCharacters" :key="c.id"
            @click="switchCharacter(`uc:${c.id}`)"
            class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left
                   border transition-all duration-150 mb-1"
            :class="currentCharacter === `uc:${c.id}`
              ? 'bg-violet-500/15 border-violet-500/30'
              : 'border-transparent hover:bg-[var(--surface-2)] hover:border-violet-500/10'"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-[10px]
                        bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white font-bold text-sm">
              {{ getCharInitial(c.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-[var(--fg)] truncate">{{ c.name }}</div>
              <div class="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--fg-subtle)]">
                <span v-if="c.is_public" class="text-violet-400/70">◎ публичный</span>
                <span v-else>приватный</span>
              </div>
            </div>
          </button>
          <button
            @click="openCreateChar"
            class="mt-1 flex w-full items-center gap-2 rounded-[10px] border border-dashed
                   border-violet-500/20 px-3 py-2 text-xs text-[var(--fg-subtle)]
                   hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5
                   transition-all duration-150"
          >
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Создать персонажа
          </button>
        </div>
      </template>

      <!-- ── User profile panel ── -->
      <div class="shrink-0 border-t border-violet-500/10 p-3">
        <div class="flex items-center gap-2.5 rounded-[12px] border border-violet-500/10
                    bg-[var(--surface)] p-2.5">
          <!-- Avatar -->
          <div class="flex size-9 shrink-0 items-center justify-center rounded-full
                      bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white text-sm font-bold">
            {{ (auth.user?.username || 'U')[0].toUpperCase() }}
          </div>
          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-[var(--fg)]">{{ auth.user?.username || 'Пользователь' }}</div>
            <div class="text-[10px] font-mono tracking-wider"
                 :class="auth.isPremium ? 'text-violet-400' : 'text-[var(--fg-subtle)]'">
              {{ auth.isPremium ? '✦ Premium' : 'Free plan' }}
            </div>
          </div>
          <!-- Actions -->
          <div class="flex items-center gap-1">
            <router-link v-if="auth.isAdmin" to="/admin"
              class="flex size-7 items-center justify-center rounded-[6px]
                     text-violet-400 hover:text-violet-300 hover:bg-violet-500/10
                     transition-colors duration-150"
              title="Панель администратора"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </router-link>
            <router-link to="/settings"
              class="flex size-7 items-center justify-center rounded-[6px]
                     text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]
                     transition-colors duration-150"
              title="Настройки"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </router-link>
            <router-link to="/support"
              class="flex size-7 items-center justify-center rounded-[6px]
                     text-[var(--fg-subtle)] hover:text-violet-400 hover:bg-violet-500/10
                     transition-colors duration-150"
              title="Поддержка"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </router-link>
            <router-link to="/pricing"
              class="flex size-7 items-center justify-center rounded-[6px]
                     text-[var(--fg-subtle)] hover:text-violet-400 hover:bg-violet-500/10
                     transition-colors duration-150"
              title="Подписка"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </router-link>
            <button
              @click="handleLogout"
              class="flex size-7 items-center justify-center rounded-[6px]
                     text-[var(--fg-subtle)] hover:text-red-400 hover:bg-red-500/10
                     transition-colors duration-150"
              title="Выйти"
            >
              <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- ══════════════════════════════════════════════════
         CHAT PANEL
    ══════════════════════════════════════════════════ -->
    <main :class="[
      'flex-col flex-1 min-w-0',
      mobileView === 'chat' ? 'flex' : 'hidden md:flex',
    ]">

      <!-- ── Chat header ── -->
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-violet-500/10
                     bg-[#120d24]/50 backdrop-blur-md px-4">

        <!-- Back (mobile) -->
        <button
          class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                 border border-[var(--border)] text-[var(--fg-muted)]
                 hover:bg-[var(--surface-2)] hover:text-[var(--fg)]
                 transition-colors duration-150 md:hidden"
          @click="mobileView = 'sidebar'"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <!-- Avatar -->
        <div class="relative flex size-9 shrink-0 items-center justify-center rounded-[10px]
                    bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm overflow-hidden">
          <img v-if="charAvatar" :src="charAvatar" :alt="charName" class="size-full object-cover object-top" />
          <span v-else>{{ charInitial }}</span>
          <span class="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border-2 border-[#120d24]" />
        </div>

        <!-- Name + status -->
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-[var(--fg)] leading-tight">{{ charName }}</div>
          <div class="flex items-center gap-1.5 text-[11px] text-[var(--fg-subtle)]">
            <span class="text-emerald-400">●</span>
            <span v-if="chat.activeCampaign" class="text-violet-400">
              {{ chat.activeCampaign.title }}
            </span>
            <span v-else>онлайн</span>
          </div>
        </div>

        <!-- Module selector (canonical chars only) -->
        <div v-if="currentCharModules.length > 1"
             class="flex items-center gap-1 shrink-0 overflow-x-auto max-w-[240px]"
             style="scrollbar-width:none">
          <button
            v-for="m in currentCharModules" :key="m.id"
            @click="setModule(m.id)"
            class="shrink-0 rounded-[6px] px-2.5 py-1 text-[11px] font-mono tracking-wider
                   uppercase transition-all duration-150 border whitespace-nowrap"
            :class="(activeModuleId || 'default') === m.id
              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
              : 'border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
          >{{ m.name }}</button>
        </div>

        <!-- Plan badge -->
        <div class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase"
             :class="auth.isPremium
               ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
               : 'bg-[var(--surface-2)] text-[var(--fg-subtle)] border border-[var(--border)]'">
          {{ auth.isPremium ? '✦ Premium' : 'Free' }}
        </div>
      </header>

      <!-- ── Messages area ── -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-6 space-y-5"
           style="scrollbar-width:thin">

        <!-- ─ Empty / Welcome state ─ -->
        <div
          v-if="chat.messages.length === 0 && !chat.isLoading"
          class="flex h-full flex-col items-center justify-center gap-5 text-center py-8"
        >
          <!-- Big avatar -->
          <div class="relative flex size-28 items-center justify-center rounded-[28px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-5xl font-bold text-white overflow-hidden
                      shadow-[0_24px_64px_-16px_rgb(124_58_237_/_0.7)]
                      ring-4 ring-violet-500/20">
            <img v-if="charAvatar" :src="charAvatar" :alt="charName" class="size-full object-cover object-top" />
            <span v-else>{{ charInitial }}</span>
          </div>

          <!-- Name + description -->
          <div class="max-w-xs">
            <h2 class="text-2xl font-semibold tracking-tight text-[var(--fg)]">{{ charName }}</h2>
            <p class="mt-2 text-sm text-[var(--fg-muted)] leading-relaxed">{{ charDesc }}</p>
          </div>

          <!-- Tags -->
          <div class="flex flex-wrap justify-center gap-1.5">
            <span
              v-for="tag in charTags" :key="tag"
              class="rounded-full border border-violet-500/20 bg-violet-500/5
                     px-2.5 py-0.5 text-[11px] font-mono text-violet-400/80"
            >{{ tag }}</span>
          </div>

          <!-- Greeting -->
          <p class="text-sm text-violet-300/70 italic max-w-xs">{{ randomGreeting }}</p>

          <!-- Suggested prompts -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-1">
            <button
              v-for="s in suggestions" :key="s.text"
              @click="sendSuggestion(s.text)"
              class="flex items-center gap-2.5 rounded-[12px] border border-violet-500/10
                     bg-[#120d24] px-4 py-3 text-sm text-[var(--fg-muted)] text-left
                     hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-[var(--fg)]
                     transition-all duration-200 active:scale-[0.98]"
            >
              <span class="text-base">{{ s.icon }}</span>
              <span>{{ s.text }}</span>
            </button>
          </div>
        </div>

        <!-- ─ Message list ─ -->
        <template v-for="msg in chat.messages" :key="msg.timestamp">

          <!-- User (right) -->
          <div v-if="msg.role === 'user'" class="flex justify-end">
            <div class="max-w-[80%] sm:max-w-[65%] rounded-[20px] rounded-tr-[4px]
                        bg-gradient-to-br from-violet-600 to-indigo-600 text-white
                        px-4 py-3 shadow-[0_8px_24px_-8px_rgb(124_58_237_/_0.5)]">
              <div v-html="formatContent(msg.content)" class="text-sm leading-relaxed" />
              <div class="mt-1.5 text-right text-[10px] text-white/50">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- AI (left) -->
          <div v-else class="flex items-end gap-2.5">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                        bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm font-bold
                        overflow-hidden self-end">
              <img v-if="charAvatar" :src="charAvatar" :alt="charName" class="size-full object-cover object-top" />
              <span v-else>{{ charInitial }}</span>
            </div>
            <div class="max-w-[80%] sm:max-w-[65%]">
              <div class="mb-1 text-[11px] font-mono text-[var(--fg-subtle)]">{{ charName }}</div>
              <div class="rounded-[20px] rounded-tl-[4px] border border-violet-500/10 bg-[#120d24] px-4 py-3">
                <div v-html="formatContent(msg.content)" class="text-sm leading-relaxed text-[var(--fg)]" />
                <span v-if="msg.isStreaming" class="streaming-cursor" />
                <audio v-if="msg.voiceUrl || msg.has_voice" :src="msg.voiceUrl" controls
                       class="mt-2 w-full h-8 rounded-[8px]" />
                <div class="mt-1.5 text-[10px] text-[var(--fg-subtle)]">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="chat.isLoading && !chat.isStreaming" class="flex items-end gap-2.5">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm font-bold">
            {{ charInitial }}
          </div>
          <div class="rounded-[20px] rounded-tl-[4px] border border-violet-500/10 bg-[#120d24] px-4 py-3">
            <div class="flex gap-1.5 items-center">
              <span class="typing-dot" /><span class="typing-dot" /><span class="typing-dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Composer ── -->
      <div class="shrink-0 border-t border-violet-500/10 bg-[#090514]/80 backdrop-blur-md p-3">

        <!-- Input row -->
        <div class="flex items-end gap-2 rounded-[14px] border border-violet-500/10
                    bg-[#120d24] px-3 py-2
                    focus-within:border-violet-500/40 transition-colors duration-200">

          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />

          <button @click="triggerFileUpload"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   text-[var(--fg-subtle)] hover:text-violet-400 hover:bg-violet-500/10
                   transition-colors duration-150 self-end mb-0.5"
            title="Загрузить фото">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <button @click="isRecording = !isRecording"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   transition-colors duration-150 self-end mb-0.5"
            :class="isRecording
              ? 'text-red-400 bg-red-500/15'
              : 'text-[var(--fg-subtle)] hover:text-violet-400 hover:bg-violet-500/10'"
            title="Голосовое">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
          </button>

          <textarea
            v-model="messageInput"
            @keydown="handleKeydown"
            placeholder="Напиши сообщение..."
            rows="1"
            :disabled="chat.isLoading"
            class="flex-1 resize-none bg-transparent text-sm text-[var(--fg)]
                   placeholder:text-[var(--fg-subtle)] outline-none leading-relaxed
                   py-1 min-h-[32px] max-h-[160px] disabled:opacity-50"
            style="scrollbar-width:none"
          />

          <button @click="sendMessage"
            :disabled="!messageInput.trim() || chat.isLoading"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   transition-all duration-150 self-end mb-0.5"
            :class="messageInput.trim() && !chat.isLoading
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_4px_16px_-4px_rgb(124_58_237_/_0.5)] hover:-translate-y-px active:scale-95'
              : 'bg-[var(--surface-2)] text-[var(--fg-subtle)] cursor-not-allowed'">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>

        <div class="mt-1.5 flex items-center justify-between px-1 text-[10px] text-[var(--fg-subtle)] font-mono">
          <span v-if="auth.user">
            {{ auth.user.daily_messages_count || 0 }} / {{ auth.isPremium ? '∞' : '50' }} сегодня
          </span>
          <span class="hidden sm:block">Enter — отправить · Shift+Enter — перенос</span>
        </div>
      </div>
    </main>

    <!-- ═══════════════════════════════════
         MODALS
    ═══════════════════════════════════ -->

    <!-- NSFW blocked popup -->
    <Transition name="slide-up">
      <div v-if="showNsfwBlockedPopup"
           class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                  flex items-start gap-3
                  bg-[#1a0f2e] border border-violet-500/30 rounded-[16px]
                  px-4 py-3 shadow-[0_16px_48px_-8px_rgb(0_0_0_/_0.6)]
                  max-w-sm w-[calc(100%-2rem)]">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-red-500/15 text-red-400">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-[var(--fg)]">NSFW заблокирован</p>
          <p class="text-xs text-[var(--fg-muted)] mt-0.5">
            Включите NSFW-режим в настройках.
            <router-link to="/settings" class="text-violet-400 hover:underline ml-1">Настройки</router-link>
            <router-link to="/pricing" class="text-violet-400 hover:underline ml-2">Premium</router-link>
          </p>
        </div>
        <button @click="showNsfwBlockedPopup = false; chat.nsfwBlocked = false"
                class="text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </Transition>

    <CharacterPickerModal
      :visible="showCharacterPicker" :current-slug="currentCharacter"
      @close="showCharacterPicker = false" @select="switchCharacter"
    />

    <CharacterEditorModal
      :visible="showCreateChar" :character="editingChar"
      @close="showCreateChar = false" @saved="onCharSaved" @deleted="onCharDeleted"
    />

  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>
