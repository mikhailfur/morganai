<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LanguageSwitcher from '../components/LanguageSwitcher.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const modes = [
  { id: 'default',      name: 'Обычный',   desc: 'Стандартный ролевой режим. NSFW фильтр включён.' },
  { id: 'study',        name: 'Учёба',      desc: 'Репетитор. Помогает с заданиями и объясняет.' },
  { id: 'work',         name: 'Работа',     desc: 'Деловой помощник. Письма, задачи, переговоры.' },
  { id: 'psychologist', name: 'Психолог',   desc: 'Эмоциональная поддержка. Без оценок и советов.' },
  { id: 'nsfw',         name: 'NSFW · 18+', desc: 'Без фильтра. Требуется Premium или подтверждение возраста.', restricted: true },
]

const activeTab = ref('profile')
const tabs = [
  { id: 'profile',  label: 'Профиль',    icon: 'user' },
  { id: 'general',  label: 'Основные',   icon: 'settings' },
  { id: 'billing',  label: 'Подписка',   icon: 'crown' },
  { id: 'privacy',  label: 'Приватность',icon: 'shield' },
  { id: 'account',  label: 'Аккаунт',    icon: 'danger', danger: true },
]

const modeError = ref('')
const nsfwGeoBlocked = ref(false)
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
    nsfwGeoBlocked.value = false
  } catch (e: any) {
    const msg: string = e.message || ''
    if (msg.includes('регион') || msg.includes('geo')) {
      nsfwGeoBlocked.value = true
      modeError.value = 'NSFW недоступен в вашем регионе'
    } else {
      modeError.value = msg
    }
    setTimeout(() => modeError.value = '', 4000)
  }
}

// KYC
const showKyc = ref(false)
const kycLoading = ref(false)
const kycError = ref('')
const kycSuccess = ref(false)

async function startKycVerification() {
  kycLoading.value = true; kycError.value = ''
  try {
    const result = await auth.startKycSession()
    if (result.already_verified) { showKyc.value = false; await auth.fetchUser(); return }
    if (result.session_url) {
      if (result.session_id) sessionStorage.setItem('kyc_session_id', result.session_id)
      window.open(result.session_url, '_blank', 'noopener,noreferrer')
      showKyc.value = false
    }
  } catch (e: any) { kycError.value = e.message || 'Ошибка' }
  finally { kycLoading.value = false }
}

onMounted(async () => {
  if (route.query.kyc !== 'done') return
  const sessionIdFromUrl = route.query.verificationSessionId as string | undefined
  const sessionIdFromStorage = sessionStorage.getItem('kyc_session_id') || undefined
  const sessionId = sessionIdFromUrl || sessionIdFromStorage
  router.replace({ query: {} })
  sessionStorage.removeItem('kyc_session_id')
  if (sessionId) {
    kycLoading.value = true; kycError.value = ''
    try {
      const result = await auth.verifyKycReturn(sessionId)
      if (result.verified) kycSuccess.value = true
      else if (result.geo_blocked) kycError.value = 'KYC верификация недоступна в вашем регионе'
      else await auth.fetchUser()
    } catch { await auth.fetchUser() }
    finally { kycLoading.value = false }
  } else { await auth.fetchUser() }
})

// Password change
const showPasswordModal = ref(false)
const pwCurrent = ref(''); const pwNew = ref(''); const pwConfirm = ref('')
const pwError = ref(''); const pwSuccess = ref(false); const pwLoading = ref(false)

function openPasswordModal() {
  pwCurrent.value = ''; pwNew.value = ''; pwConfirm.value = ''
  pwError.value = ''; pwSuccess.value = false; showPasswordModal.value = true
}
async function submitPasswordChange() {
  if (!pwCurrent.value || !pwNew.value || !pwConfirm.value) { pwError.value = 'Заполните все поля'; return }
  if (pwNew.value !== pwConfirm.value) { pwError.value = 'Новые пароли не совпадают'; return }
  if (pwNew.value.length < 8) { pwError.value = 'Минимум 8 символов'; return }
  pwLoading.value = true
  try { await auth.changePassword(pwCurrent.value, pwNew.value); pwSuccess.value = true; setTimeout(() => showPasswordModal.value = false, 1500) }
  catch (e: any) { pwError.value = e.message }
  finally { pwLoading.value = false }
}

