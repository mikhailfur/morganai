<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import Card   from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'

const auth    = useAuthStore()
const billing = ref<'monthly' | 'yearly'>('monthly')

const tiers = [
  {
    id: 'free',
    name: 'Базовый',
    price: { monthly: 0, yearly: 0 },
    period: '/ навсегда',
    desc: 'Попробуй без обязательств',
    features: [
      { text: '50 сообщений в день',  ok: true  },
      { text: '3 базовых персонажа',  ok: true  },
      { text: 'Текстовый чат',        ok: true  },
      { text: 'История 30 дней',      ok: true  },
      { text: 'Голосовые ответы',     ok: false },
      { text: 'NSFW режим',           ok: false },
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
      { text: 'Безлимит сообщений',    ok: true },
      { text: 'Все персонажи',         ok: true },
      { text: 'Голос (20 / 5 часов)', ok: true },
      { text: 'NSFW режим (18+)',      ok: true },
      { text: 'Vision · фото',        ok: true },
      { text: 'Память навсегда',       ok: true },
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
      { text: 'Всё из Premium',                ok: true },
      { text: 'Безлимит голоса',               ok: true },
      { text: 'Контекст 100к токенов',         ok: true },
      { text: 'Приоритетная генерация',        ok: true },
      { text: 'Эксклюзивные персонажи',        ok: true },
      { text: 'Ранний доступ к новому',        ok: true },
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
  <div class="min-h-screen relative z-10">

    <!-- NAV -->
    <nav class="sticky top-0 z-50 flex items-center justify-between
                h-14 px-6 md:px-12
                border-b border-[var(--border)]
                bg-[#090514]/80 backdrop-blur-md">
      <router-link to="/" class="flex items-center gap-2.5 no-underline">
        <div class="flex size-8 items-center justify-center rounded-[8px]
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-white font-bold text-sm">M</div>
        <span class="font-semibold text-[var(--fg)] text-[15px]">Morgan AI</span>
      </router-link>
      <router-link v-if="auth.isAuthenticated" to="/chat"
        class="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors no-underline">
        ← В чат
      </router-link>
      <router-link v-else to="/login"
        class="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors no-underline">
        Войти
      </router-link>
    </nav>

    <div class="max-w-5xl mx-auto px-6 md:px-12 pt-12 pb-16">

      <!-- Heading -->
      <div class="flex flex-col gap-4 mb-12 animate-fade-in">
        <div class="font-mono text-[11px] tracking-[0.16em] uppercase text-[var(--fg-subtle)]">
          Тарифы
        </div>
        <h1 class="font-bold text-[clamp(36px,5vw,64px)] tracking-[-0.03em] leading-[1.0] text-[var(--fg)]">
          Выбери свой<br />
          <span class="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300
                       bg-clip-text text-transparent">путь</span>
        </h1>

        <!-- Billing toggle -->
        <div class="flex overflow-hidden border border-[var(--border)] rounded-[8px] w-fit">
          <button
            @click="billing = 'monthly'"
            class="px-4 py-2 font-mono text-[11px] tracking-[0.08em] uppercase border-none cursor-pointer transition-all duration-200"
            :class="billing === 'monthly'
              ? 'bg-violet-500/20 text-[var(--accent-soft)]'
              : 'bg-transparent text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
          >Помесячно</button>
          <button
            @click="billing = 'yearly'"
            class="px-4 py-2 font-mono text-[11px] tracking-[0.08em] uppercase border-none cursor-pointer transition-all duration-200"
            :class="billing === 'yearly'
              ? 'bg-violet-500/20 text-[var(--accent-soft)]'
              : 'bg-transparent text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
          >Ежегодно · −20%</button>
        </div>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start animate-fade-in">
        <div
          v-for="t in tiers" :key="t.id"
          class="relative rounded-[14px] border p-7 transition-all duration-200"
          :class="t.popular
            ? 'bg-[var(--surface)] border-violet-500/40 shadow-[0_0_48px_-8px_rgb(124_58_237_/_0.5)] hover:shadow-[0_0_64px_-8px_rgb(124_58_237_/_0.7)]'
            : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)] hover:shadow-[0_0_24px_-8px_rgb(124_58_237_/_0.2)]'"
        >
          <!-- Popular badge -->
          <div v-if="t.popular"
               class="absolute -top-3 left-1/2 -translate-x-1/2
                      bg-gradient-to-r from-violet-600 to-indigo-600
                      text-white font-mono text-[10px] font-semibold tracking-[0.1em]
                      uppercase px-3.5 py-1 rounded-full whitespace-nowrap
                      shadow-[0_4px_16px_-4px_rgb(124_58_237_/_0.5)]">
            Популярный
          </div>

          <div class="mb-5">
            <div class="font-bold text-[22px] tracking-[-0.02em] text-[var(--fg)]">{{ t.name }}</div>
            <div class="text-[13px] text-[var(--fg-muted)] mt-1">{{ t.desc }}</div>
          </div>

          <div class="flex items-baseline gap-1.5 mb-5">
            <span class="font-bold text-[48px] tracking-[-0.04em] text-[var(--fg)] leading-none">
              {{ t.price[billing] }}
            </span>
            <span class="text-[13px] text-[var(--fg-muted)]">
              {{ t.price[billing] > 0 ? t.period : '/ навсегда' }}
            </span>
          </div>

          <div class="h-px bg-[var(--border)] mb-5"></div>

          <div class="flex flex-col gap-2.5 mb-6">
            <div v-for="f in t.features" :key="f.text" class="flex items-start gap-2.5 text-[13px] leading-[1.4]">
              <svg v-if="f.ok" width="14" height="14" viewBox="0 0 24 24" fill="none"
                   :stroke="t.popular ? '#a78bfa' : '#7c3aed'"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                   class="shrink-0 mt-px">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke="var(--fg-subtle)" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round"
                   class="shrink-0 mt-px opacity-40">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span :class="f.ok ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)] opacity-50'">
                {{ f.text }}
              </span>
            </div>
          </div>

          <Button
            @click="handlePurchase(t.id)"
            :variant="t.popular ? 'primary' : 'ghost'"
            size="md"
            class="w-full"
          >
            {{ t.cta }}
          </Button>
        </div>
      </div>

      <!-- Footer note -->
      <div class="mt-8 flex flex-wrap justify-between gap-2
                  font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--fg-subtle)]">
        <span>★ Ежемесячная подписка. Отмена в один клик.</span>
        <span>Оплата: карта · СБП · Telegram Stars</span>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-[var(--border)] px-6 md:px-12 py-5
                   flex flex-wrap items-center justify-between gap-3">
      <router-link to="/" class="flex items-center gap-2 no-underline">
        <div class="flex size-6 items-center justify-center rounded-[6px]
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-white font-bold text-[11px]">M</div>
        <span class="font-semibold text-sm text-[var(--fg-muted)]">Morgan AI</span>
      </router-link>
      <div class="flex flex-wrap gap-4">
        <router-link to="/legal" class="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] no-underline transition-colors">
          Политика конфиденциальности
        </router-link>
        <router-link to="/legal/oferta" class="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] no-underline transition-colors">
          Оферта
        </router-link>
        <router-link to="/legal/refund" class="font-mono text-[10px] tracking-[0.08em] uppercase text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] no-underline transition-colors">
          Возврат средств
        </router-link>
        <span class="font-mono text-[10px] text-[var(--fg-subtle)]">© 2026 Morgan AI</span>
      </div>
    </footer>
  </div>
</template>
