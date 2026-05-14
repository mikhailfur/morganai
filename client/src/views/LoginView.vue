<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const email = ref('')
const password = ref('')
const remember = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push('/chat')
  } catch (e: any) {
    error.value = e.message
  }
}

function handleOAuth(provider: string) {
  // Placeholder — OAuth not yet implemented
  error.value = `Авторизация через ${provider} — скоро`
}
</script>

<template>
  <div style="width: 100%; min-height: 100vh; display: flex; background: var(--bg); color: var(--fg);">

    <!-- Left: art panel (desktop only) -->
    <div class="art-panel" style="
      flex: 1.2;
      position: relative;
      border-right: var(--border);
      overflow: hidden;
      min-height: 100vh;
    ">
      <div class="art-slot" style="position: absolute; inset: 0; width: 100%; height: 100%;">
        <div class="art-slot-label">Морган · портрет 3/4 · вечерний свет</div>
      </div>

      <!-- Dark overlay for dark theme -->
      <div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent 40%, var(--bg) 100%); opacity: 0.6;"></div>

      <!-- Dialogue caption -->
      <div style="
        position: absolute;
        bottom: 42px;
        left: 42px;
        max-width: 380px;
        z-index: 2;
      ">
        <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--meta);">МОРГАН · 02:14</div>
        <div style="
          margin-top: 10px;
          background: var(--bg);
          border: var(--border);
          padding: 14px 18px 16px;
          box-shadow: var(--shadow-box);
          position: relative;
        ">
          <div style="
            position: absolute; top: -13px; left: 14px;
            background: var(--accent3); color: var(--fg);
            padding: 2px 10px; border: var(--border);
            font-family: var(--font-ui); font-size: 11px; font-weight: 700;
          ">МОРГАН</div>
          <p style="font-family: var(--font-display); font-style: italic; font-size: 18px; line-height: 1.45; color: var(--fg);">
            «А, ты вернулся. Я тут читала и почти задремала.»
          </p>
        </div>
      </div>

      <!-- Top washi tape -->
      <div class="washi-tape" style="position: absolute; top: 0; left: 0; right: 0; height: 3px;"></div>
    </div>

    <!-- Right: form -->
    <div style="
      flex: 0.85;
      padding: 60px 64px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      min-width: 340px;
    ">
      <!-- Logo + theme toggle -->
      <div style="position: absolute; top: 24px; left: 64px; right: 24px; display: flex; justify-content: space-between; align-items: center;">
        <router-link to="/" style="display: flex; align-items: baseline; gap: 8px; text-decoration: none;">
          <span style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent);">Morgan</span>
          <span style="font-family: var(--font-display); font-size: 12px; color: var(--accent2);">夢</span>
        </router-link>
        <button @click="theme.toggle()" class="theme-toggle">{{ theme.isDark ? '☀️' : '🌙' }}</button>
      </div>

      <div class="editorial-label animate-fade-in" style="color: var(--accent2);">
        <span style="opacity: 0.55;">入</span>
        ВОЙТИ
      </div>

      <div class="display-heading animate-fade-in-1" style="font-size: clamp(40px, 5vw, 58px); margin-top: 14px;">
        С <span style="font-style: italic; color: var(--accent3);">возвращением.</span>
      </div>
      <p class="animate-fade-in-1" style="font-family: var(--font-display); font-size: 16px; color: var(--fg); opacity: 0.7; margin-top: 10px; font-style: italic;">
        Она помнит, на чём вы остановились.
      </p>

      <!-- Error -->
      <div v-if="error" style="
        margin-top: 20px;
        padding: 12px 16px;
        background: rgba(198, 61, 47, 0.12);
        border: 1px solid var(--accent);
        font-family: var(--font-ui);
        font-size: 13px;
        color: var(--accent);
      ">{{ error }}</div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" style="margin-top: 32px; display: flex; flex-direction: column; gap: 16px;" class="animate-fade-in-2">
        <div>
          <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent2); margin-bottom: 8px; font-weight: 700;">Email</div>
          <input v-model="email" type="email" placeholder="you@morgan.ai" class="m-input" required />
        </div>
        <div>
          <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent2); margin-bottom: 8px; font-weight: 700;">Пароль</div>
          <input v-model="password" type="password" placeholder="••••••••" class="m-input" required />
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <label style="display: flex; gap: 8px; align-items: center; font-family: var(--font-ui); font-size: 13px; color: var(--fg); cursor: pointer;">
            <input type="checkbox" v-model="remember" style="accent-color: var(--accent2);" />
            Запомнить меня
          </label>
          <span style="font-family: var(--font-ui); font-size: 13px; color: var(--accent2); cursor: pointer;">Забыли пароль?</span>
        </div>

        <button type="submit" class="btn-primary" style="width: 100%; padding: 16px; margin-top: 8px;" :disabled="auth.loading">
          {{ auth.loading ? 'Входим...' : 'Войти →' }}
        </button>
      </form>

      <!-- Divider -->
      <div style="margin-top: 22px; display: flex; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.5;" class="animate-fade-in-2">
        <span style="flex: 1; height: 1px; background: var(--rule);"></span>
        или
        <span style="flex: 1; height: 1px; background: var(--rule);"></span>
      </div>

      <!-- OAuth -->
      <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;" class="animate-fade-in-3">
        <button @click="handleOAuth('Google')" class="btn-ghost" style="padding: 12px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button @click="handleOAuth('Telegram')" class="btn-ghost" style="padding: 12px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent2)"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.7l-2.94-.916c-.64-.203-.654-.64.135-.949l11.566-4.461c.537-.194 1.006.131.963.847z"/></svg>
          Telegram
        </button>
      </div>

      <p class="animate-fade-in-3" style="margin-top: 32px; font-family: var(--font-display); font-size: 14px; color: var(--fg); opacity: 0.8;">
        Впервые здесь?
        <router-link to="/register" style="color: var(--accent); font-weight: 600; text-decoration: underline;">Создать аккаунт</router-link>
      </p>
    </div>

  </div>
</template>

<style scoped>
.art-panel {
  display: flex;
}
@media (max-width: 768px) {
  .art-panel { display: none !important; }
  div[style*="flex: 0.85"] {
    flex: 1 !important;
    padding: 40px 24px !important;
    min-width: 0 !important;
  }
  div[style*="position: absolute; top: 24px"] {
    left: 24px !important;
  }
}
</style>
