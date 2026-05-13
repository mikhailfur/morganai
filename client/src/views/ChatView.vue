<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const auth = useAuthStore()
const chat = useChatStore()

const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isRecording = ref(false)
const sidebarOpen = ref(false)
const showSettings = ref(false)

const currentCharacter = computed(() => auth.user?.selected_character || 'morgan')

onMounted(async () => {
  await chat.fetchCharacters()
  await chat.fetchHistory(currentCharacter.value)
  scrollToBottom()
})

watch(() => chat.messages.length, () => nextTick(scrollToBottom))
watch(() => chat.messages[chat.messages.length - 1]?.content, () => nextTick(scrollToBottom))

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  const text = messageInput.value.trim()
  if (!text || chat.isLoading) return
  messageInput.value = ''
  await chat.sendMessage(text, currentCharacter.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await chat.sendImage(file, '', currentCharacter.value)
  target.value = ''
}

async function clearChat() {
  if (confirm('Очистить историю чата?')) {
    await chat.clearHistory(currentCharacter.value)
  }
}

function formatTime(ts?: number) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatContent(text: string) {
  // Bold *text*
  let out = text.replace(/\*([^*]+)\*/g, '<em class="text-purple-300/70 not-italic">$1</em>')
  // Thoughts (text)
  out = out.replace(/\(([^)]+)\)/g, '<span class="text-slate-500 text-xs block mt-1">($1)</span>')
  // Newlines
  out = out.replace(/\n/g, '<br>')
  return out
}

const modes = [
  { id: 'default', icon: '💬', name: 'Обычный' },
  { id: 'study', icon: '📚', name: 'Учёба' },
  { id: 'work', icon: '💼', name: 'Работа' },
  { id: 'psychologist', icon: '🧠', name: 'Психолог' },
  { id: 'nsfw', icon: '🔥', name: 'NSFW', premium: true },
]

async function setMode(mode: string) {
  await auth.updateSettings({ behavior_mode: mode })
  showSettings.value = false
}
</script>

