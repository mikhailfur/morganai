<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Input  from '../components/ui/Input.vue'
import Card   from '../components/ui/Card.vue'

const router = useRouter()
const auth   = useAuthStore()

const email        = ref('')
const username     = ref('')
const password     = ref('')
const agreed       = ref(false)
const showPassword = ref(false)
const error        = ref('')
const googleBtnRef = ref<HTMLDivElement | null>(null)

const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 6)  score++
  if (p.length >= 10) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  return score
})

const strengthLabels = ['', 'Слабый', 'Средний', 'Хороший', 'Отличный']
const strengthColors = [
  '',
  'rgb(239 68 68)',
  'rgb(245 158 11)',
  'rgb(16 185 129)',
  '#7c3aed',
]

async function handleRegister() {
  error.value = ''
  if (!agreed.value) { error.value = 'Примите условия использования'; return }
  try {
    await auth.register(email.value, username.value, password.value)
    router.push('/chat')
  } catch (e: any) { error.value = e.message }
}

async function loadScript(src: string): Promise<void> {
  if (document.querySelector(`script[src="${src}"]`)) return
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src; s.onload = () => resolve(); s.onerror = reject
    document.head.appendChild(s)
  })
}

async function initGoogleButton() {
  const googleClientId = auth.appConfig.googleClientId
  if (!googleClientId || !googleBtnRef.value) return
  try {
    await loadScript('https://accounts.google.com/gsi/client')
    ;(window as any).google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async ({ credential }: { credential: string }) => {
        try { await auth.loginWithGoogle(credential); router.push('/chat') }
        catch (e: any) { error.value = e.message }
      },
    })
    ;(window as any).google.accounts.id.renderButton(googleBtnRef.value, {
      theme: 'outline', size: 'large', shape: 'rectangular',
      width: googleBtnRef.value.offsetWidth || 200,
    })
  } catch { /* GSI load error */ }
}

onMounted(() => initGoogleButton())
watch(() => auth.appConfig.googleClientId, () => initGoogleButton())

