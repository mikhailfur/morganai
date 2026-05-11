<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-claude-bg text-claude-text p-4">
    <div class="max-w-md text-center">
      <div class="text-6xl mb-4">🚫</div>
      <h1 class="text-2xl font-bold mb-2">Доступ ограничен</h1>
      <p class="text-claude-subtext mb-6">
        Этот WebApp предназначен только для использования внутри Telegram.
        Пожалуйста, откройте приложение через меню бота.
      </p>
      <button 
        @click="closeApp"
        class="px-6 py-2 bg-claude-accent text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Закрыть
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * ForbiddenView.vue — Страница ошибки доступа.
 * Показывается, если приложение открыто вне Telegram.
 */
function closeApp() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close()
  } else {
    window.history.back()
  }
}
</script>
