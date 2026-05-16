<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useThemeStore } from '../stores/theme'
import CharacterPickerModal from '../components/CharacterPickerModal.vue'

const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()
const theme = useThemeStore()

const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isRecording = ref(false)
const sidebarOpen = ref(false)
const showModes = ref(false)
const showCharacterPicker = ref(false)
const isMobile = ref(window.innerWidth < 768)

const currentCharacter = computed(() => auth.user?.selected_character || 'morgan')
// Текущий объект — ищем сначала в canonical, потом в user characters (по slug uc:ID)
const currentCharObj = computed(() => {
  const slug = currentCharacter.value
  if (slug.startsWith('uc:')) {
    const id = parseInt(slug.slice(3), 10)
    return chat.myCharacters.find(c => c.id === id) ||
           chat.publicCharacters.find(c => c.id === id)
  }
  return chat.characters.find(c => c.slug === slug)
})

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

async function clearChat() {
  if (confirm('Очистить историю чата?'))
    await chat.clearHistory(currentCharacter.value)
}

function formatTime(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatContent(raw: string) {
  // Strip [VOICE: ...] tags — already handled as audio
  let out = raw.replace(/\[VOICE:[^\]]*\]/g, '')

  // 1. Thoughts (мысли в скобках) — run BEFORE italic so parens in CSS vars aren't touched
  out = out.replace(/\(([^)]{2,})\)/g, '<span class="msg-thought">($1)</span>')

  // 2. Actions *курсив* — use CSS class, no inline var() to avoid paren collision
  out = out.replace(/\*([^*\n]+)\*/g, '<em class="msg-action">$1</em>')

  // 3. Newlines
  out = out.replace(/\n/g, '<br>')

  return out
}

const modes = [
  { id: 'default',     sym: 'i',   name: 'Обычный',   desc: 'Стандартный ролевой режим. NSFW фильтр включён.' },
  { id: 'study',       sym: 'ii',  name: 'Учёба',      desc: 'Репетитор. Помогает с заданиями и объясняет.' },
  { id: 'work',        sym: 'iii', name: 'Работа',     desc: 'Деловой помощник. Письма, задачи, переговоры.' },
  { id: 'psychologist',sym: 'iv',  name: 'Психолог',   desc: 'Эмоциональная поддержка. Без оценок и советов.' },
  { id: 'nsfw',        sym: 'v',   name: 'NSFW · 18+', desc: 'Без фильтра. Только для Premium.', premium: true },
]