// Delete account
const showDeleteModal = ref(false)
const deletePassword = ref(''); const deleteError = ref(''); const deleteLoading = ref(false)
function openDeleteModal() { deletePassword.value = ''; deleteError.value = ''; showDeleteModal.value = true }
async function submitDelete() {
  if (!deletePassword.value) { deleteError.value = 'Введите пароль'; return }
  deleteLoading.value = true
  try { await auth.deleteAccount(deletePassword.value); router.push('/') }
  catch (e: any) { deleteError.value = e.message }
  finally { deleteLoading.value = false }
}

async function clearChat() {
  const { useChatStore } = await import('../stores/chat')
  const chat = useChatStore()
  if (confirm('Очистить всю историю чата?'))
    await chat.clearHistory(auth.user?.selected_character || 'morgan')
}
</script>

<template>
  <div class="settings-root">

    <!-- Sidebar -->
    <aside class="settings-sidebar">
      <!-- Logo -->
      <div class="sb-brand">
        <router-link to="/chat" class="sb-logo">
          <div class="sb-logo-box">M</div>
          <span class="sb-logo-text">Morgan AI</span>
        </router-link>
      </div>

      <!-- Tabs -->
      <nav class="sb-nav">
        <button
          v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          :class="['sb-tab', activeTab === t.id ? 'active' : '', t.danger ? 'danger' : '']"
        >{{ t.label }}</button>
      </nav>

      <!-- Back to chat -->
      <div class="sb-footer">
        <router-link to="/chat" class="btn-ghost btn-sm" style="text-decoration: none; width: 100%;">← В чат</router-link>
      </div>
    </aside>

    <!-- Main -->
    <div class="settings-main">

      <!-- Profile tab -->
      <div v-if="activeTab === 'profile'" class="tab-content animate-fade-in">
        <h2 class="tab-heading">Профиль</h2>
        <div class="settings-card">
          <div class="settings-row">
            <div class="row-label">Имя</div>
            <div class="row-value">{{ auth.user?.username }}</div>
          </div>
          <div class="settings-row">
            <div class="row-label">Email</div>
            <div class="row-value">{{ auth.user?.email }}</div>
          </div>
          <div class="settings-row">
            <div class="row-label">Тариф</div>
            <div class="row-value" :style="{ color: auth.isPremium ? 'var(--accent-soft)' : 'var(--fg-muted)' }">
              {{ auth.user?.subscription_type === 'premium_plus' ? '✦ Premium+' : auth.isPremium ? '✦ Premium' : 'Free' }}
            </div>
          </div>
          <div class="settings-row" style="border-bottom: none;">
            <div class="row-label">Сообщений всего</div>
            <div class="row-value">{{ auth.user?.total_messages || 0 }}</div>
          </div>
        </div>

        <!-- Voice stats -->
        <div class="settings-card" style="margin-top: 16px;">
          <div class="card-section-label">Голос и озвучка</div>
          <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
              <span style="font-size: 13px; color: var(--fg-muted);">Голосовых сегодня</span>
              <span style="font-size: 20px; font-weight: 700; color: var(--accent-soft);">{{ auth.user?.voice_count_today || 0 }}<span style="font-size: 12px; color: var(--fg-subtle);">/20</span></span>
            </div>
            <div style="display: flex; gap: 3px;">
              <div v-for="i in 20" :key="i" :style="{
                flex: 1, height: '6px', border-radius: '2px',
                background: i <= (auth.user?.voice_count_today || 0) ? 'linear-gradient(90deg, #7c3aed, #6366f1)' : 'var(--surface-3)',
              }"></div>
            </div>
            <div style="font-size: 11px; color: var(--fg-subtle); margin-top: 6px; font-family: var(--font-mono); letter-spacing: 0.08em;">лимит обнулится через 5 часов</div>
          </div>
        </div>
      </div>

      <!-- General tab -->
      <div v-else-if="activeTab === 'general'" class="tab-content animate-fade-in">
        <h2 class="tab-heading">Основные</h2>

        <!-- Behavior modes -->
        <div class="settings-card">
          <div class="card-section-label">Режим поведения</div>
          <div v-if="modeError" class="mode-error">{{ modeError }}</div>
          <div class="modes-grid">
            <div
              v-for="m in modes" :key="m.id"
              @click="m.restricted && !auth.canNsfw ? null : setMode(m.id)"
              :class="['mode-card', auth.user?.behavior_mode === m.id ? 'active' : '', m.restricted && !auth.canNsfw ? 'disabled' : '']"
            >
              <div class="mode-name">{{ m.name }}</div>
              <div class="mode-desc">{{ m.desc }}</div>
              <div v-if="m.restricted && !auth.canNsfw" class="mode-lock">✦ Premium или верификация 18+</div>
              <div v-if="auth.user?.behavior_mode === m.id" class="mode-active-dot">●</div>
            </div>
          </div>
          <div v-if="nsfwGeoBlocked" class="mode-geo-msg">✖ NSFW недоступен в вашем регионе</div>
        </div>

        <!-- Language -->
        <div class="settings-card" style="margin-top: 16px;">
          <div class="card-section-label">Язык интерфейса</div>
          <div style="margin-top: 12px;">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <!-- Billing tab -->
      <div v-else-if="activeTab === 'billing'" class="tab-content animate-fade-in">
        <h2 class="tab-heading">Подписка</h2>
        <div class="settings-card" :class="auth.isPremium ? 'billing-card-premium' : ''">
          <div class="card-section-label">Текущий план</div>
          <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: var(--fg);">
                {{ auth.user?.subscription_type === 'premium_plus' ? 'Premium+' : auth.isPremium ? 'Premium' : 'Базовый' }}
              </div>
              <div v-if="auth.user?.subscription_expires_at" style="font-size: 12px; color: var(--fg-muted); margin-top: 4px;">
                До {{ new Date(auth.user.subscription_expires_at).toLocaleDateString('ru-RU') }}
              </div>
            </div>
            <div v-if="auth.isPremium" class="premium-active-badge">● Активен</div>
          </div>

          <div v-if="auth.isPremium" style="margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--fg-muted); margin-bottom: 6px;">
              <span>Сообщений сегодня</span>
              <span>{{ auth.user?.daily_messages_count || 0 }} / ∞</span>
            </div>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <router-link v-if="!auth.isPremium" to="/pricing" class="btn-primary" style="text-decoration: none;">
            ✦ Перейти на Premium
          </router-link>
        </div>
      </div>

      <!-- Privacy tab -->
      <div v-else-if="activeTab === 'privacy'" class="tab-content animate-fade-in">
        <h2 class="tab-heading">Приватность</h2>

        <!-- KYC -->
        <div class="settings-card">
          <div class="card-section-label">Верификация возраста (18+)</div>
          <div v-if="kycLoading" class="info-msg">● Проверяем результат верификации...</div>
          <div v-if="kycSuccess" class="success-msg">✓ Возраст подтверждён — NSFW разблокирован</div>
          <div v-if="kycError" class="error-msg">{{ kycError }}</div>
          <div v-if="auth.isKycVerified" class="success-msg" style="margin-top: 8px;">✓ Возраст подтверждён через Didit</div>
          <div v-else-if="!kycLoading && !kycSuccess && !nsfwGeoBlocked" style="margin-top: 12px;">
            <p style="font-size: 13px; color: var(--fg-muted); margin-bottom: 12px; line-height: 1.5;">
              Подтверди возраст, чтобы разблокировать NSFW без Premium.
            </p>
            <button class="btn-ghost btn-sm" @click="showKyc = true">Подтвердить возраст 18+</button>
          </div>
        </div>
      </div>

      <!-- Account tab (danger zone) -->
      <div v-else-if="activeTab === 'account'" class="tab-content animate-fade-in">
        <h2 class="tab-heading">Аккаунт</h2>

        <div class="settings-card">
          <div class="card-section-label">Безопасность</div>
          <div class="settings-row" style="border-bottom: none;">
            <div>
              <div style="font-size: 14px; color: var(--fg);">Сменить пароль</div>
              <div style="font-size: 12px; color: var(--fg-muted);">Обновить пароль от аккаунта</div>
            </div>
            <button class="btn-ghost btn-sm" @click="openPasswordModal">Сменить</button>
          </div>
        </div>

        <div class="settings-card danger-card" style="margin-top: 16px;">
          <div class="card-section-label" style="color: var(--danger);">Опасная зона</div>
          <div class="settings-row">
            <div>
              <div style="font-size: 14px; color: var(--fg);">Очистить историю чата</div>
              <div style="font-size: 12px; color: var(--fg-muted);">Удалит все сообщения безвозвратно</div>
            </div>
            <button class="btn-ghost btn-sm danger-btn" @click="clearChat">Очистить</button>
          </div>
          <div class="settings-row" style="border-bottom: none;">
            <div>
              <div style="font-size: 14px; color: var(--fg);">Удалить аккаунт</div>
              <div style="font-size: 12px; color: var(--fg-muted);">Все данные будут удалены навсегда</div>
            </div>
            <button class="btn-ghost btn-sm danger-btn" @click="openDeleteModal">Удалить</button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- KYC Modal -->
  <Teleport to="body">
    <div v-if="showKyc" class="modal-overlay" @click.self="showKyc = false">
      <div class="modal-box">
        <h3 class="modal-title">Подтверждение возраста 18+</h3>
        <p class="modal-body">Для доступа к NSFW-контенту необходимо пройти верификацию возраста через сервис <strong>Didit</strong>. После нажатия откроется новая вкладка. Вернитесь сюда после завершения — статус обновится автоматически.</p>
        <div v-if="kycError" class="error-msg" style="margin-bottom: 12px;">{{ kycError }}</div>
        <div class="modal-actions">
          <button class="btn-primary btn-sm" :disabled="kycLoading" @click="startKycVerification">
            {{ kycLoading ? 'Открываем...' : 'Начать верификацию' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showKyc = false">Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Password Modal -->
  <Teleport to="body">
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="showPasswordModal = false">
      <div class="modal-box">
        <h3 class="modal-title">Смена пароля</h3>
        <div v-if="pwSuccess" class="success-msg" style="margin-bottom: 12px;">Пароль успешно изменён</div>
        <div v-if="pwError" class="error-msg" style="margin-bottom: 12px;">{{ pwError }}</div>
        <div class="modal-fields">
          <div class="field">
            <label class="field-label">Текущий пароль</label>
            <input type="password" v-model="pwCurrent" class="m-input" placeholder="••••••••" />
          </div>
          <div class="field">
            <label class="field-label">Новый пароль (мин. 8 символов)</label>
            <input type="password" v-model="pwNew" class="m-input" placeholder="••••••••" />
          </div>
          <div class="field">
            <label class="field-label">Повторите новый пароль</label>
            <input type="password" v-model="pwConfirm" class="m-input" placeholder="••••••••" @keyup.enter="submitPasswordChange" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary btn-sm" :disabled="pwLoading" @click="submitPasswordChange">
            {{ pwLoading ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button class="btn-ghost btn-sm" @click="showPasswordModal = false">Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Delete Modal -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-box">
        <h3 class="modal-title" style="color: var(--danger);">Удалить аккаунт</h3>
        <p class="modal-body">Это действие необратимо. Все ваши данные, история чатов и настройки будут удалены навсегда.</p>
        <div v-if="deleteError" class="error-msg" style="margin-bottom: 12px;">{{ deleteError }}</div>
        <div class="field" style="margin-bottom: 16px;">
          <label class="field-label">Введите пароль для подтверждения</label>
          <input type="password" v-model="deletePassword" class="m-input" placeholder="••••••••" @keyup.enter="submitDelete" />
        </div>
        <div class="modal-actions">
          <button class="btn-ghost btn-sm danger-btn" :disabled="deleteLoading" @click="submitDelete">
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
  height: 100vh;
  height: 100dvh;
  display: flex;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* ── Sidebar ── */
.settings-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: rgb(18 13 36 / 0.85);
  backdrop-filter: blur(16px);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
}
.sb-brand {
  padding: 0 16px 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.sb-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.sb-logo-box {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  box-shadow: 0 0 10px -3px rgb(124 58 237 / 0.5);
}
.sb-logo-text {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
}
.sb-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 10px;
}
.sb-tab {
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  border: none;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--fg-muted);
  font-family: var(--font-ui);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.sb-tab:hover { background: var(--surface-2); color: var(--fg); }
.sb-tab.active {
  background: rgb(124 58 237 / 0.15);
  color: #c4b5fd;
  box-shadow: inset 0 0 0 1px rgb(124 58 237 / 0.25);
}
.sb-tab.danger { color: rgb(252 165 165 / 0.7); }
.sb-tab.danger:hover { background: rgb(239 68 68 / 0.1); color: #fca5a5; }
.sb-tab.danger.active { background: rgb(239 68 68 / 0.12); color: #fca5a5; box-shadow: inset 0 0 0 1px rgb(239 68 68 / 0.25); }
.sb-footer {
  padding: 12px 10px 0;
  border-top: 1px solid var(--border);
}

/* ── Main ── */
.settings-main {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  min-width: 0;
}
.tab-content { max-width: 680px; }
.tab-heading {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: var(--fg);
  margin-bottom: 24px;
}

/* ── Cards ── */
.settings-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.billing-card-premium {
  border-color: rgb(124 58 237 / 0.35);
  box-shadow: 0 0 32px -8px rgb(124 58 237 / 0.3);
}
.danger-card {
  border-color: rgb(239 68 68 / 0.2);
}
.card-section-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.row-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  flex-shrink: 0;
}
.row-value {
  font-size: 14px;
  color: var(--fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.premium-active-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-soft);
  background: rgb(124 58 237 / 0.15);
  border: 1px solid rgb(124 58 237 / 0.3);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

/* ── Modes ── */
.modes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--border);
  margin-top: 0;
}
.mode-card {
  padding: 16px;
  background: var(--surface);
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.mode-card:hover { background: var(--surface-2); }
.mode-card.active { background: rgb(124 58 237 / 0.12); }
.mode-card.disabled { opacity: 0.5; cursor: not-allowed; }
.mode-name {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 14px;
  color: var(--fg);
  margin-bottom: 5px;
}
.mode-card.active .mode-name { color: var(--accent-soft); }
.mode-desc { font-size: 12px; color: var(--fg-muted); line-height: 1.4; }
.mode-lock { font-family: var(--font-mono); font-size: 9px; color: var(--fg-subtle); margin-top: 6px; letter-spacing: 0.08em; text-transform: uppercase; }
.mode-active-dot { position: absolute; top: 10px; right: 12px; color: var(--accent-soft); font-size: 8px; }

.mode-error {
  background: rgb(245 158 11 / 0.1);
  border-bottom: 1px solid rgb(245 158 11 / 0.2);
  padding: 10px 16px;
  font-size: 12px;
  color: rgb(251 191 36);
}
.mode-geo-msg {
  padding: 10px 16px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--danger);
}

/* Status messages */
.info-msg {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
  padding: 10px 20px;
  letter-spacing: 0.08em;
}
.success-msg {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--success);
  padding: 10px 20px;
  letter-spacing: 0.08em;
}
.error-msg {
  background: rgb(239 68 68 / 0.1);
  border: 1px solid rgb(239 68 68 / 0.3);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  color: #fca5a5;
}

.danger-btn {
  border-color: rgb(239 68 68 / 0.4) !important;
  color: #fca5a5 !important;
}
.danger-btn:hover {
  background: rgb(239 68 68 / 0.1) !important;
}

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  padding: 24px;
  backdrop-filter: blur(4px);
}
.modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 28px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 0 48px -8px rgb(124 58 237 / 0.3);
}
.modal-title {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.02em;
  color: var(--fg);
  margin-bottom: 12px;
}
.modal-body {
  font-size: 14px;
  color: var(--fg-muted);
  line-height: 1.6;
  margin-bottom: 20px;
}
.modal-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .settings-root { flex-direction: column; }
  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    padding: 0;
    height: 50px;
    border-right: none;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    flex-shrink: 0;
  }
  .sb-brand { display: none; }
  .sb-footer { display: none; }
  .sb-nav {
    flex-direction: row;
    padding: 6px 12px;
    gap: 4px;
    overflow-x: auto;
    flex: 1;
  }
  .sb-tab { white-space: nowrap; flex-shrink: 0; font-size: 12px; padding: 7px 10px; }
  .settings-main { padding: 20px 16px; }
  .modes-grid { grid-template-columns: 1fr; }
}
</style>
