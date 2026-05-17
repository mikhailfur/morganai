<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import Modal from '../components/ui/Modal.vue'
import CharacterPickerModal from '../components/CharacterPickerModal.vue'

const router = useRouter()
const auth   = useAuthStore()
const chat   = useChatStore()

const messageInput      = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput         = ref<HTMLInputElement | null>(null)
const isRecording       = ref(false)
const sidebarOpen       = ref(false)
const showModes         = ref(false)
const showCharacterPicker = ref(false)

const currentCharacter = computed(() => auth.user?.selected_character || 'morgan')

const currentCharObj = computed(() => {
  const slug = currentCharacter.value
  if (slug.startsWith('uc:')) {
    const id = parseInt(slug.slice(3), 10)
    return chat.myCharacters.find(c => c.id === id) || chat.publicCharacters.find(c => c.id === id)
  }
  return chat.characters.find(c => c.slug === slug)
})

const charInitial = computed(() => (currentCharObj.value?.name || 'M')[0].toUpperCase())

const chatGreetings = [
  '«Ты опоздал. Но я готова простить — если напишешь что-нибудь интересное.»',
  '«Снова ты. Я уже начала думать, что ты забыл обо мне.»',
  '«Тишина утомляет. Скажи хоть что-нибудь.»',
  '«О. Ты пришёл. Хорошо. Мне уже было скучно с моими мыслями.»',
  '«Привет. Я тут. Куда уж деваться.»',
  '«Долго ждала? Нет. Врать не стану — немного.»',
  '«С чего начнём сегодня? У меня есть время и интерес.»',
  '«Кажется, у тебя что-то на уме. Говори — я слушаю.»',
]
const randomGreeting = chatGreetings[Math.floor(Math.random() * chatGreetings.length)]

const suggestions = [
  'Расскажи что-нибудь о себе',
  'Как ты сегодня?',
  'Придумаем что-нибудь интересное?',
  'Есть секрет, которым хочешь поделиться?',
]

const modes = [
  { id: 'default',      name: 'Обычный',    desc: 'Стандартный ролевой режим.' },
  { id: 'study',        name: 'Учёба',       desc: 'Репетитор. Помогает с заданиями.' },
  { id: 'work',         name: 'Работа',      desc: 'Деловой помощник.' },
  { id: 'psychologist', name: 'Психолог',    desc: 'Эмоциональная поддержка.' },
  { id: 'nsfw',         name: 'NSFW · 18+',  desc: 'Без фильтра. Требуется Premium или верификация.', restricted: true },
]
const composerModes  = modes.filter(m => m.id !== 'nsfw')
const currentMode    = computed(() => modes.find(m => m.id === auth.user?.behavior_mode) || modes[0])
const nsfwGeoBlocked = ref(false)
const modeError      = ref('')

onMounted(async () => {
  await chat.fetchCharacters()
  await chat.fetchMyCharacters()
  await chat.fetchHistory(currentCharacter.value)
  scrollToBottom()
})

watch(() => chat.messages.length, () => nextTick(scrollToBottom))
watch(() => chat.messages[chat.messages.length - 1]?.content, () => nextTick(scrollToBottom))