async function setMode(mode: string) {
  await auth.updateSettings({ behavior_mode: mode })
  showModes.value = false
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
</script>

<template>
  <div class="chat-root">

    <!-- Mobile overlay -->
    <Transition name="overlay-fade">
      <div v-if="sidebarOpen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40;" @click="sidebarOpen = false" class="md-hidden" />
    </Transition>

    <!-- SIDEBAR -->
    <aside :style="{
      width: '220px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: 'var(--border)',
      background: 'var(--bg-alt)',
      position: isMobile ? 'fixed' : 'relative',
      top: 0, bottom: 0, left: 0,
      zIndex: 50,
      transform: (isMobile && !sidebarOpen) ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.25s',
    }">
      <!-- Logo -->
      <div style="padding: 20px 20px 14px; border-bottom: var(--border);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img :src="'/logo.svg'" alt="Morgan" style="height: 40px; border-radius: 5px; display: block;" />
          <span style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent);">Morgan</span>
        </div>
        <div style="font-family: var(--font-mono); font-size: 9px; color: var(--accent2); letter-spacing: 1.6px; text-transform: uppercase; margin-top: 3px;">AI · OP. III</div>
      </div>

      <!-- Nav label -->
      <div style="padding: 12px 20px 6px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent); font-weight: 700; opacity: 0.8;">Меню</div>

      <!-- Characters -->
      <div style="flex: 1; overflow-y: auto;">
        <!-- Current character display -->
        <button
          @click="showCharacterPicker = true; sidebarOpen = false"
          class="nav-item"
          style="width: 100%; text-align: left; border-bottom: var(--border);"
        >
          <div style="font-size: 14px; line-height: 1.2; display: flex; align-items: center; justify-content: space-between;">
            <span>{{ currentCharObj?.name || 'Морган' }}</span>
            <span style="font-family: var(--font-mono); font-size: 9px; opacity: 0.6; letter-spacing: 1px;">↕ сменить</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 9px; opacity: 0.6; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase;">
            активный персонаж
          </div>
        </button>
        <!-- Canonical quick list -->
        <button
          v-for="c in chat.characters" :key="c.slug"
          @click="switchCharacter(c.slug)"
          :class="['nav-item', currentCharacter === c.slug ? 'active' : '']"
          style="width: 100%; text-align: left;"
        >
          <div style="font-size: 14px; line-height: 1.2; display: flex; align-items: center; justify-content: space-between;">
            {{ c.name }}
            <span v-if="c.is_premium" style="font-family: var(--font-mono); font-size: 9px; color: var(--meta); letter-spacing: 1px;">✦</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 9px; opacity: 0.6; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase; font-weight: 400;">
            {{ c.description?.slice(0, 28) }}{{ (c.description?.length ?? 0) > 28 ? '...' : '' }}
          </div>
        </button>
        <!-- All characters button -->
        <button
          @click="showCharacterPicker = true; sidebarOpen = false"
          class="nav-item"
          style="width: 100%; text-align: left; opacity: 0.7; font-size: 12px;"
        >
          ✦ Все персонажи и мои...
        </button>
      </div>

      <!-- Bottom actions -->
      <div style="padding: 8px 0; border-top: var(--border);">
        <button @click="showModes = true; sidebarOpen = false" class="nav-item" style="width: 100%; text-align: left; font-size: 13px;">
          Режим: {{ modes.find(m => m.id === auth.user?.behavior_mode)?.name || 'Обычный' }}
        </button>
        <router-link to="/settings" class="nav-item" style="text-decoration: none; display: block; font-size: 13px;">Настройки</router-link>
        <button @click="clearChat" class="nav-item" style="width: 100%; text-align: left; font-size: 13px; opacity: 0.7;">Очистить чат</button>
        <router-link v-if="auth.isAdmin" to="/admin" class="nav-item" style="text-decoration: none; display: block; font-size: 13px;">Админка</router-link>
        <button @click="theme.toggle()" class="nav-item" style="width: 100%; text-align: left; font-size: 13px; opacity: 0.7;">
          {{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}
        </button>
        <button @click="handleLogout" class="nav-item" style="width: 100%; text-align: left; font-size: 13px; color: var(--accent2);">Выйти</button>
      </div>
    </aside>

    <!-- MAIN CHAT -->
    <main style="flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative;">

      <!-- Top bar -->
      <header style="
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
        border-bottom: var(--border);
        background: var(--bg);
        z-index: 10;
        flex-shrink: 0;
      ">
        <!-- Mobile hamburger -->
        <button @click="sidebarOpen = !sidebarOpen" style="
          width: 36px; height: 36px;
          display: none;
          align-items: center; justify-content: center;
          border: var(--border);
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          color: var(--fg);
        " class="mobile-menu-btn">☰</button>

        <div>
          <div style="font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--accent);">
            {{ currentCharObj?.name || 'Морган' }}
          </div>
          <div style="font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--meta); margin-top: 2px;">
            ● онлайн · {{ modes.find(m => m.id === auth.user?.behavior_mode)?.name || 'Обычный' }}
          </div>
        </div>
        <div style="flex: 1;"></div>
        <div style="font-family: var(--font-ui); font-size: 12px; color: var(--fg); opacity: 0.6;">
          {{ auth.isPremium ? '✦ Premium' : 'Free' }}
        </div>
      </header>

      <!-- Messages area -->
      <div ref="messagesContainer" style="flex: 1; overflow-y: auto; padding: 24px 32px; display: flex; flex-direction: column; gap: 16px;">

        <!-- Empty state -->
        <div v-if="chat.messages.length === 0 && !chat.isLoading" style="
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
          text-align: center;
          padding: 40px;
        ">
          <div style="
            padding: 16px 24px;
            background: var(--bg-alt);
            border: var(--border);
            box-shadow: var(--shadow-sm);
            position: relative;
          ">
            <div style="
              position: absolute; top: -12px; left: 16px;
              background: var(--accent3); color: var(--fg);
              padding: 2px 10px; border: var(--border);
              font-family: var(--font-ui); font-size: 11px; font-weight: 700;
            ">{{ currentCharObj?.name || 'МОРГАН' }}</div>
            <p style="font-family: var(--font-display); font-style: italic; font-size: 17px; line-height: 1.5; color: var(--fg);">
              {{ randomGreeting }}
            </p>
          </div>
          <p style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.4;">Напиши первое сообщение</p>
        </div>

        <!-- Messages -->
        <div v-for="msg in chat.messages" :key="msg.timestamp" :style="{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }">
          <div :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'">
            <div v-if="msg.role === 'assistant'" style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent2); margin-bottom: 6px;">
              {{ currentCharObj?.name || 'Морган' }}
            </div>
            <div v-html="formatContent(msg.content)" style="line-height: 1.55;" />
            <audio v-if="msg.voiceUrl || msg.has_voice" :src="msg.voiceUrl" controls style="margin-top: 10px; width: 100%; height: 32px; opacity: 0.85;" />
            <span v-if="msg.isStreaming" style="display: inline-block; width: 8px; height: 16px; background: var(--accent2); margin-left: 2px; animation: typingBounce 1s infinite;" />
            <div style="font-family: var(--font-mono); font-size: 9px; margin-top: 6px; opacity: 0.4; letter-spacing: 0.5px;">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="chat.isLoading && !chat.isStreaming" style="display: flex; justify-content: flex-start;">
          <div class="chat-bubble-ai" style="display: flex; gap: 5px; padding: 14px 16px;">
            <span class="typing-dot" />
            <span class="typing-dot" />
            <span class="typing-dot" />
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div style="
        border-top: var(--border);
        padding: 16px 20px;
        background: var(--bg);
        flex-shrink: 0;
      ">
        <div style="display: flex; align-items: flex-end; gap: 10px; max-width: 860px; margin: 0 auto;">
          <input ref="fileInput" type="file" accept="image/*" style="display: none;" @change="handleFileUpload" />

          <button @click="triggerFileUpload" class="chat-icon-btn" title="Загрузить фото">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          <button @click="isRecording = !isRecording" class="chat-icon-btn" :class="{ active: isRecording }" title="Голосовое сообщение">
            <svg width="14" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            class="m-textarea"
            style="flex: 1; min-height: 40px; max-height: 120px;"
          />

          <button
            @click="sendMessage"
            :disabled="!messageInput.trim() || chat.isLoading"
            :style="{
              width: '40px', height: '40px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'var(--border)',
              background: messageInput.trim() && !chat.isLoading ? 'var(--accent)' : 'var(--bg-alt)',
              color: messageInput.trim() && !chat.isLoading ? 'var(--bg)' : 'var(--fg)',
              cursor: messageInput.trim() && !chat.isLoading ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              fontWeight: '700',
              opacity: messageInput.trim() && !chat.isLoading ? 1 : 0.4,
              transition: 'background 0.15s',
            }"
          >↑</button>
        </div>
      </div>
    </main>

    <!-- MODES MODAL -->
    <Teleport to="body">
      <Transition name="modal-pop">
        <div v-if="showModes" style="
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        " @click.self="showModes = false">
        <div style="
          background: var(--bg);
          border: var(--border);
          box-shadow: var(--shadow-box);
          padding: 32px;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div class="editorial-label" style="color: var(--accent2);">
              <span style="opacity: 0.55;">01</span>
              РЕЖИМ ПОВЕДЕНИЯ
            </div>
            <button @click="showModes = false" style="
              background: transparent; border: var(--border);
              width: 32px; height: 32px;
              cursor: pointer; font-size: 14px; color: var(--fg);
            ">✕</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: var(--border);">
            <div
              v-for="(m, i) in modes" :key="m.id"
              @click="m.premium && !auth.isPremium ? null : setMode(m.id)"
              :class="['mode-card', auth.user?.behavior_mode === m.id ? 'active' : '']"
              :style="{
                borderTop: i >= 2 ? 'var(--border)' : 'none',
                borderLeft: i % 2 ? 'var(--border)' : 'none',
                opacity: m.premium && !auth.isPremium ? 0.5 : 1,
                cursor: m.premium && !auth.isPremium ? 'not-allowed' : 'pointer',
              }"
            >
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; color: var(--meta);">{{ m.sym }}.</span>
                    <span style="font-family: var(--font-display); font-weight: 500; font-size: 18px; color: var(--fg);">{{ m.name }}</span>
                  </div>
                  <p style="font-family: var(--font-display); font-size: 13px; line-height: 1.4; margin-top: 6px; color: var(--fg); opacity: 0.7; font-style: italic;">{{ m.desc }}</p>
                  <div v-if="m.premium" style="margin-top: 6px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--meta); text-transform: uppercase;">✦ Только Premium</div>
                </div>
                <div v-if="auth.user?.behavior_mode === m.id" style="font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--accent); margin-left: 8px;">● АКТИВНО</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </Transition>
    </Teleport>

    <!-- Character Picker Modal -->
    <CharacterPickerModal
      :visible="showCharacterPicker"
      :current-slug="currentCharacter"
      @close="showCharacterPicker = false"
      @select="switchCharacter"
    />

  </div>
