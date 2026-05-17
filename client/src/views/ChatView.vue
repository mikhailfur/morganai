<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import CharacterPickerModal from '../components/CharacterPickerModal.vue'

const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()

const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isRecording = ref(false)
const sidebarOpen = ref(false)
const showModes = ref(false)
const showCharacterPicker = ref(false)
const isMobile = ref(window.innerWidth < 768)

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

const modes = [
  { id: 'default',      name: 'Обычный',   desc: 'Стандартный ролевой режим.' },
  { id: 'study',        name: 'Учёба',      desc: 'Репетитор. Помогает с заданиями.' },
  { id: 'work',         name: 'Работа',     desc: 'Деловой помощник.' },
  { id: 'psychologist', name: 'Психолог',   desc: 'Эмоциональная поддержка.' },
  { id: 'nsfw',         name: 'NSFW · 18+', desc: 'Без фильтра. Требуется Premium или верификация.', restricted: true },
]

const composerModes = modes.filter(m => m.id !== 'nsfw')
const currentMode = computed(() => modes.find(m => m.id === auth.user?.behavior_mode) || modes[0])

const nsfwGeoBlocked = ref(false)
const modeError = ref('')

async function setMode(mode: string) {
  try {
    await auth.updateSettings({ behavior_mode: mode })
    nsfwGeoBlocked.value = false
    modeError.value = ''
    showModes.value = false
  } catch (e: any) {
    const msg: string = e.message || ''
    if (msg.includes('регион') || msg.includes('geo') || msg.includes('region')) {
      nsfwGeoBlocked.value = true
      modeError.value = 'NSFW недоступен в вашем регионе'
    } else {
      modeError.value = msg
    }
    setTimeout(() => modeError.value = '', 4000)
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

function getCharInitial(name: string) {
  return (name || 'M')[0].toUpperCase()
}
</script>

<template>
  <div class="chat-root">

    <!-- Mobile overlay -->
    <Transition name="overlay-fade">
      <div v-if="sidebarOpen" class="mobile-overlay" @click="sidebarOpen = false" />
    </Transition>

    <!-- SIDEBAR -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen, 'sidebar-mobile': isMobile }">

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="sb-logo-box">M</div>
        <span class="sb-logo-text">Morgan AI</span>
        <button v-if="isMobile" @click="sidebarOpen = false" class="sb-close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Character list -->
      <div class="sb-section-label">Персонажи</div>
      <div class="sidebar-scroll sb-thin">
        <button
          v-for="c in chat.characters" :key="c.slug"
          @click="switchCharacter(c.slug)"
          :class="['sb-char-item', currentCharacter === c.slug ? 'active' : '']"
        >
          <div class="sb-char-avatar">{{ getCharInitial(c.name) }}</div>
          <div class="sb-char-info">
            <div class="sb-char-name">
              {{ c.name }}
              <span v-if="c.is_premium" class="sb-premium-dot">✦</span>
            </div>
            <div class="sb-char-desc">{{ c.description?.slice(0, 28) }}{{ (c.description?.length ?? 0) > 28 ? '…' : '' }}</div>
          </div>
        </button>

        <!-- User character active indicator -->
        <div v-if="currentCharacter.startsWith('uc:')" class="sb-char-item active" style="pointer-events: none;">
          <div class="sb-char-avatar">{{ getCharInitial(currentCharObj?.name || 'М') }}</div>
          <div class="sb-char-info">
            <div class="sb-char-name">{{ currentCharObj?.name || 'Мой персонаж' }}</div>
            <div class="sb-char-desc">Пользовательский</div>
          </div>
        </div>

        <button @click="showCharacterPicker = true; sidebarOpen = false" class="sb-all-chars-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Все персонажи
        </button>
      </div>

      <!-- User card -->
      <div class="sb-user-card">
        <div class="sb-user-avatar">{{ (auth.user?.username || 'U')[0].toUpperCase() }}</div>
        <div class="sb-user-info">
          <div class="sb-user-name">{{ auth.user?.username || 'Пользователь' }}</div>
          <div class="sb-user-plan">{{ auth.isPremium ? '✦ Premium' : 'Free' }}</div>
        </div>
        <div class="sb-user-actions">
          <router-link to="/settings" class="sb-action-btn" title="Настройки">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </router-link>
          <button @click="handleLogout" class="sb-action-btn" title="Выйти">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- MAIN -->
    <main class="chat-main">

      <!-- Header -->
      <header class="chat-header">
        <button @click="sidebarOpen = true" class="hamburger-btn" v-if="isMobile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div class="header-char-avatar">{{ charInitial }}</div>
        <div class="header-char-info">
          <div class="header-char-name">{{ currentCharObj?.name || 'Морган' }}</div>
          <div class="header-char-status">
            <span class="status-dot">●</span>
            онлайн · {{ currentMode.name }}
          </div>
        </div>

        <div style="flex: 1;" />

        <button @click="showModes = true" class="mode-btn" :title="'Режим: ' + currentMode.name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Режим
        </button>

        <div class="header-plan-badge" :class="auth.isPremium ? 'premium' : 'free'">
          {{ auth.isPremium ? '✦ Premium' : 'Free' }}
        </div>
      </header>

      <!-- Messages -->
      <div ref="messagesContainer" class="messages-area sb-thin">

        <!-- Empty state -->
        <div v-if="chat.messages.length === 0 && !chat.isLoading" class="empty-state">
          <div class="empty-avatar">{{ charInitial }}</div>
          <h2 class="empty-name">{{ currentCharObj?.name || 'Морган' }}</h2>
          <p class="empty-tagline">{{ currentCharObj?.description || 'Начни разговор — она ждёт.' }}</p>
          <p class="empty-greeting">{{ randomGreeting }}</p>
          <div class="suggestions-grid">
            <button
              v-for="s in suggestions" :key="s"
              @click="messageInput = s; sendMessage()"
              class="suggestion-btn"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Messages -->
        <div v-for="msg in chat.messages" :key="msg.timestamp" :class="['msg-row', msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai']">
          <!-- AI avatar -->
          <div v-if="msg.role === 'assistant'" class="msg-avatar-ai">{{ charInitial }}</div>

          <div :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
            <div v-if="msg.role === 'assistant'" class="bubble-sender">{{ currentCharObj?.name || 'Морган' }}</div>
            <div v-html="formatContent(msg.content)" class="bubble-content" />
            <audio v-if="msg.voiceUrl || msg.has_voice" :src="msg.voiceUrl" controls class="bubble-audio" />
            <span v-if="msg.isStreaming" class="streaming-cursor" />
            <div class="bubble-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="chat.isLoading && !chat.isStreaming" class="msg-row msg-row-ai">
          <div class="msg-avatar-ai">{{ charInitial }}</div>
          <div class="bubble-ai" style="padding: 14px 16px;">
            <div style="display: flex; gap: 5px; align-items: center;">
              <span class="typing-dot" />
              <span class="typing-dot" />
              <span class="typing-dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- Composer -->
      <div class="composer-wrap">
        <div class="composer">
          <!-- Mode switcher (inline, top of composer) -->
          <div class="mode-switcher">
            <button
              v-for="m in composerModes" :key="m.id"
              @click="setMode(m.id)"
              :class="['mode-tab', auth.user?.behavior_mode === m.id ? 'active' : '']"
            >{{ m.name }}</button>
            <button
              @click="showModes = true"
              :class="['mode-tab', auth.user?.behavior_mode === 'nsfw' ? 'active' : '']"
              :style="auth.user?.behavior_mode === 'nsfw' ? '' : 'opacity: 0.7'"
            >NSFW</button>
          </div>

          <div class="composer-input-row">
            <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileUpload" />

            <button @click="triggerFileUpload" class="composer-icon-btn" title="Загрузить фото">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>

            <button @click="isRecording = !isRecording" class="composer-icon-btn" :class="{ 'composer-icon-btn-active': isRecording }" title="Голосовое">
              <svg width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </button>

            <textarea
              v-model="messageInput"
              @keydown="handleKeydown"
              placeholder="Напиши сообщение..."
              rows="1"
              :disabled="chat.isLoading"
              class="m-textarea composer-textarea"
            />

            <button
              @click="sendMessage"
              :disabled="!messageInput.trim() || chat.isLoading"
              class="send-btn"
              :class="{ 'send-btn-active': messageInput.trim() && !chat.isLoading }"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>

          <div class="composer-footer">
            <span v-if="auth.user">{{ auth.user.daily_messages_count || 0 }} / {{ auth.isPremium ? '∞' : '50' }} сообщений сегодня</span>
          </div>
        </div>
      </div>
    </main>

    <!-- MODES MODAL -->
    <Teleport to="body">
      <Transition name="modal-pop">
        <div v-if="showModes" class="modal-overlay" @click.self="showModes = false">
          <div class="modal-box">
            <div class="modal-header">
              <h3 class="modal-title">Режим поведения</h3>
              <button @click="showModes = false" class="modal-close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div v-if="modeError" class="mode-error">{{ modeError }}</div>

            <div class="modes-grid">
              <div
                v-for="m in modes" :key="m.id"
                @click="m.restricted && !auth.canNsfw ? null : setMode(m.id)"
                :class="['mode-card', auth.user?.behavior_mode === m.id ? 'active' : '', m.restricted && !auth.canNsfw ? 'disabled' : '']"
              >
                <div class="mode-card-name">{{ m.name }}</div>
                <div class="mode-card-desc">{{ m.desc }}</div>
                <div v-if="m.restricted && !auth.canNsfw" class="mode-card-lock">✦ Premium или верификация 18+</div>
                <div v-if="m.restricted && nsfwGeoBlocked" class="mode-card-lock" style="color: var(--danger);">✖ Недоступно в вашем регионе</div>
                <div v-if="auth.user?.behavior_mode === m.id" class="mode-card-active-dot">●</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Character Picker -->
    <CharacterPickerModal
      :visible="showCharacterPicker"
      :current-slug="currentCharacter"
      @close="showCharacterPicker = false"
      @select="switchCharacter"
    />

  </div>
</template>

<style scoped>
/* ── Root ── */
.chat-root {
  height: 100vh;
  height: 100dvh;
  display: flex;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ── Mobile overlay ── */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 40;
  backdrop-filter: blur(4px);
}
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.25s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }

