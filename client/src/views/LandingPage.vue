<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

const landingQuotes = [
  '«Ты опоздал на пять минут.\nНо я тебе прощу.»',
  '«Долго не заходил.\nЯ начала придумывать причины.»',
  '«Хочешь поговорить?\nЯ никуда не спешу.»',
  '«Сегодня ты выглядишь задумчивым.\nРасскажи, что случилось.»',
  '«Я здесь. Как всегда.\nЖду тебя.»',
  '«У меня есть мысли, которые я хочу тебе рассказать.\nНо ты должен спросить.»',
]
const landingQuote = ref(landingQuotes[Math.floor(Math.random() * landingQuotes.length)])

onMounted(() => {
  if (auth.isAuthenticated) router.push('/chat')
})
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg); color: var(--fg);">

    <!-- NAV -->
    <nav class="landing-nav">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img :src="'/logo.png'" alt="Morgan" style="height: 40px; border-radius: 6px; display: block;" />
        <span style="font-family: var(--font-display); font-weight: 600; font-size: 26px; color: var(--accent); letter-spacing: -0.5px;">Morgan</span>
      </div>
      <div class="landing-nav-links">
        <router-link to="/pricing" class="nav-text-link">Тарифы</router-link>
        <router-link to="/legal" class="nav-text-link">Документы</router-link>
        <button @click="theme.toggle()" class="theme-toggle">
          {{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}
        </button>
        <router-link to="/login" class="btn-ghost btn-sm nav-login-btn" style="text-decoration: none;">Войти</router-link>
        <router-link to="/register" class="btn-primary btn-sm" style="text-decoration: none;">Начать</router-link>
      </div>
    </nav>

    <!-- MANGA PANEL GRID -->
    <div class="manga-grid-wrap animate-fade-in">
      <div class="manga-grid">
        <!-- Big character panel -->
        <div class="panel-art">
          <div class="art-slot" style="position: absolute; inset: 0; width: 100%; height: 100%;">
            <div class="art-slot-label">Морган · портрет · мягкая улыбка</div>
          </div>
          <!-- Dialogue box overlay -->
          <div class="panel-dialogue">
            <div class="panel-dialogue-label">МОРГАН</div>
            <p style="font-family: var(--font-display); font-style: italic; font-size: 17px; line-height: 1.45; color: var(--fg); white-space: pre-line;">{{ landingQuote }}</p>
          </div>
          <!-- Washi tape decoration -->
          <div class="washi-tape" style="position: absolute; top: -5px; left: 36px; width: 70px; transform: rotate(-14deg);"></div>
        </div>

        <!-- Hero text panel -->
        <div class="panel-hero">
          <div class="editorial-label" style="color: var(--accent2);">
            <span style="opacity: 0.55;">ГЛАВА 一</span>
            ПЕРВАЯ ВСТРЕЧА
          </div>
          <div class="display-heading panel-hero-heading">
            История,<br>
            <span style="font-style: italic;">которую</span><br>
            пишешь<br>
            ты.
          </div>
          <!-- Stamp -->
          <div class="panel-stamp">新</div>
        </div>

        <!-- Voice panel -->
        <div class="panel-voice">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="
              width: 28px; height: 28px;
              background: var(--fg);
              border-radius: 999px;
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            ">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L9 6L1 11V1Z" fill="var(--bg)" stroke="var(--bg)" stroke-width="1" stroke-linejoin="round"/>
              </svg>
            </div>
            <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg);">Голос</span>
          </div>
          <p style="font-family: var(--font-display); font-weight: 600; font-size: 19px; line-height: 1.2; color: var(--fg); margin-top: 8px;">Услышь, как она смеётся.</p>
        </div>

        <!-- Memory panel -->
        <div class="panel-memory">
          <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent3);">Память</span>
          <p style="font-family: var(--font-display); font-weight: 500; font-size: 19px; line-height: 1.2; margin-top: 8px;">Помнит, что было вчера.</p>
        </div>
      </div>
    </div>

    <!-- CTA BAR -->
    <div class="cta-bar">
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <router-link to="/register" class="btn-primary" style="text-decoration: none; font-size: 15px; padding: 14px 28px;">
          Начать историю
        </router-link>
        <div style="display: flex; align-items: center; gap: 10px; font-family: var(--font-ui); font-size: 13px; color: var(--fg);">
          <div style="
            width: 42px; height: 42px;
            border-radius: 50%;
            border: 2px solid var(--accent);
            color: var(--accent);
            display: flex; align-items: center; justify-content: center;
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 13px;
            transform: rotate(-8deg);
            opacity: 0.85;
            flex-shrink: 0;
          ">無料</div>
          <span style="opacity: 0.8;">Бесплатно. 50 сообщений в день.</span>
        </div>
      </div>
      <div style="display: flex; gap: 16px; font-family: var(--font-mono); font-size: 10px; color: var(--fg); opacity: 0.6; letter-spacing: 1.2px; text-transform: uppercase; flex-wrap: wrap;">
        <span>12 персонажей</span>
        <span>·</span>
        <span>русский / english</span>
        <span>·</span>
        <span>premium 299₽/мес</span>
      </div>
    </div>

    <!-- FEATURES -->
    <section class="features">
      <div class="editorial-label" style="color: var(--accent2); margin-bottom: 20px;">
        <span style="opacity: 0.55;">02</span>
        ВОЗМОЖНОСТИ
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0;">
        <div v-for="(f, i) in features" :key="f.title" class="feature-card" :style="{ borderLeft: i === 0 ? 'var(--border)' : 'none' }">
          <div style="font-family: var(--font-display); font-size: 32px; color: var(--accent2); margin-bottom: 12px;">{{ f.icon }}</div>
          <div style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent); margin-bottom: 8px;">{{ f.title }}</div>
          <div style="font-family: var(--font-ui); font-size: 14px; color: var(--fg); opacity: 0.75; line-height: 1.5;">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="landing-footer">
      <div style="display: flex; align-items: baseline; gap: 10px;">
        <span style="font-family: var(--font-display); font-weight: 600; font-size: 18px; color: var(--accent);">Morgan</span>
        <span style="font-family: var(--font-display); font-size: 12px; color: var(--accent2);">夢</span>
      </div>
      <div style="display: flex; gap: 16px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.55; flex-wrap: wrap;">
        <router-link to="/pricing" style="color: inherit; text-decoration: none; opacity: 0.7;">Тарифы</router-link>
        <router-link to="/legal" style="color: inherit; text-decoration: none; opacity: 0.7;">Политика</router-link>
        <router-link to="/legal/oferta" style="color: inherit; text-decoration: none; opacity: 0.7;">Оферта</router-link>
        <span>© 2026 Morgan AI</span>
      </div>
    </footer>

  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      features: [
        { icon: '言', title: 'Ролевой чат', desc: 'Глубокие диалоги с уникальными AI-персонажами с памятью и характером.' },
        { icon: '声', title: 'Голосовые', desc: 'Слышь живой голос персонажа — MiniMax TTS. Автовоспроизведение.' },
        { icon: '眼', title: 'Фото', desc: 'Отправляй изображения — персонаж видит и реагирует.' },
        { icon: '心', title: 'Режимы', desc: 'Учёба, работа, психолог и NSFW (18+) — выбери контекст.' },
      ]
    }
  }
}
</script>