</template>

<style scoped>
/* Modal pop animation */
.modal-pop-enter-active { animation: modalIn 0.2s ease-out; }
.modal-pop-leave-active { animation: modalIn 0.15s ease-in reverse; }
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
/* Mobile overlay fade */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.25s; }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }

/* Root layout — dvh for proper mobile browser chrome handling */
.chat-root {
  height: 100vh;
  height: 100dvh;
  display: flex;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  position: relative;
}

/* Input icon buttons */
.chat-icon-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: var(--border);
  background: var(--bg-alt);
  color: var(--fg);
  cursor: pointer;
  transition: background 0.15s;
}
.chat-icon-btn:hover { background: var(--rule); }
.chat-icon-btn.active { background: var(--accent); color: var(--bg); }

/* Message formatting */
:global(.msg-action) {
  color: var(--accent3);
  font-style: italic;
  font-family: var(--font-display);
  display: block;
  margin-bottom: 2px;
}
:global(.msg-thought) {
  opacity: 0.5;
  font-size: 0.88em;
  display: block;
  margin-top: 4px;
  font-style: italic;
}

@media (max-width: 768px) {
  aside { position: fixed !important; }
  .mobile-menu-btn { display: flex !important; }
  div[style*="padding: 24px 32px"] { padding: 16px 16px !important; }
  div[style*="padding: 16px 20px"] { padding: 12px 12px !important; }
}
</style>
