<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()

const modes = [
  { id: 'default',      sym: 'i',   kanji: '常', name: 'Обычный',   desc: 'Стандартный ролевой режим. NSFW фильтр включён.' },
  { id: 'study',        sym: 'ii',  kanji: '学', name: 'Учёба',      desc: 'Репетитор. Помогает с заданиями и объясняет.' },
  { id: 'work',         sym: 'iii', kanji: '仕', name: 'Работа',     desc: 'Деловой помощник. Письма, задачи, переговоры.' },
  { id: 'psychologist', sym: 'iv',  kanji: '心', name: 'Психолог',   desc: 'Эмоциональная поддержка. Без оценок и советов.' },
  { id: 'nsfw',         sym: 'v',   kanji: '禁', name: 'NSFW · 18+', desc: 'Без фильтра. Требуется Premium или подтверждение возраста.', restricted: true },
]

const modeError = ref('')
async function setMode(mode: string) {
  const m = modes.find(m => m.id === mode)
  if (m?.restricted && !auth.canNsfw) {
    modeError.value = 'NSFW доступен с Premium или после подтверждения возраста 18+'
    setTimeout(() => modeError.value = '', 3000)
    return
  }
  try {
    await auth.updateSettings({ behavior_mode: mode })
    modeError.value = ''
  } catch (e: any) {
    modeError.value = e.message
    setTimeout(() => modeError.value = '', 3000)
  }
}

// === KYC ===
const showKyc = ref(false)
const kycChecked = ref(false)
const kycLoading = ref(false)
async function confirmKyc() {
  if (!kycChecked.value) return
  kycLoading.value = true
  try {
    await auth.verifyKyc()
    showKyc.value = false
  } finally { kycLoading.value = false }
}

// === Change password ===
const showPasswordModal = ref(false)
const pwCurrent = ref('')
const pwNew = ref('')
const pwConfirm = ref('')
const pwError = ref('')
const pwSuccess = ref(false)
const pwLoading = ref(false)

function openPasswordModal() {
  pwCurrent.value = ''; pwNew.value = ''; pwConfirm.value = ''
  pwError.value = ''; pwSuccess.value = false
  showPasswordModal.value = true
}

async function submitPasswordChange() {
  if (!pwCurrent.value || !pwNew.value || !pwConfirm.value) {
    pwError.value = 'Заполните все поля'; return
  }
  if (pwNew.value !== pwConfirm.value) {
    pwError.value = 'Новые пароли не совпадают'; return
  }
  if (pwNew.value.length < 8) {
    pwError.value = 'Минимум 8 символов'; return
  }
  pwLoading.value = true
  try {
    await auth.changePassword(pwCurrent.value, pwNew.value)
    pwSuccess.value = true
    setTimeout(() => { showPasswordModal.value = false }, 1500)
  } catch (e: any) {
    pwError.value = e.message
  } finally { pwLoading.value = false }
}

// === Delete account ===
const showDeleteModal = ref(false)
const deletePassword = ref('')
const deleteError = ref('')
const deleteLoading = ref(false)

function openDeleteModal() {
  deletePassword.value = ''; deleteError.value = ''
  showDeleteModal.value = true
}

async function submitDelete() {
  if (!deletePassword.value) { deleteError.value = 'Введите пароль'; return }
  deleteLoading.value = true
  try {
    await auth.deleteAccount(deletePassword.value)
    router.push('/')
  } catch (e: any) {
    deleteError.value = e.message
  } finally { deleteLoading.value = false }
}
</script>