/* ── Sidebar ── */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: rgb(18 13 36 / 0.85);
  backdrop-filter: blur(16px);
  z-index: 50;
  transition: transform 0.25s;
}
.sidebar-mobile {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  transform: translateX(-100%);
}
.sidebar-mobile.sidebar-open {
  transform: translateX(0);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sb-logo-box {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 0 12px -4px rgb(124 58 237 / 0.5);
  flex-shrink: 0;
}
.sb-logo-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 15px;
  color: var(--fg);
  flex: 1;
}
.sb-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fg-subtle);
  display: flex;
  align-items: center;
  padding: 4px;
  transition: color 0.2s;
}
.sb-close-btn:hover { color: var(--fg); }

.sb-section-label {
  padding: 12px 20px 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  flex-shrink: 0;
}
.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 4px 10px;
}

.sb-char-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-lg);
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}
.sb-char-item:hover { background: var(--surface-2); }
.sb-char-item.active {
  background: rgb(124 58 237 / 0.15);
  box-shadow: inset 0 0 0 1px rgb(124 58 237 / 0.3);
}
.sb-char-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  flex-shrink: 0;
}
.sb-char-info { flex: 1; min-width: 0; }
.sb-char-name {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-char-item.active .sb-char-name { color: #c4b5fd; }
.sb-premium-dot {
  font-size: 9px;
  color: var(--fg-subtle);
}
.sb-char-desc {
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--fg-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.sb-all-chars-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border);
  background: transparent;
  cursor: pointer;
  color: var(--fg-subtle);
  font-family: var(--font-ui);
  font-size: 12px;
  margin-top: 6px;
  transition: all 0.2s;
}
.sb-all-chars-btn:hover {
  border-color: var(--border-hover);
  color: var(--fg-muted);
  background: var(--surface-2);
}

.sb-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sb-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #d946ef);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  flex-shrink: 0;
}
.sb-user-info { flex: 1; min-width: 0; }
.sb-user-name {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-user-plan {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  letter-spacing: 0.05em;
}
.sb-user-actions { display: flex; gap: 4px; }
.sb-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--fg-subtle);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.sb-action-btn:hover { background: var(--surface-2); color: var(--fg); }

