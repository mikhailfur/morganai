<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const billing = ref<'monthly' | 'yearly'>('monthly')

const tiers = [
  {
    id: 'free',
    name: 'Базовый',
    price: { monthly: 0, yearly: 0 },
    period: '/ навсегда',
    desc: 'Попробуй без обязательств',
    features: [
      { text: '50 сообщений в день', ok: true },
      { text: '3 базовых персонажа', ok: true },
      { text: 'Текстовый чат', ok: true },
      { text: 'История 30 дней', ok: true },
      { text: 'Голосовые ответы', ok: false },
      { text: 'NSFW режим', ok: false },
    ],
    cta: 'Начать бесплатно',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: { monthly: 299, yearly: 239 },
    period: '₽ / месяц',
    desc: 'Полный доступ к платформе',
    features: [
      { text: 'Безлимит сообщений', ok: true },
      { text: 'Все персонажи', ok: true },
      { text: 'Голос (20 / 5 часов)', ok: true },
      { text: 'NSFW режим (18+)', ok: true },
      { text: 'Vision · фото', ok: true },
      { text: 'Память навсегда', ok: true },
    ],
    cta: 'Оформить Premium',
    popular: true,
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    price: { monthly: 599, yearly: 479 },
    period: '₽ / месяц',
    desc: 'Максимальные возможности',
    features: [
      { text: 'Всё из Premium', ok: true },
      { text: 'Безлимит голоса', ok: true },
      { text: 'Контекст 100к токенов', ok: true },
      { text: 'Приоритетная генерация', ok: true },
      { text: 'Эксклюзивные персонажи', ok: true },
      { text: 'Ранний доступ к новому', ok: true },
    ],
    cta: 'Оформить Premium+',
    popular: false,
  },
]

function handlePurchase(tierId: string) {
  if (tierId === 'free') {
    window.location.href = '/register'
  } else {
    alert('Оплата — скоро. Свяжитесь: support@morgan.ai')
  }
}
</script>

