<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import Button from '../components/ui/Button.vue'
import Input  from '../components/ui/Input.vue'
import Card   from '../components/ui/Card.vue'

const router = useRouter()
const auth   = useAuthStore()
const chat   = useChatStore()

const search         = ref('')
const activeCategory = ref('Все')

const categories = ['Все', 'Романтика', 'Фэнтези', 'Аниме', 'Психология', 'Учёба', 'Бизнес', 'Приключения']

const features = [
  {
    icon: '🧠',
    title: 'Умные персонажи',
    desc: 'Каждый персонаж имеет уникальную личность, стиль речи и историю. AI адаптируется к вашему общению.',
  },
  {
    icon: '🔊',
    title: 'Голосовые ответы',
    desc: 'Персонажи говорят. Реалистичный TTS-движок передаёт интонации и характер.',
  },
  {
    icon: '🖼️',
    title: 'Анализ изображений',
    desc: 'Отправляйте фото — персонаж видит и реагирует. Учёба, творчество, игра.',
  },
  {
    icon: '🔒',
    title: 'Приватность',
    desc: 'Все диалоги хранятся только у вас. Мы не читаем ваши переписки.',
  },
]

const plans = [
  {
    id: 'free',
    name: 'Бесплатно',
    price: '0',
    period: '',
    features: ['50 сообщений в день', '2 каноничных персонажа', 'Базовый контекст', 'Создание персонажей'],
    cta: 'Начать бесплатно',
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '299',
    period: '/мес',
    features: ['500 сообщений в день', 'Все персонажи', 'Голосовые ответы', 'NSFW-режим', 'Расширенный контекст'],
    cta: 'Выбрать Premium',
    highlight: true,
  },
  {
    id: 'premium_plus',
    name: 'Premium+',
    price: '599',
    period: '/мес',
    features: ['Безлимит голоса', '100k токенов контекста', 'Приоритетный доступ', 'Ранний доступ к фичам'],
    cta: 'Выбрать Premium+',
    highlight: false,
  },
]

onMounted(async () => {
  if (auth.isAuthenticated) { router.push('/chat'); return }
  if (chat.characters.length === 0) await chat.fetchCharacters()
})