/* ── Main ── */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* ── Header ── */
.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: rgb(9 5 20 / 0.8);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}
.hamburger-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  color: var(--fg-muted);
  transition: all 0.2s;
}
.hamburger-btn:hover { background: var(--surface-2); color: var(--fg); }
.header-char-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 0 12px -4px rgb(124 58 237 / 0.5);
}
.header-char-info { flex: 0 1 auto; }
.header-char-name {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 15px;
  color: var(--fg);
  line-height: 1.2;
}
.header-char-status {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
  margin-top: 1px;
}
.status-dot { color: #10b981; font-size: 8px; }
.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-muted);
  font-family: var(--font-ui);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.mode-btn:hover { border-color: var(--border-hover); color: var(--fg); background: var(--surface-2); }
.header-plan-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.header-plan-badge.premium { color: var(--accent-soft); border-color: rgb(124 58 237 / 0.3); }
.header-plan-badge.free { color: var(--fg-subtle); }

/* ── Messages ── */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 40px 20px;
}
.empty-avatar {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 28px;
  color: #fff;
  box-shadow: 0 0 32px -8px rgb(124 58 237 / 0.5);
  margin-bottom: 4px;
}
.empty-name {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: var(--fg);
}
.empty-tagline {
  font-size: 14px;
  color: var(--fg-muted);
  max-width: 320px;
}
.empty-greeting {
  font-style: italic;
  font-size: 14px;
  color: var(--fg-subtle);
  max-width: 360px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 14px 20px;
  margin-top: 4px;
}
.suggestions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
  max-width: 420px;
  width: 100%;
}
.suggestion-btn {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--fg-muted);
  font-family: var(--font-ui);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  line-height: 1.4;
}
.suggestion-btn:hover {
  border-color: var(--border-hover);
  background: var(--surface-2);
  color: var(--fg);
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.msg-row-user { justify-content: flex-end; }
.msg-row-ai  { justify-content: flex-start; }

.msg-avatar-ai {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
  margin-bottom: 2px;
}

.bubble-user {
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff;
  padding: 10px 16px;
  border-radius: var(--radius-2xl) var(--radius-2xl) 4px var(--radius-2xl);
  max-width: min(75%, 520px);
  word-break: break-word;
  box-shadow: 0 8px 24px -8px rgb(124 58 237 / 0.5);
  font-size: 14px;
  line-height: 1.55;
}
.bubble-ai {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--fg);
  padding: 10px 16px;
  border-radius: var(--radius-2xl) var(--radius-2xl) var(--radius-2xl) 4px;
  max-width: min(78%, 560px);
  word-break: break-word;
  font-size: 14px;
  line-height: 1.55;
}
.bubble-sender {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--accent-soft);
  text-transform: uppercase;
  margin-bottom: 5px;
}
.bubble-content { line-height: 1.55; }
.bubble-audio {
  margin-top: 8px;
  width: 100%;
  height: 32px;
  opacity: 0.85;
}
.streaming-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: var(--accent-soft);
  margin-left: 2px;
  animation: typingPulse 1s infinite;
  vertical-align: middle;
}
.bubble-time {
  font-family: var(--font-mono);
  font-size: 9px;
  margin-top: 5px;
  opacity: 0.4;
  letter-spacing: 0.04em;
}

