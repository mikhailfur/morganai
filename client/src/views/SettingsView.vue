<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()

const modes = [
  { id: 'default',     sym: 'i',   kanji: '常', name: 'Обычный',   desc: 'Стандартный ролевой режим. NSFW фильтр включён.' },
  { id: 'study',       sym: 'ii',  kanji: '学', name: 'Учёба',      desc: 'Репетитор. Помогает с заданиями и объясняет.' },
  { id: 'work',        sym: 'iii', kanji: '仕', name: 'Работа',     desc: 'Деловой помощник. Письма, задачи, переговоры.' },
  { id: 'psychologist',sym: 'iv',  kanji: '心', name: 'Психолог',   desc: 'Эмоциональная поддержка. Без оценок и советов.' },
  { id: 'nsfw',        sym: 'v',   kanji: '禁', name: 'NSFW · 18+', desc: 'Без фильтра. Только для Premium.', premium: true },
]

async function setMode(mode: string) {
  if (modes.find(m => m.id === mode)?.premium && !auth.isPremium) return
  await auth.updateSettings({ behavior_mode: mode })
}
</script>

<template>
  <div class="settings-root">

    <!-- Sidebar (desktop) / Top bar (mobile) -->
    <div class="settings-sidebar">
      <!-- Logo -->
      <div class="settings-logo">
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent);">Morgan</span>
          <span style="font-family: var(--font-display); font-size: 12px; color: var(--accent2);">夢</span>
        </div>
        <div style="font-family: var(--font-mono); font-size: 9px; color: var(--accent); letter-spacing: 1.6px; text-transform: uppercase; margin-top: 4px; opacity: 0.8;">AI · OP. III</div>
      </div>

      <div class="settings-sidebar-rule"></div>

      <div class="settings-nav-label">Меню</div>
      <router-link to="/chat" class="nav-item" style="display: block; text-decoration: none; font-size: 14px;">Чат</router-link>
      <router-link to="/pricing" class="nav-item" style="display: block; text-decoration: none; font-size: 14px;">Тарифы</router-link>
      <div class="nav-item active" style="font-size: 14px;">Настройки</div>
      <button @click="theme.toggle()" class="nav-item" style="width: 100%; text-align: left; font-size: 13px; border: none; background: transparent; cursor: pointer; opacity: 0.7;">
        {{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}
      </button>
    </div>

    <!-- Main content -->
    <div class="settings-main">
      <div class="editorial-label" style="color: var(--accent2);">
        <span style="opacity: 0.55;">設</span>
        НАСТРОЙКИ
      </div>

      <div class="display-heading" style="font-size: clamp(28px, 4vw, 52px); margin-top: 12px;">
        Каким будет <span style="font-style: italic; color: var(--accent3);">разговор?</span>
      </div>

      <!-- Behavior modes -->
      <div style="margin-top: 28px;">
        <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 14px;">
          <span style="opacity: 0.55;">01</span>
          РЕЖИМ ПОВЕДЕНИЯ
        </div>

        <div class="modes-grid">
          <div
            v-for="(m, i) in modes" :key="m.id"
            @click="setMode(m.id)"
            :class="['mode-card', auth.user?.behavior_mode === m.id ? 'active' : '']"
            :style="{
              borderTop: i >= 2 ? 'var(--border)' : 'none',
              borderLeft: i % 2 ? 'var(--border)' : 'none',
              opacity: m.premium && !auth.isPremium ? 0.5 : 1,
              cursor: m.premium && !auth.isPremium ? 'not-allowed' : 'pointer',
            }"
          >
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
              <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; color: var(--meta);">{{ m.sym }}.</span>
              <span style="font-family: var(--font-display); font-weight: 500; font-size: 18px; color: var(--fg);">{{ m.name }}</span>
              <span style="font-family: var(--font-display); font-weight: 600; font-size: 22px; color: var(--accent2); margin-left: auto;">{{ m.kanji }}</span>
            </div>
            <p style="font-family: var(--font-display); font-size: 13px; line-height: 1.4; margin-top: 6px; opacity: 0.75; font-style: italic;">{{ m.desc }}</p>
            <div v-if="m.premium" style="margin-top: 8px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--meta); text-transform: uppercase;">✦ Только Premium</div>
            <div v-if="auth.user?.behavior_mode === m.id" style="margin-top: 6px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--accent); text-transform: uppercase;">● АКТИВНО</div>
          </div>
        </div>
      </div>

      <!-- Bottom row: account + voice -->
      <div class="settings-bottom-grid">

        <!-- Account -->
        <div class="settings-panel">
          <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 14px;">
            <span style="opacity: 0.55;">02</span>
            АККАУНТ
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-display); font-size: 15px;">
            <div class="account-row">
              <span class="account-label">Email</span>
              <span class="account-value">{{ auth.user?.email }}</span>
            </div>
            <div style="height: 1px; background: var(--rule);"></div>
            <div class="account-row">
              <span class="account-label">Имя</span>
              <span class="account-value">{{ auth.user?.username }}</span>
            </div>
            <div style="height: 1px; background: var(--rule);"></div>
            <div class="account-row">
              <span class="account-label">План</span>
              <span :style="{ color: auth.isPremium ? 'var(--accent)' : 'var(--fg)', fontWeight: auth.isPremium ? '600' : '400' }">
                {{ auth.isPremium ? '✦ Premium' : 'Free' }}
              </span>
            </div>
            <div style="height: 1px; background: var(--rule);"></div>
            <div class="account-row">
              <span class="account-label">Сообщений</span>
              <span>{{ auth.user?.total_messages || 0 }}</span>
            </div>
          </div>
          <div style="margin-top: 18px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-ghost btn-sm">Сменить пароль</button>
            <button class="btn-ghost btn-sm" style="color: var(--accent2); border-color: var(--accent2);">Удалить аккаунт</button>
          </div>
        </div>

        <!-- Voice stats -->
        <div class="settings-panel">
          <div class="editorial-label" style="color: var(--fg); opacity: 0.7; margin-bottom: 14px;">
            <span style="opacity: 0.55;">03</span>
            ГОЛОС И ОЗВУЧКА
          </div>
          <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--fg); opacity: 0.6;">Голосовых сегодня</div>
          <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 6px;">
            <span style="font-family: var(--font-display); font-weight: 200; font-size: 44px; color: var(--accent); letter-spacing: -1px;">{{ auth.user?.voice_count_today || 0 }}</span>
            <span style="font-family: var(--font-mono); font-size: 13px; color: var(--fg); opacity: 0.5;">/ 20</span>
          </div>
          <div style="display: flex; gap: 3px; margin-top: 8px;">
            <div v-for="i in 20" :key="i" :style="{
              flex: 1,
              height: '8px',
              background: i <= (auth.user?.voice_count_today || 0) ? 'var(--accent2)' : 'var(--rule)',
              opacity: i <= (auth.user?.voice_count_today || 0) ? 1 : 0.4,
            }"></div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 9px; margin-top: 6px; color: var(--fg); opacity: 0.5; letter-spacing: 1.2px; text-transform: uppercase;">лимит обнулится через 5 часов</div>
          <div style="margin-top: 20px;">
            <router-link v-if="!auth.isPremium" to="/pricing" class="btn-primary btn-sm" style="text-decoration: none; display: inline-block;">
              ✦ Получить Premium
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-root {
  height: 100vh;
  height: 100dvh;
  display: flex;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
}