<template>
  <div class="pricing-root">

    <!-- NAV -->
    <nav class="pricing-nav">
      <router-link to="/" class="nav-logo">
        <div class="logo-box">M</div>
        <span class="logo-text">Morgan AI</span>
      </router-link>
      <div style="display: flex; align-items: center; gap: 8px;">
        <router-link v-if="auth.isAuthenticated" to="/chat" class="btn-ghost btn-sm" style="text-decoration: none;">В чат</router-link>
        <router-link v-else to="/login" class="btn-ghost btn-sm" style="text-decoration: none;">Войти</router-link>
      </div>
    </nav>

    <div class="pricing-content">
      <!-- Heading -->
      <div class="pricing-heading-wrap animate-fade-in">
        <div class="section-label">Тарифы</div>
        <h1 class="pricing-heading">
          Выбери свой<br />
          <span class="gradient-text">путь</span>
        </h1>
        <!-- Billing toggle -->
        <div class="billing-toggle">
          <button
            @click="billing = 'monthly'"
            :class="['toggle-btn', billing === 'monthly' ? 'active' : '']"
          >Помесячно</button>
          <button
            @click="billing = 'yearly'"
            :class="['toggle-btn', billing === 'yearly' ? 'active' : '']"
          >Ежегодно · −20%</button>
        </div>
      </div>

      <!-- Cards -->
      <div class="tiers-grid animate-fade-in-1">
        <div
          v-for="t in tiers" :key="t.id"
          :class="['tier-card', 'card-hover', t.popular ? 'tier-popular' : '']"
        >
          <!-- Popular badge -->
          <div v-if="t.popular" class="popular-badge">Популярный</div>

          <div class="tier-header">
            <div class="tier-name">{{ t.name }}</div>
            <div class="tier-desc">{{ t.desc }}</div>
          </div>

          <div class="tier-price">
            <span class="price-amount">{{ t.price[billing] }}</span>
            <span class="price-period">{{ t.price[billing] > 0 ? t.period : '/ навсегда' }}</span>
          </div>

          <div class="tier-divider"></div>

          <div class="tier-features">
            <div v-for="f in t.features" :key="f.text" class="tier-feature">
              <svg v-if="f.ok" width="14" height="14" viewBox="0 0 24 24" fill="none" :stroke="t.popular ? '#a78bfa' : '#7c3aed'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px;">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-subtle)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 1px; opacity: 0.4;">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span :style="{ color: f.ok ? 'var(--fg-muted)' : 'var(--fg-subtle)', opacity: f.ok ? 1 : 0.5 }">{{ f.text }}</span>
            </div>
          </div>

          <button @click="handlePurchase(t.id)" :class="['tier-cta', t.popular ? 'btn-primary' : 'btn-ghost']" style="width: 100%; padding: 12px;">
            {{ t.cta }}
          </button>
        </div>
      </div>

      <!-- Footer note -->
      <div class="pricing-note animate-fade-in-2">
        <span>★ Ежемесячная подписка. Отмена в один клик.</span>
        <span>Оплата: карта · СБП · Telegram Stars</span>
      </div>
    </div>

    <!-- Footer -->
    <footer class="pricing-footer">
      <router-link to="/" class="footer-logo">
        <div class="logo-box-sm">M</div>
        <span>Morgan AI</span>
      </router-link>
      <div class="footer-links">
        <router-link to="/legal" class="footer-link">Политика конфиденциальности</router-link>
        <router-link to="/legal/oferta" class="footer-link">Оферта</router-link>
        <router-link to="/legal/refund" class="footer-link">Возврат средств</router-link>
        <span class="footer-copy">© 2026 Morgan AI</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.pricing-root {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
.pricing-nav {
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
  width: 30px;
  height: 30px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
}
.logo-box-sm {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  color: #fff;
}
.logo-text {
  font-weight: 600;
  font-size: 16px;
  color: var(--fg);
}
.pricing-content {
  padding: 48px 48px 0;
  max-width: 1100px;
  margin: 0 auto;
}
.pricing-heading-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 40px;
}
.section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--fg-subtle);
}
.pricing-heading {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: clamp(36px, 5vw, 64px);
  letter-spacing: -0.03em;
  line-height: 1.0;
  color: var(--fg);
}
.gradient-text {
  background: linear-gradient(135deg, #c4b5fd 0%, #e879f9 50%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.billing-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.toggle-btn {
  padding: 7px 18px;
  border: none;
  background: transparent;
  color: var(--fg-subtle);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
}
.toggle-btn.active {
  background: rgb(124 58 237 / 0.2);
  color: var(--accent-soft);
}

.tiers-grid {
  display: grid;
  grid-template-columns: 1fr 1.1fr 1fr;
  gap: 16px;
  align-items: flex-start;
}
.tier-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 28px;
  position: relative;
  transition: all 0.2s;
}
.tier-popular {
  border-color: rgb(124 58 237 / 0.4) !important;
  box-shadow: 0 0 48px -8px rgb(124 58 237 / 0.4);
}
.tier-popular:hover {
  box-shadow: 0 0 56px -8px rgb(124 58 237 / 0.6) !important;
}
.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 14px;
  border-radius: var(--radius-2xl);
  white-space: nowrap;
  box-shadow: 0 4px 16px -4px rgb(124 58 237 / 0.5);
}
.tier-header { margin-bottom: 20px; }
.tier-name {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: var(--fg);
}
.tier-desc {
  font-size: 13px;
  color: var(--fg-muted);
  margin-top: 4px;
}
.tier-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 20px;
}
.price-amount {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 48px;
  letter-spacing: -0.04em;
  color: var(--fg);
  line-height: 1;
}
.price-period {
  font-size: 13px;
  color: var(--fg-muted);
}
.tier-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 20px;
}
.tier-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.tier-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.4;
}
.tier-cta {
  display: block;
  text-align: center;
}

.pricing-note {
  margin-top: 28px;
  padding-bottom: 40px;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  flex-wrap: wrap;
  gap: 8px;
}

.pricing-footer {
  border-top: 1px solid var(--border);
  padding: 20px 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.footer-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  color: var(--fg-muted);
}
.footer-links {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-link {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-subtle);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-link:hover { color: var(--fg-muted); }
.footer-copy {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-subtle);
}

@media (max-width: 768px) {
  .pricing-nav { padding: 0 16px; }
  .pricing-content { padding: 32px 16px 0; }
  .tiers-grid { grid-template-columns: 1fr; gap: 16px; }
  .pricing-footer { padding: 20px 16px; }
  .pricing-note { flex-direction: column; gap: 6px; }
}
</style>