/* ── Composer ── */
.composer-wrap {
  border-top: 1px solid var(--border);
  padding: 12px 20px 16px;
  background: var(--bg);
  flex-shrink: 0;
}
.composer {
  max-width: 860px;
  margin: 0 auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.composer:focus-within {
  border-color: rgb(139 92 246 / 0.4);
  box-shadow: 0 0 0 3px rgb(124 58 237 / 0.1);
}

.mode-switcher {
  display: flex;
  gap: 0;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--border);
}
.mode-tab {
  padding: 5px 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--fg-subtle);
  font-family: var(--font-ui);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.mode-tab:hover { color: var(--fg-muted); background: var(--surface-2); }
.mode-tab.active {
  color: var(--accent-soft);
  background: rgb(124 58 237 / 0.15);
}

.composer-input-row {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 10px 8px;
}
.composer-textarea {
  flex: 1;
  min-height: 38px;
  max-height: 180px;
  overflow-y: auto;
}
.composer-icon-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-subtle);
  cursor: pointer;
  transition: all 0.2s;
}
.composer-icon-btn:hover { background: var(--surface-2); color: var(--fg-muted); }
.composer-icon-btn-active { background: rgb(124 58 237 / 0.2) !important; color: var(--accent-soft) !important; }
.send-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--fg-subtle);
  cursor: not-allowed;
  transition: all 0.2s;
  opacity: 0.5;
}
.send-btn-active {
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff;
  cursor: pointer;
  opacity: 1;
  box-shadow: 0 4px 16px -4px rgb(124 58 237 / 0.5);
}
.send-btn-active:hover {
  box-shadow: 0 6px 20px -4px rgb(124 58 237 / 0.7);
  transform: translateY(-1px);
}
.composer-footer {
  padding: 4px 14px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  letter-spacing: 0.06em;
}