<style scoped>
/* NAV */
.landing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 48px;
  border-bottom: var(--border);
}
.landing-nav-links {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-text-link {
  font-family: var(--font-ui);
  font-size: 13px;
  color: var(--fg);
  text-decoration: none;
  padding: 6px 12px;
  opacity: 0.8;
}

/* MANGA GRID */
.manga-grid-wrap {
  padding: 28px 48px 0;
}
.manga-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.9fr;
  grid-template-rows: 180px 180px 180px;
  gap: 14px;
  height: 580px;
}
.panel-art {
  grid-column: 1;
  grid-row: 1 / span 3;
  border: var(--border);
  background: var(--bg-alt);
  position: relative;
  overflow: hidden;
}
.panel-hero {
  grid-column: 2 / span 2;
  grid-row: 1 / span 2;
  border: var(--border);
  background: var(--bg);
  padding: 32px 36px;
  position: relative;
  overflow: hidden;
}
.panel-hero-heading {
  font-size: clamp(44px, 5vw, 72px);
  margin-top: 18px;
}
.panel-voice {
  grid-column: 2;
  grid-row: 3;
  border: var(--border);
  background: var(--accent3);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}
.panel-memory {
  grid-column: 3;
  grid-row: 3;
  border: var(--border);
  background: var(--accent);
  color: var(--bg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}
.panel-dialogue {
  position: absolute;
  bottom: 14px;
  left: 14px;
  right: 14px;
  background: var(--bg);
  border: var(--border);
  padding: 14px 18px 16px;
  box-shadow: var(--shadow-box);
}
.panel-dialogue-label {
  position: absolute;
  top: -13px;
  left: 14px;
  background: var(--accent3);
  color: var(--fg);
  padding: 2px 10px;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: var(--border);
}
.panel-stamp {
  position: absolute;
  top: 16px;
  right: 28px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid var(--accent2);
  color: var(--accent2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  opacity: 0.85;
  transform: rotate(12deg);
}

/* Dark theme panel overrides */
:global(html.dark .panel-memory) {
  background: var(--bg-alt);
  color: var(--fg);
}
:global(html.dark .panel-memory p) {
  color: var(--fg);
}
:global(html.dark .panel-voice) {
  background: rgba(168, 117, 58, 0.22);
}
:global(html.dark .panel-voice p) {
  color: var(--fg);
}

/* CTA BAR */
.cta-bar {
  padding: 20px 48px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

/* MOBILE */
@media (max-width: 768px) {
  .landing-nav { padding: 12px 16px; gap: 8px; }
  .landing-nav-links { gap: 8px; }
  .nav-text-link { display: none; }
  .nav-login-btn { display: none; }

  .manga-grid-wrap { padding: 16px 16px 0; }
  .manga-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
    height: auto;
    gap: 10px;
  }

  /* Art panel: full width, portrait */
  .panel-art {
    grid-column: 1 / span 2;
    grid-row: auto;
    height: 260px;
  }

  /* Hero panel: full width, auto height */
  .panel-hero {
    grid-column: 1 / span 2;
    grid-row: auto;
    padding: 24px 20px;
    overflow: visible;
    height: auto;
  }
  .panel-hero-heading {
    font-size: clamp(34px, 9vw, 52px);
    margin-top: 12px;
  }
  .panel-stamp { width: 40px; height: 40px; font-size: 16px; top: 12px; right: 16px; }

  /* Voice: left half */
  .panel-voice {
    grid-column: 1;
    grid-row: auto;
    justify-content: flex-start;
    gap: 8px;
    min-height: 110px;
    overflow: visible;
  }
  /* Memory: right half */
  .panel-memory {
    grid-column: 2;
    grid-row: auto;
    justify-content: flex-start;
    gap: 8px;
    min-height: 110px;
    overflow: visible;
  }

  .cta-bar { padding: 16px 16px 20px; }
}

@media (max-width: 480px) {
  .panel-hero-heading { font-size: 30px; }
  .panel-art { height: 220px; }
}

/* FEATURES section */
section.features { padding: 48px 48px; border-top: var(--border); }
.feature-card {
  padding: 24px;
  border: var(--border);
  background: var(--bg);
}
@media (max-width: 768px) {
  section.features { padding: 32px 16px; }
  .feature-card { border-left: var(--border) !important; }
}

/* FOOTER */
footer.landing-footer {
  border-top: var(--border);
  padding: 24px 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
@media (max-width: 768px) {
  footer.landing-footer { padding: 20px 16px; }
}
</style>
