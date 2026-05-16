<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'

const theme = useThemeStore()
const auth = useAuthStore()
const billing = ref<'monthly' | 'yearly'>('monthly')

const tiers = [
  {
    id: 'free',
    sym: 'I',
    kanji: '無',
    name: 'Базовый',
    price: { monthly: 0, yearly: 0 },
    sub: '/ навсегда',
    best: 'Попробовать',
    features: [
      '50 сообщений в день',
      '3 базовых персонажа',
      'Текстовый чат',
      'История 30 дней',
    ],
    cta: 'Начать бесплатно',
    featured: false,
  },
  {
    id: 'premium',
    sym: 'II',
    kanji: '✦',
    name: 'Premium',
    price: { monthly: 299, yearly: 239 },
    sub: '₽ / месяц',
    best: 'Самый популярный',
    features: [
      'Безлимит сообщений',
      'Все персонажи',
      'Голос (20 / 5 часов)',
      'NSFW режим (18+)',
      'Vision · фото',
      'Без рекламы',
      'Память навсегда',
    ],
    cta: 'Оформить Premium',
    featured: true,
  },
  {
    id: 'premium_plus',
    sym: 'III',
    kanji: '極',
    name: 'Premium+',
    price: { monthly: 599, yearly: 479 },
    sub: '₽ / месяц',
    best: 'Максимум',
    features: [
      'Всё из Premium',
      'Безлимит голоса',
      'Расширенный контекст (100к токенов)',
      'Приоритетная генерация',
      'Эксклюзивные персонажи',
      'Ранний доступ к новому',
      'Личный значок в чате',
    ],
    cta: 'Оформить Premium+',
    featured: false,
  },
]

function handlePurchase(tierId: string) {
  if (tierId === 'free') {
    window.location.href = '/register'
  } else {
    alert('Оплата — скоро. Свяжитесь с нами: support@morgan.ai')
  }
}
</script>