<template>
  <div class="h-screen flex bg-[var(--color-bg-dark)] relative overflow-hidden">
    <!-- Ambient Glow -->
    <div class="fixed top-[-30%] left-[-15%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none" />
    <div class="fixed bottom-[-30%] right-[-15%] w-[400px] h-[400px] rounded-full bg-pink-500/5 blur-[100px] pointer-events-none" />

    <!-- Mobile Sidebar Overlay -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/60 z-40 md:hidden" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside :class="[
      'fixed md:relative z-50 h-full w-72 flex flex-col border-r border-white/5 bg-[var(--color-bg-dark)]/95 backdrop-blur-xl transition-transform duration-300',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    ]">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm">M</div>
        <span class="font-bold text-lg gradient-text">Morgan AI</span>
      </div>

      <!-- User Info -->
      <div class="px-5 py-4 border-b border-white/5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {{ auth.user?.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ auth.user?.username }}</p>
            <p class="text-xs text-slate-500">{{ auth.isPremium ? '⭐ Premium' : 'Free' }}</p>
          </div>
        </div>
      </div>

      <!-- Characters List -->
      <div class="flex-1 overflow-y-auto px-3 py-4">
        <p class="px-2 text-xs text-slate-500 uppercase tracking-wider mb-3">Персонажи</p>
        <button
          v-for="c in chat.characters" :key="c.slug"
          @click="auth.updateSettings({ selected_character: c.slug }); chat.fetchHistory(c.slug); sidebarOpen = false"
          :class="[
            'w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left',
            currentCharacter === c.slug
              ? 'bg-purple-500/15 border border-purple-500/30'
              : 'hover:bg-white/5 border border-transparent'
          ]"
        >
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-sm">🎭</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ c.name }}</p>
            <p class="text-xs text-slate-500 truncate">{{ c.description }}</p>
          </div>
          <span v-if="c.is_premium" class="text-xs text-yellow-400">⭐</span>
        </button>
      </div>

      <!-- Bottom Actions -->
      <div class="px-3 py-4 border-t border-white/5 flex flex-col gap-2">
        <button @click="showSettings = true; sidebarOpen = false" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-slate-300 transition-all">
          ⚙️ <span>Настройки</span>
        </button>
        <button @click="clearChat" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-slate-300 transition-all">
          🗑️ <span>Очистить чат</span>
        </button>
        <router-link v-if="auth.isAdmin" to="/admin" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-slate-300 transition-all">
          🔐 <span>Админка</span>
        </router-link>
        <button @click="auth.logout(); router.push('/')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-sm text-red-400 transition-all">
          🚪 <span>Выйти</span>
        </button>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col min-w-0 relative">
      <!-- Top Bar -->
      <header class="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[var(--color-bg-dark)]/80 backdrop-blur-md z-10">
        <button @click="sidebarOpen = !sidebarOpen" class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-400">☰</button>
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">🎭</div>
        <div>
          <p class="text-sm font-semibold">{{ chat.characters.find(c => c.slug === currentCharacter)?.name || 'Морган' }}</p>
          <p class="text-xs text-green-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-green-400" /> онлайн</p>
        </div>
        <div class="flex-1" />
        <button @click="showSettings = true" class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 text-slate-400 transition-colors">⚙️</button>
      </header>

      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-4">
        <!-- Empty State -->
        <div v-if="chat.messages.length === 0 && !chat.isLoading" class="flex-1 flex items-center justify-center">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">🎭</div>
            <h2 class="text-xl font-semibold mb-2">Начни разговор</h2>
            <p class="text-slate-400 text-sm">Напиши что-нибудь, и персонаж ответит тебе</p>
          </div>
        </div>

        <!-- Messages -->
        <div v-for="msg in chat.messages" :key="msg.timestamp" :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']">
          <div :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'" style="max-width: min(80%, 600px);">
            <p v-if="msg.role === 'assistant'" class="text-xs text-purple-400 font-medium mb-1">{{ chat.characters.find(c => c.slug === currentCharacter)?.name || 'Морган' }}</p>
            <div v-html="formatContent(msg.content)" class="text-sm leading-relaxed whitespace-pre-wrap" />
            <!-- Voice Player -->
            <audio v-if="msg.voiceUrl || msg.has_voice" :src="msg.voiceUrl" controls class="mt-2 w-full h-8 opacity-80" />
            <!-- Streaming cursor -->
            <span v-if="msg.isStreaming" class="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
            <p class="text-[10px] mt-1.5 opacity-40">{{ formatTime(msg.timestamp) }}</p>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="chat.isLoading && !chat.isStreaming" class="flex justify-start">
          <div class="chat-bubble-ai">
            <div class="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="border-t border-white/5 px-4 md:px-8 py-4 bg-[var(--color-bg-dark)]/80 backdrop-blur-md">
        <div class="flex items-end gap-3 max-w-4xl mx-auto">
          <!-- Image Upload -->
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          <button @click="triggerFileUpload" class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-surface)] hover:bg-purple-500/20 border border-white/5 text-slate-400 hover:text-purple-300 transition-all" title="Загрузить фото">
            📷
          </button>

          <!-- Voice Record -->
          <button
            @click="isRecording = !isRecording"
            :class="[
              'w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all',
              isRecording ? 'bg-red-500/20 border-red-500/40 text-red-400 pulse-ring' : 'bg-[var(--color-surface)] border-white/5 text-slate-400 hover:bg-purple-500/20 hover:text-purple-300'
            ]"
            title="Голосовое сообщение"
          >
            🎤
          </button>

          <!-- Text Input -->
          <div class="flex-1 relative">
            <textarea
              v-model="messageInput"
              @keydown="handleKeydown"
              placeholder="Напиши сообщение..."
              rows="1"
              class="input-field resize-none pr-12 min-h-[44px] max-h-[120px]"
              :disabled="chat.isLoading"
            />
          </div>

          <!-- Send Button -->
          <button
            @click="sendMessage"
            :disabled="!messageInput.trim() || chat.isLoading"
            :class="[
              'w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all font-bold text-white',
              messageInput.trim() && !chat.isLoading
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-[var(--shadow-glow-accent)] hover:-translate-y-0.5'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            ]"
          >
            ↑
          </button>
        </div>
      </div>
    </main>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center px-4" @click.self="showSettings = false">
        <div class="glass-card w-full max-w-lg p-6 animate-fade-in">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold">⚙️ Настройки</h2>
            <button @click="showSettings = false" class="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400">✕</button>
          </div>

          <div class="mb-6">
            <p class="text-sm text-slate-400 mb-3">Режим поведения</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="m in modes" :key="m.id"
                @click="setMode(m.id)"
                :class="[
                  'mode-card flex items-center gap-3',
                  auth.user?.behavior_mode === m.id ? 'active' : '',
                  m.premium && !auth.isPremium ? 'opacity-50 cursor-not-allowed' : ''
                ]"
                :disabled="m.premium && !auth.isPremium"
              >
                <span class="text-2xl">{{ m.icon }}</span>
                <div>
                  <p class="text-sm font-medium">{{ m.name }}</p>
                  <p v-if="m.premium" class="text-[10px] text-yellow-400">Premium</p>
                </div>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl bg-[var(--color-surface)]">
            <div>
              <p class="text-sm font-medium">Статус</p>
              <p class="text-xs text-slate-400">{{ auth.isPremium ? '⭐ Premium активен' : 'Бесплатная версия' }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