/* ── Modes modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(4px);
}
.modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 28px;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 48px -8px rgb(124 58 237 / 0.35);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.modal-title {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.02em;
  color: var(--fg);
}
.modal-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--fg-subtle);
  cursor: pointer;
  transition: all 0.2s;
}
.modal-close:hover { background: var(--surface-2); color: var(--fg); }
.mode-error {
  background: rgb(245 158 11 / 0.1);
  border: 1px solid rgb(245 158 11 / 0.3);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 12px;
  color: rgb(251 191 36);
  margin-bottom: 16px;
}
.modes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mode-card {
  padding: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.mode-card:hover { border-color: var(--border-hover); background: var(--surface-3); }
.mode-card.active {
  border-color: rgb(124 58 237 / 0.5);
  background: rgb(124 58 237 / 0.15);
  box-shadow: 0 0 16px -4px rgb(124 58 237 / 0.3);
}
.mode-card.disabled { opacity: 0.5; cursor: not-allowed; }
.mode-card-name {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
  margin-bottom: 6px;
}
.mode-card.active .mode-card-name { color: var(--accent-soft); }
.mode-card-desc {
  font-size: 12px;
  color: var(--fg-muted);
  line-height: 1.4;
}
.mode-card-lock {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--fg-subtle);
  margin-top: 6px;
  text-transform: uppercase;
}
.mode-card-active-dot {
  position: absolute;
  top: 10px;
  right: 12px;
  color: var(--accent-soft);
  font-size: 8px;
}

/* Modal animation */
.modal-pop-enter-active { animation: modalIn 0.2s ease-out; }
.modal-pop-leave-active { animation: modalIn 0.15s ease-in reverse; }
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar { position: fixed; top: 0; bottom: 0; left: 0; }
  .messages-area { padding: 16px 14px; }
  .composer-wrap { padding: 8px 12px 12px; }
  .mode-switcher { overflow-x: auto; }
  .suggestions-grid { grid-template-columns: 1fr; }
  .modes-grid { grid-template-columns: 1fr; }
  .header-plan-badge { display: none; }
}
</style>