function goToChat() {
  router.push(auth.isAuthenticated ? '/chat' : '/register')
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[#090514] text-[var(--fg)]">

    <!-- ─── Navbar ─────────────────────────────────────────────────── -->
    <header class="sticky top-0 z-40 border-b border-violet-500/10 bg-[#090514]/80 backdrop-blur-md">
      <nav class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">

        <!-- Logo -->
        <a href="/" class="flex items-center gap-2.5 shrink-0">
          <div class="flex size-8 items-center justify-center rounded-[8px]
                      bg-gradient-to-br from-violet-600 to-indigo-600
                      text-white text-sm font-bold shadow-[0_4px_12px_-4px_rgb(124_58_237_/_0.6)]">
            M
          </div>
          <span class="text-sm font-semibold text-[var(--fg)] tracking-tight">Morgan AI</span>
        </a>

        <!-- Desktop links -->
        <div class="hidden md:flex items-center gap-1">
          <a href="#features"
             class="px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]
                    rounded-[8px] hover:bg-[var(--surface-2)] transition-colors duration-150">
            Возможности
          </a>
          <a href="#pricing"
             class="px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]
                    rounded-[8px] hover:bg-[var(--surface-2)] transition-colors duration-150">
            Тарифы
          </a>
          <router-link to="/legal"
             class="px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]
                    rounded-[8px] hover:bg-[var(--surface-2)] transition-colors duration-150">
            Документы
          </router-link>
        </div>

        <!-- Auth buttons -->
        <div class="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" @click="goToLogin">Войти</Button>
          <Button variant="primary" size="sm" @click="goToChat">Начать бесплатно</Button>
        </div>
      </nav>
    </header>

    <!-- ─── Hero ───────────────────────────────────────────────────── -->
    <section class="relative mx-auto max-w-6xl px-4 pt-20 pb-16 text-center md:pt-28 md:pb-24">

      <!-- Ambient glow -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden">
        <div class="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2
                    rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <!-- Badge -->
      <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20
                  bg-violet-500/5 px-4 py-1.5 text-xs font-mono tracking-widest
                  text-violet-400 uppercase">
        <span class="size-1.5 rounded-full bg-violet-400 animate-pulse" />
        18+ · AI Role-Play Platform
      </div>

      <!-- Headline -->
      <h1 class="mb-5 text-4xl font-semibold tracking-[-0.03em] leading-[1.15] md:text-6xl lg:text-7xl">
        Живые персонажи,<br />
        <span class="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300
                     bg-clip-text text-transparent">
          настоящий диалог
        </span>
      </h1>

      <p class="mx-auto mb-8 max-w-xl text-base text-[var(--fg-muted)] leading-relaxed md:text-lg">
        Общайтесь с уникальными AI-персонажами. Учёба, творчество, ролевые игры —
        или просто интересный разговор.
      </p>

      <!-- CTAs -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
        <Button variant="primary" size="lg" @click="goToChat">Начать бесплатно</Button>
        <Button variant="ghost" size="lg" @click="goToLogin">Уже есть аккаунт</Button>
      </div>

      <!-- Stats -->
      <div class="flex items-center justify-center gap-8 text-center">
        <div>
          <div class="text-2xl font-semibold text-[var(--fg)]">10+</div>
          <div class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase">Персонажей</div>
        </div>
        <div class="h-8 w-px bg-[var(--border)]" />
        <div>
          <div class="text-2xl font-semibold text-[var(--fg)]">100%</div>
          <div class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase">Приватно</div>
        </div>
        <div class="h-8 w-px bg-[var(--border)]" />
        <div>
          <div class="text-2xl font-semibold text-[var(--fg)]">Free</div>
          <div class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase">Старт</div>
        </div>
      </div>
    </section>

    <!-- ─── Characters ─────────────────────────────────────────────── -->
    <section class="mx-auto max-w-6xl px-4 pb-20">

      <!-- Search -->
      <div class="mb-5">
        <Input v-model="search" placeholder="Найти персонажа..." class="max-w-sm" />
      </div>

      <!-- Category tags -->
      <div class="mb-6 flex gap-2 overflow-x-auto pb-1" style="scrollbar-width:none">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="activeCategory = cat"
          class="shrink-0 px-4 py-1.5 rounded-full text-sm font-mono
                 tracking-wider uppercase transition-all duration-150 border whitespace-nowrap"
          :class="activeCategory === cat
            ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
            : 'bg-transparent border-[var(--border)] text-[var(--fg-subtle)] hover:border-[var(--border-hover)] hover:text-[var(--fg)]'"
        >{{ cat }}</button>
      </div>

      <!-- Characters grid -->
      <div v-if="chat.characters.length > 0"
           class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          v-for="c in chat.characters"
          :key="c.slug"
          class="text-left overflow-hidden rounded-[14px] border border-[var(--border)]
                 bg-[var(--surface)] transition-all duration-200
                 hover:border-violet-500/30 hover:bg-[var(--surface-2)]
                 hover:shadow-[0_0_32px_-4px_rgb(124_58_237_/_0.3)]"
          @click="goToChat"
        >
          <!-- Avatar -->
          <div class="relative h-40 bg-gradient-to-br from-violet-900/50 to-indigo-900/50
                      flex items-center justify-center overflow-hidden">
            <img
              v-if="c.avatar_url"
              :src="c.avatar_url"
              :alt="c.name"
              class="h-full w-full object-cover object-top"
            />
            <div
              v-else
              class="flex size-20 items-center justify-center rounded-full
                     bg-gradient-to-br from-violet-600 to-indigo-600
                     text-3xl font-bold text-white"
            >{{ c.name[0] }}</div>
            <div v-if="c.is_premium"
                 class="absolute top-2 right-2 rounded-full bg-violet-600/80
                        px-2 py-0.5 text-[10px] font-mono tracking-wider text-white uppercase">
              ✦ Premium
            </div>
          </div>
          <!-- Info -->
          <div class="p-3">
            <div class="mb-1 text-sm font-semibold text-[var(--fg)]">{{ c.name }}</div>
            <p class="text-xs text-[var(--fg-muted)] line-clamp-2 leading-relaxed">{{ c.description }}</p>
          </div>
        </button>
      </div>

      <!-- Loading skeleton -->
      <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div v-for="i in 5" :key="i"
             class="rounded-[14px] border border-[var(--border)] overflow-hidden animate-pulse">
          <div class="h-40 bg-[var(--surface-2)]" />
          <div class="p-3 space-y-2">
            <div class="h-3.5 w-24 rounded bg-[var(--surface-3)]" />
            <div class="h-3 w-full rounded bg-[var(--surface-3)]" />
            <div class="h-3 w-3/4 rounded bg-[var(--surface-3)]" />
          </div>
        </div>
      </div>

      <!-- CTA under grid -->
      <div class="mt-10 text-center">
        <Button variant="primary" size="lg" @click="goToChat">Начать общение →</Button>
        <p class="mt-3 text-xs text-[var(--fg-subtle)]">Бесплатно · Без кредитной карты</p>
      </div>
    </section>

    <!-- ─── Features ───────────────────────────────────────────────── -->
    <section id="features" class="border-t border-[var(--border)] py-20">
      <div class="mx-auto max-w-6xl px-4">
        <div class="mb-12 text-center">
          <div class="mb-3 inline-block text-xs font-mono tracking-widest uppercase text-violet-400">
            Возможности
          </div>
          <h2 class="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Всё для живого общения</h2>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card v-for="f in features" :key="f.title" variant="raised" padding="md">
            <div class="mb-3 text-3xl">{{ f.icon }}</div>
            <h3 class="mb-2 text-sm font-semibold text-[var(--fg)]">{{ f.title }}</h3>
            <p class="text-xs text-[var(--fg-muted)] leading-relaxed">{{ f.desc }}</p>
          </Card>
        </div>
      </div>
    </section>

    <!-- ─── Pricing ────────────────────────────────────────────────── -->
    <section id="pricing" class="border-t border-[var(--border)] py-20">
      <div class="mx-auto max-w-5xl px-4">
        <div class="mb-12 text-center">
          <div class="mb-3 inline-block text-xs font-mono tracking-widest uppercase text-violet-400">
            Тарифы
          </div>
          <h2 class="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Простые цены</h2>
        </div>
        <div class="grid gap-6 md:grid-cols-3">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="relative flex flex-col rounded-[14px] border p-6 transition-all duration-200"
            :class="plan.highlight
              ? 'border-violet-500/40 bg-violet-500/5 shadow-[0_0_48px_-8px_rgb(124_58_237_/_0.3)]'
              : 'border-[var(--border)] bg-[var(--surface)]'"
          >
            <div v-if="plan.highlight"
                 class="absolute -top-3 left-1/2 -translate-x-1/2
                        rounded-full bg-gradient-to-r from-violet-600 to-indigo-600
                        px-4 py-1 text-[11px] font-semibold text-white whitespace-nowrap
                        shadow-[0_4px_16px_-4px_rgb(124_58_237_/_0.6)]">
              Популярный
            </div>
            <div class="mb-4">
              <div class="text-sm font-mono tracking-wider uppercase text-[var(--fg-subtle)]">{{ plan.name }}</div>
              <div class="mt-2 flex items-end gap-1">
                <span class="text-4xl font-semibold text-[var(--fg)]">{{ plan.price }}₽</span>
                <span class="mb-1 text-sm text-[var(--fg-muted)]">{{ plan.period }}</span>
              </div>
            </div>
            <ul class="mb-6 flex-1 space-y-2">
              <li v-for="feat in plan.features" :key="feat"
                  class="flex items-center gap-2 text-sm text-[var(--fg-muted)]">
                <svg class="size-4 shrink-0 text-violet-400" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                {{ feat }}
              </li>
            </ul>
            <Button :variant="plan.highlight ? 'primary' : 'ghost'" size="md" class="w-full" @click="goToChat">
              {{ plan.cta }}
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Footer ────────────────────────────────────────────────── -->
    <footer class="border-t border-[var(--border)] py-10">
      <div class="mx-auto max-w-6xl px-4">
        <div class="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div class="flex items-center gap-2.5">
            <div class="flex size-7 items-center justify-center rounded-[6px]
                        bg-gradient-to-br from-violet-600 to-indigo-600
                        text-white text-xs font-bold">M</div>
            <span class="text-sm font-semibold text-[var(--fg-muted)]">Morgan AI</span>
          </div>
          <div class="flex items-center gap-6 text-sm text-[var(--fg-subtle)]">
            <router-link to="/legal" class="hover:text-[var(--fg)] transition-colors duration-150">Документы</router-link>
            <router-link to="/pricing" class="hover:text-[var(--fg)] transition-colors duration-150">Тарифы</router-link>
          </div>
          <div class="text-xs text-[var(--fg-subtle)] font-mono">
            © {{ new Date().getFullYear() }} Morgan AI · 18+
          </div>
        </div>
      </div>
    </footer>

  </div>
</template>