<template>
  <div style="min-height: 100vh; background: var(--bg); color: var(--fg);">

    <!-- NAV -->
    <nav style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 48px;
      border-bottom: var(--border);
    ">
      <router-link to="/" style="display: flex; align-items: center; gap: 10px; text-decoration: none;">
        <img :src="'/logo.svg'" alt="Morgan" style="height: 44px; border-radius: 6px; display: block;" />
        <span style="font-family: var(--font-display); font-weight: 600; font-size: 24px; color: var(--accent);">Morgan</span>
      </router-link>
      <div style="display: flex; align-items: center; gap: 10px;">
        <router-link v-if="auth.isAuthenticated" to="/chat" class="btn-ghost btn-sm" style="text-decoration: none;">В чат</router-link>
        <router-link v-else to="/login" class="btn-ghost btn-sm" style="text-decoration: none;">Войти</router-link>
        <button @click="theme.toggle()" class="theme-toggle">{{ theme.isDark ? 'СВЕТ' : 'НОЧЬ' }}</button>
      </div>
    </nav>

    <div style="padding: 40px 48px;">
      <!-- Heading + billing toggle -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px;">
        <div>
          <div class="editorial-label" style="color: var(--accent2);">
            <span style="opacity: 0.55;">III</span>
            ТАРИФЫ · ВЫБОР ПУТИ
          </div>
          <div class="display-heading" style="font-size: clamp(36px, 5vw, 80px); margin-top: 14px;">
            Сколько <span style="font-style: italic; color: var(--accent3);">стоит</span> компания?
          </div>
        </div>

        <!-- Billing toggle -->
        <div style="display: flex; gap: 0; border: var(--border);">
          <button
            @click="billing = 'monthly'"
            :style="{
              padding: '8px 20px',
              background: billing === 'monthly' ? 'var(--accent)' : 'transparent',
              color: billing === 'monthly' ? 'var(--bg)' : 'var(--fg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              fontWeight: billing === 'monthly' ? '700' : '400',
            }"
          >Помесячно</button>
          <button
            @click="billing = 'yearly'"
            :style="{
              padding: '8px 20px',
              background: billing === 'yearly' ? 'var(--accent)' : 'transparent',
              color: billing === 'yearly' ? 'var(--bg)' : 'var(--fg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              border: 'none',
              borderLeft: 'var(--border)',
              cursor: 'pointer',
              fontWeight: billing === 'yearly' ? '700' : '400',
            }"
          >Ежегодно · −20%</button>
        </div>
      </div>

      <!-- Pricing cards -->
      <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 22px; align-items: flex-start;">
        <div
          v-for="t in tiers" :key="t.id"
          :class="['pricing-card', t.featured ? 'featured' : '']"
        >
          <!-- Featured badge -->
          <div v-if="t.featured" style="
            position: absolute;
            top: -14px;
            right: 20px;
            background: var(--accent3);
            color: var(--fg);
            font-family: var(--font-mono);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            padding: 4px 12px;
            border: var(--border);
            transform: rotate(2deg);
          ">{{ t.best }}</div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: var(--accent2); font-weight: 700;">
                {{ t.featured ? t.best.toUpperCase() : 'OP. ' + t.sym }}
              </div>
              <div style="font-family: var(--font-display); font-weight: 600; font-size: 32px; line-height: 1; margin-top: 6px; letter-spacing: -0.5px;">{{ t.name }}</div>
            </div>
            <div style="font-family: var(--font-display); font-weight: 600; font-size: 38px; line-height: 0.8; color: var(--accent3);">{{ t.kanji }}</div>
          </div>

          <!-- Price -->
          <div style="margin-top: 22px; display: flex; align-items: baseline; gap: 8px;">
            <span style="font-family: var(--font-display); font-weight: 200; font-size: 60px; line-height: 0.9; letter-spacing: -2px;">
              {{ t.price[billing] }}
            </span>
            <span style="font-family: var(--font-ui); font-size: 13px; opacity: 0.7;">{{ t.price[billing] > 0 ? t.sub : '/ навсегда' }}</span>
          </div>

          <div style="margin-top: 20px; height: 2px; background: var(--rule); opacity: 0.5;"></div>

          <!-- Features -->
          <div style="margin-top: 18px; display: flex; flex-direction: column; gap: 12px;">
            <div v-for="f in t.features" :key="f" style="display: flex; gap: 10px; align-items: flex-start;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :stroke="t.featured ? 'var(--accent3)' : 'var(--accent)'" stroke-width="2.2" stroke-linecap="round" style="flex-shrink: 0; margin-top: 4px;">
                <path d="M2 7l3.5 3.5L12 3"/>
              </svg>
              <span style="font-family: var(--font-display); font-size: 15px; line-height: 1.35;">{{ f }}</span>
            </div>
          </div>

          <button
            @click="handlePurchase(t.id)"
            style="
              margin-top: 24px;
              width: 100%;
              padding: 14px;
              font-family: var(--font-ui);
              font-weight: 700;
              font-size: 13px;
              letter-spacing: 0.3px;
              cursor: pointer;
              transition: transform 0.15s;
            "
            :style="{
              background: t.featured ? 'var(--bg)' : 'var(--accent)',
              color: t.featured ? 'var(--accent)' : 'var(--bg)',
              border: 'var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }"
          >{{ t.cta }} →</button>
        </div>
      </div>

      <!-- Footer note -->
      <div style="
        margin-top: 36px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        color: var(--fg);
        opacity: 0.55;
        flex-wrap: wrap;
        gap: 12px;
      ">
        <span>★ Ежемесячная подписка. Отмена в один клик.</span>
        <span>Оплата: карта · СБП · Telegram Stars</span>
      </div>
    </div>

    <!-- Footer -->
    <footer style="
      border-top: var(--border);
      padding: 20px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 40px;
    ">
      <router-link to="/" style="font-family: var(--font-display); font-weight: 600; font-size: 16px; color: var(--accent); text-decoration: none;">Morgan 夢</router-link>
      <div style="display: flex; gap: 24px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--fg); opacity: 0.5; flex-wrap: wrap;">
        <router-link to="/legal" style="color: inherit; text-decoration: none; opacity: 0.8;">Политика конфиденциальности</router-link>
        <router-link to="/legal/oferta" style="color: inherit; text-decoration: none; opacity: 0.8;">Оферта</router-link>
        <router-link to="/legal/refund" style="color: inherit; text-decoration: none; opacity: 0.8;">Возврат средств</router-link>
        <span>© 2026 Morgan AI</span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  nav { padding: 16px 20px !important; }
  div[style*="padding: 40px 48px"] { padding: 24px 20px !important; }
  div[style*="grid-template-columns: 1fr 1.15fr 1fr"] {
    grid-template-columns: 1fr !important;
    gap: 20px !important;
  }
  .pricing-card.featured { transform: none !important; }
  footer { padding: 16px 20px !important; }
}
</style>
