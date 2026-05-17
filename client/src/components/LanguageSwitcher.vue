<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const languages = [
  { code: 'ru', name: 'Русский', available: true },
  { code: 'en', name: 'English', available: false },
  { code: 'ja', name: '日本語', available: false },
  { code: 'zh', name: '中文', available: false },
  { code: 'de', name: 'Deutsch', available: false },
]

function setLocale(code: string) {
  if (!languages.find(l => l.code === code)?.available) return
  locale.value = code
  localStorage.setItem('app-locale', code)
}
</script>

<template>
  <div>
    <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; opacity: 0.7; margin-bottom: 12px;">
      <span style="opacity: 0.55;">04</span>
      ЯЗЫК ИНТЕРФЕЙСА
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
      <button
        v-for="lang in languages"
        :key="lang.code"
        @click="setLocale(lang.code)"
        :title="lang.available ? '' : 'Скоро'"
        :style="{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '1px',
          padding: '6px 14px',
          border: 'var(--border)',
          background: locale === lang.code ? 'var(--accent)' : 'none',
          color: locale === lang.code ? 'var(--bg)' : 'var(--fg)',
          opacity: lang.available ? 1 : 0.35,
          cursor: lang.available ? 'pointer' : 'not-allowed',
          transition: 'background 0.12s',
        }"
      >
        {{ lang.name }}<span v-if="!lang.available" style="opacity: 0.7; font-size: 9px; margin-left: 4px;">soon</span>
      </button>
    </div>
    <div style="margin-top: 8px; font-family: var(--font-mono); font-size: 9px; opacity: 0.45; letter-spacing: 1px;">
      Другие языки появятся позже
    </div>
  </div>
</template>