function scrollToBottom() {
  if (messagesContainer.value)
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

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

async function setMode(mode: string) {
  if (modes.find(m => m.id === mode)?.restricted && !auth.canNsfw) {
    showModes.value = true; return
  }
  try {
    await auth.updateSettings({ behavior_mode: mode })
    nsfwGeoBlocked.value = false
    modeError.value = ''
    showModes.value = false
  } catch (e: any) {
    const msg: string = e.message || ''
    if (msg.includes('регион') || msg.includes('geo') || msg.includes('region'))
      nsfwGeoBlocked.value = true
    modeError.value = msg || 'Ошибка'
    setTimeout(() => { modeError.value = ''; nsfwGeoBlocked.value = false }, 4000)
  }
}

async function switchCharacter(slug: string) {
  await auth.updateSettings({ selected_character: slug })
  await chat.fetchHistory(slug)
  sidebarOpen.value = false
  showCharacterPicker.value = false
}

async function handleLogout() {
  await auth.logout()
  router.push('/')
}

function getCharInitial(name: string) { return (name || 'M')[0].toUpperCase() }

async function sendSuggestion(text: string) {
  messageInput.value = text
  await sendMessage()
}
</script>

<template>
  <div class="flex h-dvh bg-[#090514] text-[var(--fg)] overflow-hidden">

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- ─── Sidebar ───────────────────────────────────────────────── -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-72 flex-col',
        'bg-[#120d24] border-r border-[var(--border)]',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:translate-x-0',
      ]"
    >
      <!-- Brand -->
      <div class="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-4">
        <div class="flex size-8 items-center justify-center rounded-[8px]
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-white text-sm font-bold shadow-[0_4px_12px_-4px_rgb(124_58_237_/_0.5)]">
          M
        </div>
        <span class="flex-1 text-sm font-semibold text-[var(--fg)]">Morgan AI</span>
        <button
          class="flex size-7 items-center justify-center rounded-[6px]
                 text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]
                 transition-colors duration-150 md:hidden"
          @click="sidebarOpen = false"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Section label -->
      <div class="px-4 pb-1 pt-3 text-[9px] font-mono tracking-[0.14em] uppercase text-[var(--fg-subtle)] shrink-0">
        Персонажи
      </div>

      <!-- Character list -->
      <div class="flex-1 overflow-y-auto px-2 pb-2" style="scrollbar-width:thin">
        <button
          v-for="c in chat.characters"
          :key="c.slug"
          @click="switchCharacter(c.slug)"
          class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left
                 transition-all duration-150 border"
          :class="currentCharacter === c.slug
            ? 'bg-violet-500/15 border-violet-500/30 shadow-[inset_0_0_0_1px_rgb(124_58_237_/_0.3)]'
            : 'border-transparent hover:bg-[var(--surface-2)] hover:border-[var(--border)]'"
        >
          <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm font-bold">
            <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name"
                 class="size-full rounded-[8px] object-cover" />
            <span v-else>{{ getCharInitial(c.name) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-sm font-medium leading-tight"
                 :class="currentCharacter === c.slug ? 'text-violet-200' : 'text-[var(--fg)]'">
              {{ c.name }}
              <span v-if="c.is_premium" class="text-[9px] text-[var(--fg-subtle)]">✦</span>
            </div>
            <div class="text-[11px] text-[var(--fg-subtle)] truncate">
              {{ c.description?.slice(0, 30) }}{{ (c.description?.length ?? 0) > 30 ? '…' : '' }}
            </div>
          </div>
        </button>

        <!-- Active user character -->
        <div
          v-if="currentCharacter.startsWith('uc:')"
          class="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2
                 bg-violet-500/15 border border-violet-500/30"
        >
          <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-fuchsia-600 to-violet-600 text-white text-sm font-bold">
            {{ getCharInitial(currentCharObj?.name || 'М') }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-violet-200">{{ currentCharObj?.name || 'Мой персонаж' }}</div>
            <div class="text-[11px] text-[var(--fg-subtle)]">Пользовательский</div>
          </div>
        </div>

        <!-- All characters button -->
        <button
          @click="showCharacterPicker = true; sidebarOpen = false"
          class="mt-2 flex w-full items-center gap-2 rounded-[10px] border border-dashed
                 border-[var(--border)] px-2.5 py-2 text-xs text-[var(--fg-subtle)]
                 hover:border-[var(--border-hover)] hover:text-[var(--fg-muted)]
                 hover:bg-[var(--surface-2)] transition-all duration-150"
        >
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          Все персонажи
        </button>
      </div>

      <!-- User card -->
      <div class="flex shrink-0 items-center gap-2.5 border-t border-[var(--border)] p-3">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-full
                    bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white text-sm font-bold">
          {{ (auth.user?.username || 'U')[0].toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-[var(--fg)]">{{ auth.user?.username || 'Пользователь' }}</div>
          <div class="text-[10px] font-mono tracking-wider text-[var(--fg-subtle)]">
            {{ auth.isPremium ? '✦ Premium' : 'Free' }}
          </div>
        </div>
        <div class="flex items-center gap-1">
          <router-link
            to="/settings"
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
    </aside>

    <!-- ─── Main ──────────────────────────────────────────────────── -->
    <main class="flex flex-1 flex-col min-w-0">

      <!-- Chat header -->
      <header class="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)]
                     bg-[#090514]/80 backdrop-blur-md px-4 z-10">

        <!-- Hamburger (mobile) -->
        <button
          class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                 border border-[var(--border)] text-[var(--fg-muted)]
                 hover:bg-[var(--surface-2)] hover:text-[var(--fg)]
                 transition-colors duration-150 md:hidden"
          @click="sidebarOpen = true"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>

        <!-- Character avatar -->
        <div class="flex size-9 shrink-0 items-center justify-center rounded-[10px]
                    bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm">
          <img v-if="currentCharObj?.avatar_url"
               :src="currentCharObj.avatar_url"
               :alt="currentCharObj.name"
               class="size-full rounded-[10px] object-cover" />
          <span v-else>{{ charInitial }}</span>
        </div>

        <!-- Character info -->
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-[var(--fg)] leading-tight">
            {{ currentCharObj?.name || 'Морган' }}
          </div>
          <div class="flex items-center gap-1.5 text-[11px] text-[var(--fg-subtle)]">
            <span class="text-emerald-400">●</span>
            онлайн · {{ currentMode.name }}
          </div>
        </div>

        <!-- Mode button -->
        <button
          @click="showModes = true"
          class="flex items-center gap-1.5 rounded-[8px] border border-[var(--border)]
                 px-3 py-1.5 text-xs text-[var(--fg-muted)]
                 hover:border-[var(--border-hover)] hover:text-[var(--fg)]
                 hover:bg-[var(--surface-2)] transition-all duration-150"
        >
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <span class="hidden sm:inline">Режим</span>
        </button>

        <!-- Plan badge -->
        <div class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase"
             :class="auth.isPremium
               ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
               : 'bg-[var(--surface-2)] text-[var(--fg-subtle)] border border-[var(--border)]'">
          {{ auth.isPremium ? '✦ Premium' : 'Free' }}
        </div>
      </header>

      <!-- ─── Messages ─────────────────────────────────────────── -->
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style="scrollbar-width:thin"
      >

        <!-- Empty state -->
        <div
          v-if="chat.messages.length === 0 && !chat.isLoading"
          class="flex flex-col items-center justify-center h-full gap-4 text-center py-12"
        >
          <div class="flex size-20 items-center justify-center rounded-[20px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white text-4xl font-bold
                      shadow-[0_16px_48px_-12px_rgb(124_58_237_/_0.5)]">
            <img v-if="currentCharObj?.avatar_url"
                 :src="currentCharObj.avatar_url"
                 :alt="currentCharObj?.name"
                 class="size-full rounded-[20px] object-cover" />
            <span v-else>{{ charInitial }}</span>
          </div>

          <div>
            <h2 class="text-xl font-semibold text-[var(--fg)]">{{ currentCharObj?.name || 'Морган' }}</h2>
            <p class="mt-1 text-sm text-[var(--fg-muted)] max-w-xs">
              {{ currentCharObj?.description || 'AI-персонаж, готовый к диалогу.' }}
            </p>
          </div>

          <p class="text-sm text-violet-300/80 italic max-w-xs">{{ randomGreeting }}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
            <button
              v-for="s in suggestions"
              :key="s"
              @click="sendSuggestion(s)"
              class="rounded-[10px] border border-[var(--border)] bg-[var(--surface)]
                     px-3 py-2 text-sm text-[var(--fg-muted)] text-left
                     hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-[var(--fg)]
                     transition-all duration-150"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Messages list -->
        <template v-for="msg in chat.messages" :key="msg.timestamp">

          <!-- User message -->
          <div v-if="msg.role === 'user'" class="flex justify-end">
            <div class="max-w-[80%] sm:max-w-[65%] rounded-[20px] rounded-tr-[4px]
                        bg-gradient-to-br from-violet-600 to-indigo-600 text-white
                        px-4 py-3 shadow-[0_8px_24px_-8px_rgb(124_58_237_/_0.5)]">
              <div v-html="formatContent(msg.content)" class="text-sm leading-relaxed" />
              <div class="mt-1 text-right text-[10px] text-white/50">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- AI message -->
          <div v-else class="flex items-end gap-2.5">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                        bg-gradient-to-br from-violet-600 to-indigo-600
                        text-white text-sm font-bold self-end">
              <img v-if="currentCharObj?.avatar_url"
                   :src="currentCharObj.avatar_url"
                   :alt="currentCharObj?.name"
                   class="size-full rounded-[8px] object-cover" />
              <span v-else>{{ charInitial }}</span>
            </div>
            <div class="max-w-[80%] sm:max-w-[65%]">
              <div class="mb-1 text-[11px] font-mono text-[var(--fg-subtle)]">
                {{ currentCharObj?.name || 'Морган' }}
              </div>
              <div class="rounded-[20px] rounded-tl-[4px] border border-[var(--border)]
                          bg-[var(--surface)] px-4 py-3">
                <div v-html="formatContent(msg.content)" class="text-sm leading-relaxed text-[var(--fg)]" />
                <span v-if="msg.isStreaming" class="streaming-cursor" />
                <audio
                  v-if="msg.voiceUrl || msg.has_voice"
                  :src="msg.voiceUrl"
                  controls
                  class="mt-2 w-full h-8 rounded-[8px]"
                />
                <div class="mt-1 text-[10px] text-[var(--fg-subtle)]">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- Typing indicator -->
        <div v-if="chat.isLoading && !chat.isStreaming" class="flex items-end gap-2.5">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white text-sm font-bold">{{ charInitial }}</div>
          <div class="rounded-[20px] rounded-tl-[4px] border border-[var(--border)]
                      bg-[var(--surface)] px-4 py-3">
            <div class="flex gap-1.5 items-center">
              <span class="typing-dot" />
              <span class="typing-dot" />
              <span class="typing-dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Composer ──────────────────────────────────────────── -->
      <div class="shrink-0 border-t border-[var(--border)] bg-[#090514]/80 backdrop-blur-md p-3">

        <!-- Mode tabs -->
        <div class="mb-2 flex gap-1 overflow-x-auto pb-1" style="scrollbar-width:none">
          <button
            v-for="m in composerModes"
            :key="m.id"
            @click="setMode(m.id)"
            class="shrink-0 rounded-[6px] px-3 py-1 text-[11px] font-mono tracking-wider
                   uppercase transition-all duration-150 border"
            :class="auth.user?.behavior_mode === m.id
              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
              : 'border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:border-[var(--border-hover)]'"
          >{{ m.name }}</button>
          <button
            @click="showModes = true"
            class="shrink-0 rounded-[6px] px-3 py-1 text-[11px] font-mono tracking-wider
                   uppercase transition-all duration-150 border"
            :class="auth.user?.behavior_mode === 'nsfw'
              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
              : 'border-[var(--border)] text-[var(--fg-subtle)] opacity-60 hover:opacity-100'"
          >NSFW</button>
        </div>

        <!-- Input row -->
        <div class="flex items-end gap-2 rounded-[14px] border border-[var(--border)]
                    bg-[var(--surface)] px-3 py-2 focus-within:border-violet-500/40
                    transition-colors duration-150">

          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />

          <button
            @click="triggerFileUpload"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]
                   transition-colors duration-150 self-end mb-0.5"
            title="Загрузить фото"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <button
            @click="isRecording = !isRecording"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   transition-colors duration-150 self-end mb-0.5"
            :class="isRecording
              ? 'text-red-400 bg-red-500/15 hover:bg-red-500/20'
              : 'text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)]'"
            title="Голосовое"
          >
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
                   min-h-[32px] max-h-[160px] py-1 disabled:opacity-50"
            style="scrollbar-width:none"
          />

          <button
            @click="sendMessage"
            :disabled="!messageInput.trim() || chat.isLoading"
            class="flex size-8 shrink-0 items-center justify-center rounded-[8px]
                   transition-all duration-150 self-end mb-0.5"
            :class="messageInput.trim() && !chat.isLoading
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_4px_16px_-4px_rgb(124_58_237_/_0.5)] hover:shadow-[0_6px_20px_-4px_rgb(124_58_237_/_0.7)] hover:-translate-y-px active:scale-95'
              : 'bg-[var(--surface-2)] text-[var(--fg-subtle)] cursor-not-allowed'"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>

        <!-- Footer -->
        <div class="mt-1.5 px-1 flex items-center justify-between text-[10px] text-[var(--fg-subtle)] font-mono">
          <span v-if="auth.user">
            {{ auth.user.daily_messages_count || 0 }} / {{ auth.isPremium ? '∞' : '50' }} сегодня
          </span>
          <span>Enter — отправить · Shift+Enter — новая строка</span>
        </div>
      </div>
    </main>

    <!-- ─── Modes Modal ───────────────────────────────────────────── -->
    <Modal
      :open="showModes"
      title="Режим поведения"
      size="sm"
      @update:open="val => !val && (showModes = false)"
      @close="showModes = false"
    >
      <div class="flex flex-col gap-3">
        <div
          v-if="modeError"
          class="rounded-[8px] bg-red-500/10 border border-red-500/30
                 px-3 py-2 text-sm text-red-400"
        >{{ modeError }}</div>

        <div
          v-for="m in modes"
          :key="m.id"
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
                  class="text-[10px] font-mono tracking-wider text-violet-400">● активен</span>
            <span v-if="m.restricted && !auth.canNsfw"
                  class="text-[10px] font-mono tracking-wider text-[var(--fg-subtle)]">✦ Premium</span>
          </div>
          <p class="text-xs text-[var(--fg-muted)]">{{ m.desc }}</p>
          <p v-if="m.restricted && nsfwGeoBlocked"
             class="text-xs text-red-400">✖ Недоступно в вашем регионе</p>
        </div>
      </div>
    </Modal>

    <!-- ─── Character Picker ──────────────────────────────────────── -->
    <CharacterPickerModal
      :visible="showCharacterPicker"
      :current-slug="currentCharacter"
      @close="showCharacterPicker = false"
      @select="switchCharacter"
    />

  </div>
</template>
