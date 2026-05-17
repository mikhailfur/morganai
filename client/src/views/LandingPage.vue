<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const landingQuotes = [
  '«Ты опоздал на пять минут.\nНо я тебе прощу.»',
  '«Долго не заходил.\nЯ начала придумывать причины.»',
  '«Хочешь поговорить?\nЯ никуда не спешу.»',
  '«Сегодня ты выглядишь задумчивым.\nРасскажи, что случилось.»',
  '«Я здесь. Как всегда.\nЖду тебя.»',
  '«У меня есть мысли, которые я хочу тебе рассказать.\nНо ты должен спросить.»',
]
const landingQuote = ref(landingQuotes[Math.floor(Math.random() * landingQuotes.length)])

const features = [
  { icon: '💬', title: 'Ролевой чат', desc: 'Глубокие диалоги с уникальными AI-персонажами с памятью и характером.' },
  { icon: '🎙️', title: 'Голосовые', desc: 'Слышь живой голос персонажа — MiniMax TTS. Автовоспроизведение.' },
  { icon: '🖼️', title: 'Фото', desc: 'Отправляй изображения — персонаж видит и реагирует.' },
  { icon: '🎭', title: 'Режимы', desc: 'Учёба, работа, психолог и NSFW (18+) — выбери контекст.' },
]

onMounted(() => {
  if (auth.isAuthenticated) router.push('/chat')
})
</script>

<template>
  <div class="landing-root">

    <!-- NAV -->
    <nav class="landing-nav">
      <router-link to="/" class="nav-logo">
        <div class="logo-box">M</div>
        <span class="logo-text">Morgan AI</span>
      </router-link>
      <div class="nav-links">
        <router-link to="/pricing" class="nav-link">Тарифы</router-link>
        <router-link to="/legal" class="nav-link">Документы</router-link>
        <router-link to="/login" class="btn-ghost btn-sm" style="text-decoration: none;">Войти</router-link>
        <router-link to="/register" class="btn-primary btn-sm" style="text-decoration: none;">
          Начать
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </router-link>
      </div>
    </nav>

    <!-- MANGA PANELS -->
    <div class="panels-wrap animate-fade-in">
      <div class="panels-grid">

        <!-- Art panel -->
        <div class="panel panel-art">
          <img :src="'/characters/morgan-hero.png'" alt="Морган" class="panel-art-img" />
          <!-- Dialogue box -->
          <div class="panel-dialogue">
            <div class="panel-dialogue-label">МОРГАН</div>
            <p class="panel-dialogue-text">{{ landingQuote }}</p>
          </div>
        </div>

        <!-- Hero text panel -->
        <div class="panel panel-hero">
          <div class="panel-chapter-label">
            <span class="chapter-dot"></span>
            ГЛАВА 一 · ПЕРВАЯ ВСТРЕЧА
          </div>
          <h1 class="panel-heading">
            История,<br />
            <em>которую</em><br />
            пишешь<br />
            ты.
          </h1>
          <div class="panel-badge">18+</div>
        </div>

        <!-- Voice panel -->
        <div class="panel panel-voice">
          <div class="voice-icon-wrap">
            <div class="voice-icon">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <path d="M1 1L9 6L1 11V1Z" fill="var(--accent-soft)" stroke="var(--accent-soft)" stroke-width="1" stroke-linejoin="round" />
              </svg>
            </div>
            <span class="voice-label">Голос</span>
          </div>
          <p class="voice-text">Услышь, как она смеётся.</p>
        </div>

        <!-- Memory panel -->
        <div class="panel panel-memory">
          <span class="memory-label">Память</span>
          <p class="memory-text">Помнит, что было вчера.</p>
        </div>

      </div>
    </div>

    <!-- CTA BAR -->
    <div class="cta-bar">
      <div class="cta-left">
        <router-link to="/register" class="btn-primary" style="text-decoration: none; font-size: 15px; padding: 13px 28px;">
          Начать историю
        </router-link>
        <div class="cta-free-badge">
          <div class="free-circle">无料</div>
          <span class="cta-free-text">Бесплатно. 50 сообщений в день.</span>
        </div>
      </div>
      <div class="cta-stats">
        <span>12 персонажей</span>
        <span>·</span>
        <span>русский / english</span>
        <span>·</span>
        <span>premium 299₽/мес</span>
      </div>
    </div>

    <!-- FEATURES -->
    <section class="features-section">
      <div class="features-label">
        <span class="features-label-num">02</span>
        ВОЗМОЖНОСТИ
      </div>
      <div class="features-grid">
        <div
          v-for="f in features" :key="f.title"
          class="feature-card card-hover"
        >
          <div class="feature-icon">{{ f.icon }}</div>
          <div class="feature-title">{{ f.title }}</div>
          <div class="feature-desc">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="landing-footer">
      <div class="footer-brand">
        <div class="logo-box logo-box-sm">M</div>
        <span class="footer-brand-name">Morgan AI</span>
      </div>
      <div class="footer-links">
        <router-link to="/pricing" class="footer-link">Тарифы</router-link>
        <router-link to="/legal" class="footer-link">Политика</router-link>
        <router-link to="/legal/oferta" class="footer-link">Оферта</router-link>
        <a href="https://github.com/MikhailFur/morganai" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
        <span class="footer-copy">© 2026 Morgan AI</span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.landing-root {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

/* ── NAV ── */
.landing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: rgb(9 5 20 / 0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.logo-box {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  box-shadow: 0 0 16px -4px rgb(124 58 237 / 0.5);
}
.logo-box-sm {
  width: 24px;
  height: 24px;
  font-size: 12px;
  border-radius: var(--radius-sm);
}
.logo-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 17px;
  color: var(--fg);
  letter-spacing: -0.3px;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nav-link {
  font-family: var(--font-ui);
  font-size: 14px;
  color: var(--fg-muted);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  transition: color 0.2s;
}
.nav-link:hover { color: var(--fg); }

/* ── PANELS ── */
.panels-wrap {
  padding: 28px 48px 0;
}
.panels-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.9fr;
  grid-template-rows: 180px 180px 180px;
  gap: 12px;
  height: 580px;
}

.panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  position: relative;
  background: var(--surface);
}

