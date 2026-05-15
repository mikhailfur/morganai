<script setup lang="ts">
import { ref } from 'vue'

const CONSENT_KEY = 'morgan_cookie_consent'
const visible = ref(!localStorage.getItem(CONSENT_KEY))

function accept() {
  localStorage.setItem(CONSENT_KEY, '1')
  visible.value = false
}
</script>

<template>
  <Transition name="cookie-fade">
    <div v-if="visible" class="cookie-banner">
      <p class="cookie-text">
        Мы используем <strong>httpOnly cookie</strong> для авторизации — они защищены от JS и хранятся 7 дней.
        Продолжая использование сайта, вы соглашаетесь.
      </p>
      <button class="btn-primary btn-sm" @click="accept">Принять</button>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  background: var(--bg-alt);
  border: var(--border);
  box-shadow: var(--shadow-box);
  max-width: min(600px, calc(100vw - 32px));
  width: 100%;
  border-radius: 2px;
}
.cookie-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-dim);
  flex: 1;
}
.cookie-text strong { color: var(--fg); }

.cookie-fade-enter-active,
.cookie-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.cookie-fade-enter-from,
.cookie-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