/* ── Sidebar ── */
.settings-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-alt);
  border-right: var(--border);
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.settings-logo {
  padding: 0 20px 14px;
}
.settings-sidebar-rule {
  height: 1px;
  background: var(--rule);
  margin: 0 20px;
}
.settings-nav-label {
  padding: 12px 20px 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
  opacity: 0.8;
}

/* ── Main ── */
.settings-main {
  flex: 1;
  padding: 32px 48px;
  overflow-y: auto;
  min-width: 0;
}

/* ── Modes grid ── */
.modes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: var(--border);
}

/* ── Bottom panels ── */
.settings-bottom-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.settings-panel {
  padding: 22px;
  border: var(--border);
  background: var(--bg-alt);
}

/* ── Account rows ── */
.account-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.account-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--fg);
  opacity: 0.55;
  flex-shrink: 0;
}
.account-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  text-align: right;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .settings-root {
    flex-direction: column;
  }

  /* Sidebar becomes horizontal top nav */
  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 0;
    border-right: none;
    border-bottom: var(--border);
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
    height: auto;
  }
  .settings-logo {
    padding: 12px 16px;
    border-right: var(--border);
    flex-shrink: 0;
  }
  /* Hide subtitle on mobile */
  .settings-logo > div:last-child { display: none; }
  .settings-sidebar-rule { display: none; }
  .settings-nav-label { display: none; }

  /* Nav items become horizontal tabs */
  .settings-sidebar .nav-item {
    padding: 12px 14px !important;
    border-bottom: none !important;
    border-right: var(--border);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Main content */
  .settings-main {
    padding: 20px 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  /* Modes: single column on very small screens */
  .modes-grid {
    grid-template-columns: 1fr;
  }
  .modes-grid .mode-card {
    border-left: none !important;
  }
  .modes-grid .mode-card:first-child {
    border-top: none !important;
  }

  /* Bottom panels: stack vertically */
  .settings-bottom-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .settings-panel {
    padding: 16px;
  }
}
</style>
