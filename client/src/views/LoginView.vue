<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const error = ref('')
const googleBtnRef = ref<HTMLDivElement | null>(null)

async function handleLogin() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/chat')
  } catch (e: any) {
    error.value = e.message
  }
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
        try {
          await auth.loginWithGoogle(credential)
          router.push('/chat')
        } catch (e: any) { error.value = e.message }
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
        try {
          await auth.loginWithTelegram(user)
          router.push('/chat')
        } catch (e: any) { error.value = e.message }
      }
    )
  } catch { error.value = 'Ошибка Telegram авторизации' }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card animate-fade-in">

      <!-- Logo -->
      <router-link to="/" class="auth-logo">
        <div class="auth-logo-box">M</div>
        <span class="auth-logo-text">Morgan AI</span>
      </router-link>

      <h1 class="auth-heading">С возвращением</h1>
      <p class="auth-sub">Она помнит, на чём вы остановились.</p>

      <!-- OAuth -->
      <div class="oauth-grid">
        <div class="oauth-btn-wrap" style="position: relative; overflow: hidden; min-height: 40px;">
          <button class="btn-ghost btn-sm oauth-btn" style="pointer-events: none; width: 100%;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <div ref="googleBtnRef" style="position: absolute; inset: 0; overflow: hidden; opacity: 0.01;"></div>
        </div>
        <button @click="handleTelegramOAuth" class="btn-ghost btn-sm oauth-btn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#a78bfa">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.7l-2.94-.916c-.64-.203-.654-.64.135-.949l11.566-4.461c.537-.194 1.006.131.963.847z"/>
          </svg>
          Telegram
        </button>
      </div>

      <!-- Divider -->
      <div class="auth-divider">
        <div class="auth-divider-line"></div>
        <span class="auth-divider-text">или через email</span>
        <div class="auth-divider-line"></div>
      </div>

      <!-- Error -->
      <div v-if="error" class="auth-error">{{ error }}</div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="field">
          <label class="field-label">Email</label>
          <input v-model="email" type="email" placeholder="you@morgan.ai" class="m-input" required />
        </div>
        <div class="field">
          <label class="field-label">Пароль</label>
          <div class="password-wrap">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" class="m-input" required />
            <button type="button" @click="showPassword = !showPassword" class="eye-btn" tabindex="-1">
              <svg v-if="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="remember" class="checkbox-input" />
            <span>Запомнить меня</span>
          </label>
          <span class="forgot-link">Забыли пароль?</span>
        </div>

        <button type="submit" class="btn-primary" style="width: 100%; padding: 12px;" :disabled="auth.loading">
          {{ auth.loading ? 'Входим...' : 'Войти' }}
        </button>
      </form>

      <p class="auth-footer-text">
        Впервые здесь?
        <router-link to="/register" class="auth-link">Создать аккаунт</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  z-index: 1;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 36px 32px;
  box-shadow: 0 0 32px -8px rgb(124 58 237 / 0.25);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  margin-bottom: 28px;
}
.auth-logo-box {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 18px;
  color: #fff;
  box-shadow: 0 0 16px -4px rgb(124 58 237 / 0.5);
}
.auth-logo-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 18px;
  color: var(--fg);
}
.auth-heading {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 24px;
  letter-spacing: -0.02em;
  color: var(--fg);
}
.auth-sub {
  font-size: 14px;
  color: var(--fg-muted);
  margin-top: 6px;
  margin-bottom: 24px;
}
.oauth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.oauth-btn {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0;
}
.auth-divider-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.auth-divider-text {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  white-space: nowrap;
}
.auth-error {
  background: rgb(239 68 68 / 0.1);
  border: 1px solid rgb(239 68 68 / 0.3);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  color: #fca5a5;
  margin-bottom: 16px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-muted);
  font-weight: 600;
}
.password-wrap { position: relative; }
.password-wrap .m-input { padding-right: 42px; }
.eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fg-subtle);
  display: flex;
  align-items: center;
  transition: color 0.2s;
}
.eye-btn:hover { color: var(--fg-muted); }
.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--fg-muted);
  cursor: pointer;
}
.checkbox-input { accent-color: var(--accent); }
.forgot-link {
  font-size: 13px;
  color: var(--accent-soft);
  cursor: pointer;
}
.auth-footer-text {
  margin-top: 20px;
  font-size: 13px;
  color: var(--fg-muted);
  text-align: center;
}
.auth-link {
  color: var(--accent-soft);
  text-decoration: none;
  font-weight: 500;
}
.auth-link:hover { text-decoration: underline; }
</style>