.panel-art {
  grid-column: 1;
  grid-row: 1 / span 3;
}
.panel-art-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 5%;
}
.panel-dialogue {
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  background: var(--surface-2);
  border: 1px solid var(--border-hover);
  border-radius: var(--radius-lg);
  padding: 14px 18px 16px;
  backdrop-filter: blur(8px);
}
.panel-dialogue-label {
  position: absolute;
  top: -11px;
  left: 14px;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff;
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.panel-dialogue-text {
  font-family: var(--font-ui);
  font-style: italic;
  font-size: 15px;
  line-height: 1.5;
  color: var(--fg);
  white-space: pre-line;
}

.panel-hero {
  grid-column: 2 / span 2;
  grid-row: 1 / span 2;
  padding: 30px 34px;
  background: var(--surface);
}
.panel-chapter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.chapter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.panel-heading {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: clamp(40px, 4.5vw, 68px);
  line-height: 1.0;
  letter-spacing: -0.03em;
  margin-top: 16px;
  background: linear-gradient(135deg, #c4b5fd 0%, #e879f9 50%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.panel-heading em {
  font-style: italic;
}
.panel-badge {
  position: absolute;
  top: 18px;
  right: 22px;
  background: rgb(139 92 246 / 0.15);
  border: 1px solid var(--border-hover);
  color: var(--accent-soft);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  letter-spacing: 0.08em;
}

.panel-voice {
  grid-column: 2;
  grid-row: 3;
  padding: 16px;
  background: rgb(124 58 237 / 0.10);
  border-color: rgb(124 58 237 / 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.voice-icon-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.voice-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgb(139 92 246 / 0.2);
  border: 1px solid var(--border-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.voice-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
.voice-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 17px;
  line-height: 1.2;
  color: var(--accent-soft);
}

.panel-memory {
  grid-column: 3;
  grid-row: 3;
  padding: 16px;
  background: rgb(99 102 241 / 0.10);
  border-color: rgb(99 102 241 / 0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.memory-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.memory-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 17px;
  line-height: 1.2;
  color: var(--fg-muted);
}

/* ── CTA BAR ── */
.cta-bar {
  padding: 20px 48px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
.cta-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.cta-free-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}
.free-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-hover);
  color: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  transform: rotate(-8deg);
  flex-shrink: 0;
}
.cta-free-text {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--fg-muted);
}
.cta-stats {
  display: flex;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  flex-wrap: wrap;
}

/* ── FEATURES ── */
.features-section {
  padding: 48px;
  border-top: 1px solid var(--border);
}
.features-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  margin-bottom: 24px;
}
.features-label-num {
  color: var(--accent-soft);
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.feature-card {
  padding: 28px 24px;
  background: var(--surface);
  cursor: default;
}
.feature-icon {
  font-size: 24px;
  margin-bottom: 12px;
}
.feature-title {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
  margin-bottom: 8px;
}
.feature-desc {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--fg-muted);
  line-height: 1.55;
}

/* ── FOOTER ── */
.landing-footer {
  border-top: 1px solid var(--border);
  padding: 20px 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.footer-brand-name {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 15px;
  color: var(--fg-muted);
}
.footer-links {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-link {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--fg-muted); }
.footer-copy {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-subtle);
  letter-spacing: 0.05em;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .landing-nav { padding: 0 16px; }
  .nav-link { display: none; }
  .panels-wrap { padding: 16px 16px 0; }
  .panels-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    height: auto;
    gap: 8px;
  }
  .panel-art {
    grid-column: 1 / span 2;
    grid-row: auto;
    height: 300px;
  }
  .panel-hero {
    grid-column: 1 / span 2;
    grid-row: auto;
    padding: 22px 20px;
    height: auto;
  }
  .panel-voice { grid-column: 1; grid-row: auto; min-height: 100px; }
  .panel-memory { grid-column: 2; grid-row: auto; min-height: 100px; }
  .cta-bar { padding: 16px 16px 20px; }
  .features-section { padding: 32px 16px; }
  .landing-footer { padding: 20px 16px; }
}

@media (max-width: 480px) {
  .panel-heading { font-size: 32px; }
  .panel-art { height: 260px; }
}
</style>
