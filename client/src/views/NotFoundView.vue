<script setup lang="ts">
</script>

<template>
  <div class="nf-root">
    <div class="nf-card">
      <!-- Code -->
      <div class="nf-code">404</div>

      <!-- Avatar -->
      <div class="nf-avatar">
        <span>M</span>
      </div>

      <!-- Text -->
      <h1 class="nf-title">Страница не найдена</h1>
      <p class="nf-sub">
        «Хм. Кажется, ты зашёл не туда.<br>
        Или я переехала, пока тебя не было.»
      </p>

      <!-- Actions -->
      <div class="nf-actions">
        <router-link to="/" class="btn-primary" style="text-decoration: none; padding: 11px 24px;">
          ← На главную
        </router-link>
        <router-link to="/chat" class="btn-ghost" style="text-decoration: none; padding: 11px 24px;">
          В чат
        </router-link>
      </div>

      <div class="nf-meta">Morgan AI · страница не существует</div>
    </div>
  </div>
</template>

<style scoped>
.nf-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
}
.nf-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 56px 64px;
  max-width: 520px;
  width: 100%;
  text-align: center;
  box-shadow: 0 0 48px -8px rgb(124 58 237 / 0.3);
}
.nf-code {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: clamp(72px, 16vw, 120px);
  letter-spacing: -0.05em;
  line-height: 1;
  color: var(--accent);
  opacity: 0.12;
  margin-bottom: -16px;
}
.nf-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 28px;
  color: #fff;
  margin: 0 auto 20px;
  box-shadow: 0 0 24px -4px rgb(124 58 237 / 0.5);
}
.nf-title {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: var(--fg);
  margin: 0 0 12px;
}
.nf-sub {
  font-size: 15px;
  line-height: 1.6;
  color: var(--fg-muted);
  font-style: italic;
  margin: 0 0 32px;
}
.nf-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.nf-meta {
  margin-top: 28px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
</style>