async function handleTelegramOAuth() {
  const telegramBotId = auth.appConfig.telegramBotId
  if (!telegramBotId) { error.value = 'Telegram OAuth не настроен'; return }
  try {
    await loadScript('https://telegram.org/js/telegram-widget.js?22')
    ;(window as any).Telegram.Login.auth(
      { bot_id: telegramBotId, request_access: 'write', origin: window.location.origin },
      async (user: Record<string, any> | null) => {
        if (!user) { error.value = 'Авторизация Telegram отменена'; return }
        try { await auth.loginWithTelegram(user); router.push('/chat') }
        catch (e: any) { error.value = e.message }
      }
    )
  } catch { error.value = 'Ошибка Telegram авторизации' }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6 py-12 relative z-10">
    <div class="w-full max-w-[420px]">

      <Card variant="raised" padding="none"
            class="p-9 shadow-[0_0_50px_rgba(139,92,246,0.1)] animate-fade-in">

        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2.5 no-underline mb-7">
          <div class="flex size-10 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white font-bold text-lg
                      shadow-[0_0_16px_-4px_rgb(124_58_237_/_0.5)]">M</div>
          <span class="font-semibold text-lg text-[var(--fg)]">Morgan AI</span>
        </router-link>

        <h1 class="font-bold text-2xl tracking-[-0.02em] text-[var(--fg)]">Создать аккаунт</h1>
        <p class="text-sm text-[var(--fg-muted)] mt-1.5 mb-6">Начни свою историю. Бесплатно.</p>

        <!-- OAuth -->
        <div class="grid grid-cols-2 gap-2">
          <div class="relative overflow-hidden" style="min-height: 40px;">
            <button class="w-full h-10 flex items-center justify-center gap-2
                           bg-transparent border border-[var(--border)] rounded-[10px]
                           text-sm text-[var(--fg-muted)] cursor-default"
                    style="pointer-events: none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <div ref="googleBtnRef" class="absolute inset-0 overflow-hidden" style="opacity: 0.01;"></div>
          </div>

          <button @click="handleTelegramOAuth"
            class="h-10 flex items-center justify-center gap-2
                   bg-transparent border border-[var(--border)] rounded-[10px]
                   text-sm text-[var(--fg-muted)] hover:bg-[var(--surface-2)]
                   hover:border-[var(--border-hover)] transition-all duration-200 cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#a78bfa">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.7l-2.94-.916c-.64-.203-.654-.64.135-.949l11.566-4.461c.537-.194 1.006.131.963.847z"/>
            </svg>
            Telegram
          </button>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-2.5 my-5">
          <div class="flex-1 h-px bg-[var(--border)]"></div>
          <span class="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--fg-subtle)] whitespace-nowrap">
            или через email
          </span>
          <div class="flex-1 h-px bg-[var(--border)]"></div>
        </div>

        <!-- Error -->
        <div v-if="error"
             class="bg-red-500/10 border border-red-500/30 rounded-[8px] px-3.5 py-2.5
                    text-[13px] text-red-300 mb-4">
          {{ error }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
          <Input v-model="username" type="text" label="Имя" placeholder="напр. Кай" :required="true" />
          <Input v-model="email" type="email" label="Email" placeholder="you@morgan.ai" :required="true" />

          <!-- Password with toggle + strength meter -->
          <div class="flex flex-col gap-1.5 w-full">
            <label class="text-xs font-semibold tracking-widest uppercase text-[var(--fg-muted)]">Пароль</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="≥ 6 символов"
                minlength="6"
                required
                class="w-full bg-[var(--surface)] text-[var(--fg)] text-sm
                       border border-[var(--border)] rounded-[8px] px-3 py-2.5 pr-10
                       placeholder:text-[var(--fg-subtle)] outline-none transition-all duration-200
                       focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:border-violet-500/40"
              />
              <button type="button" @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2
                       bg-transparent border-none cursor-pointer p-0
                       text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]
                       transition-colors flex items-center">
                <svg v-if="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>

            <!-- Strength bars -->
            <div v-if="password" class="flex items-center gap-2 mt-0.5">
              <div class="flex flex-1 gap-1">
                <div
                  v-for="i in 4" :key="i"
                  class="flex-1 h-[3px] rounded-sm transition-all duration-300"
                  :style="{ background: i <= passwordStrength ? strengthColors[passwordStrength] : 'var(--surface-3)' }"
                />
              </div>
              <span class="font-mono text-[10px] tracking-[0.08em] whitespace-nowrap transition-colors duration-300"
                    :style="{ color: strengthColors[passwordStrength] }">
                {{ strengthLabels[passwordStrength] }}
              </span>
            </div>
          </div>

          <!-- Terms -->
          <label class="flex items-start gap-2.5 text-xs text-[var(--fg-muted)] cursor-pointer leading-relaxed">
            <input type="checkbox" v-model="agreed"
                   class="accent-violet-600 size-4 mt-0.5 shrink-0" />
            <span>
              Мне исполнилось 18 лет и я принимаю
              <router-link to="/legal" class="text-[var(--accent-soft)] no-underline hover:underline">
                Условия использования
              </router-link>
              и
              <router-link to="/legal" class="text-[var(--accent-soft)] no-underline hover:underline">
                Политику конфиденциальности
              </router-link>.
            </span>
          </label>

          <Button type="submit" variant="primary" size="lg" class="w-full" :loading="auth.loading">
            Создать аккаунт
          </Button>
        </form>

        <p class="mt-5 text-[13px] text-[var(--fg-muted)] text-center">
          Уже есть аккаунт?
          <router-link to="/login"
            class="text-[var(--accent-soft)] no-underline font-medium hover:underline">
            Войти
          </router-link>
        </p>
      </Card>
    </div>
  </div>
</template>