<template>
  <div class="settings-root">

    <!-- Sidebar -->
    <div class="settings-sidebar">
      <div class="settings-logo">
        <router-link to="/" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
          <img :src="'/logo.png'" alt="Morgan" style="height: 38px; border-radius: 5px; display: block;" />
          <span style="font-family: var(--font-display); font-weight: 600; font-size: 20px; color: var(--accent);">Morgan</span>
        </router-link>
        <div class="settings-logo-sub">AI · OP. III</div>
      </div>
      <div class="settings-sidebar-rule"></div>
      <div class="settings-nav-label">Меню</div>
      <router-link to="/chat" class="nav-item" style="display: block; text-decoration: none; font-size: 14px;">Чат</router-link>
      <router-link to="/pricing" class="nav-item" style="display: block; text-decoration: none; font-size: 14px;">Тарифы</router-link>
      <div class="nav-item active settings-self-item" style="font-size: 14px;">Настройки</div>
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
        <div v-if="modeError" style="margin-bottom: 10px; padding: 8px 12px; background: var(--bg-alt); border-left: 3px solid var(--accent2); font-size: 13px; color: var(--accent2);">{{ modeError }}</div>
        <div class="modes-grid">
          <div
            v-for="(m, i) in modes" :key="m.id"
            @click="setMode(m.id)"
            :class="['mode-card', auth.user?.behavior_mode === m.id ? 'active' : '']"
            :style="{
              borderTop: i >= 2 ? 'var(--border)' : 'none',
              borderLeft: i % 2 ? 'var(--border)' : 'none',
              opacity: m.restricted && !auth.canNsfw ? 0.55 : 1,
              cursor: m.restricted && !auth.canNsfw ? 'not-allowed' : 'pointer',
            }"
          >
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
              <span style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; color: var(--meta);">{{ m.sym }}.</span>
              <span style="font-family: var(--font-display); font-weight: 500; font-size: 18px; color: var(--fg);">{{ m.name }}</span>
              <span style="font-family: var(--font-display); font-weight: 600; font-size: 22px; color: var(--accent2); margin-left: auto;">{{ m.kanji }}</span>
            </div>
            <p style="font-family: var(--font-display); font-size: 13px; line-height: 1.4; margin-top: 6px; opacity: 0.75; font-style: italic;">{{ m.desc }}</p>
            <div v-if="m.restricted && !auth.canNsfw" style="margin-top: 8px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--meta); text-transform: uppercase;">
              ✦ Premium или верификация 18+
            </div>
            <div v-if="auth.user?.behavior_mode === m.id" style="margin-top: 6px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; color: var(--accent); text-transform: uppercase;">● АКТИВНО</div>
          </div>
        </div>
        <!-- KYC button for non-premium -->
        <div v-if="!auth.isPremium && !auth.isKycVerified" style="margin-top: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <button class="btn-ghost btn-sm" @click="showKyc = true">Подтвердить возраст 18+</button>
          <span style="font-size: 12px; color: var(--fg-dim); font-family: var(--font-mono);">— разблокирует NSFW без Premium</span>
        </div>
        <div v-if="auth.isKycVerified && !auth.isPremium" style="margin-top: 10px; font-family: var(--font-mono); font-size: 10px; color: var(--meta); letter-spacing: 1.2px; text-transform: uppercase;">
          ✓ Возраст подтверждён
        </div>
      </div>

      <!-- Bottom row -->
      <div class="settings-bottom-grid">
        <!-- Account panel -->
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
                {{ auth.user?.subscription_type === 'premium_plus' ? '✦ Premium+' : auth.isPremium ? '✦ Premium' : 'Free' }}
              </span>
            </div>
            <div style="height: 1px; background: var(--rule);"></div>
            <div class="account-row">
              <span class="account-label">Сообщений</span>
              <span>{{ auth.user?.total_messages || 0 }}</span>
            </div>
          </div>
          <div style="margin-top: 18px; display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-ghost btn-sm" @click="openPasswordModal">Сменить пароль</button>
            <button class="btn-ghost btn-sm" style="color: var(--accent2); border-color: var(--accent2);" @click="openDeleteModal">Удалить аккаунт</button>
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
              flex: 1, height: '8px',
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

  <!-- KYC Modal -->
  <Teleport to="body">
    <div v-if="showKyc" class="modal-overlay" @click.self="showKyc = false">
      <div class="modal-box">
        <div style="font-family: var(--font-display); font-size: 22px; font-weight: 600; margin-bottom: 12px;">Подтверждение возраста</div>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; color: var(--fg-dim);">
          Контент 18+ предназначен только для совершеннолетних пользователей. Подтверждая возраст, вы берёте ответственность за использование данной функции.
        </p>
        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 14px; line-height: 1.5;">
          <input type="checkbox" v-model="kycChecked" style="margin-top: 2px; cursor: pointer;" />
          Я подтверждаю, что мне исполнилось 18 лет
        </label>
        <div style="margin-top: 20px; display: flex; gap: 8px;">
          <button class="btn-primary btn-sm" :disabled="!kycChecked || kycLoading" @click="confirmKyc">
            {{ kycLoading ? 'Сохранение...' : 'Подтвердить' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showKyc = false">Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Password change modal -->
  <Teleport to="body">
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal-box">
        <div style="font-family: var(--font-display); font-size: 22px; font-weight: 600; margin-bottom: 16px;">Смена пароля</div>
        <div v-if="pwSuccess" style="padding: 10px; background: var(--bg-alt); border-left: 3px solid var(--accent); font-size: 14px; color: var(--accent); margin-bottom: 12px;">Пароль успешно изменён</div>
        <div v-if="pwError" style="padding: 10px; background: var(--bg-alt); border-left: 3px solid var(--accent2); font-size: 13px; color: var(--accent2); margin-bottom: 12px;">{{ pwError }}</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 4px; opacity: 0.6;">Текущий пароль</div>
            <input type="password" v-model="pwCurrent" class="m-input" style="width: 100%;" placeholder="••••••••" />
          </div>
          <div>
            <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 4px; opacity: 0.6;">Новый пароль (мин. 8 символов)</div>
            <input type="password" v-model="pwNew" class="m-input" style="width: 100%;" placeholder="••••••••" />
          </div>
          <div>
            <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 4px; opacity: 0.6;">Повторите новый пароль</div>
            <input type="password" v-model="pwConfirm" class="m-input" style="width: 100%;" placeholder="••••••••" @keyup.enter="submitPasswordChange" />
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 8px;">
          <button class="btn-primary btn-sm" :disabled="pwLoading" @click="submitPasswordChange">
            {{ pwLoading ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showPasswordModal = false">Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Delete account modal -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-box">
        <div style="font-family: var(--font-display); font-size: 22px; font-weight: 600; margin-bottom: 8px; color: var(--accent2);">Удалить аккаунт</div>
        <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px; color: var(--fg-dim);">
          Это действие необратимо. Все ваши данные, история чатов и настройки будут удалены навсегда.
        </p>
        <div v-if="deleteError" style="padding: 10px; background: var(--bg-alt); border-left: 3px solid var(--accent2); font-size: 13px; color: var(--accent2); margin-bottom: 12px;">{{ deleteError }}</div>
        <div>
          <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 4px; opacity: 0.6;">Введите пароль для подтверждения</div>
          <input type="password" v-model="deletePassword" class="m-input" style="width: 100%;" placeholder="••••••••" @keyup.enter="submitDelete" />
        </div>
        <div style="margin-top: 20px; display: flex; gap: 8px;">
          <button class="btn-ghost btn-sm" style="color: var(--accent2); border-color: var(--accent2);" :disabled="deleteLoading" @click="submitDelete">
            {{ deleteLoading ? 'Удаление...' : 'Удалить навсегда' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showDeleteModal = false">Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-root {
  height: 100vh; height: 100dvh;
  display: flex;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
}

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
.settings-logo { padding: 0 20px 14px; }
.settings-logo-sub {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--accent);
  letter-spacing: 1.6px;
  text-transform: uppercase;
  margin-top: 4px;
  opacity: 0.8;
}
.settings-sidebar-rule { height: 1px; background: var(--rule); margin: 0 20px; }
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

.settings-main {
  flex: 1;
  padding: 32px 48px;
  overflow-y: auto;
  min-width: 0;
}

.modes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: var(--border);
}

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

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 16px;
}
.modal-box {
  background: var(--bg);
  border: var(--border);
  box-shadow: var(--shadow-box);
  padding: 28px;
  max-width: 440px;
  width: 100%;
}

@media (max-width: 768px) {
  .settings-root { flex-direction: column; }

  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    align-items: center;
    padding: 0 12px;
    border-right: none;
    border-bottom: var(--border);
    overflow: hidden;
    flex-shrink: 0;
    height: 52px;
    gap: 2px;
  }
  .settings-logo {
    padding: 0 12px 0 0;
    border-right: var(--border);
    flex-shrink: 0;
    margin-right: 8px;
  }
  .settings-logo-sub { display: none; }
  .settings-sidebar-rule { display: none; }
  .settings-nav-label { display: none; }
  .settings-self-item { display: none; }
  .settings-sidebar .nav-item {
    padding: 8px 10px !important;
    font-size: 12px !important;
    border-bottom: none !important;
    border-right: none !important;
    white-space: nowrap;
    flex-shrink: 0;
    letter-spacing: 0 !important;
  }
  /* Push theme toggle to the right */
  .settings-sidebar .nav-item:last-child {
    margin-left: auto;
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
    letter-spacing: 1px !important;
  }

  .settings-main {
    padding: 20px 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  .modes-grid { grid-template-columns: 1fr; }
  .modes-grid .mode-card { border-left: none !important; }
  .modes-grid .mode-card:first-child { border-top: none !important; }
  .settings-bottom-grid { grid-template-columns: 1fr; gap: 12px; }
  .settings-panel { padding: 16px; }
}
</style>
