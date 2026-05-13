<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const particles = ref<{ x: number; y: number; delay: number; duration: number }[]>([])

onMounted(() => {
  if (auth.isAuthenticated) { router.push('/chat'); return }
  // Generate particles
  for (let i = 0; i < 30; i++) {
    particles.value.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
    })
  }
})

const features = [
  { icon: '💬', title: 'Ролевой чат', desc: 'Глубокие диалоги с уникальными AI-персонажами' },
  { icon: '🎤', title: 'Голосовые', desc: 'Записывай и получай голосовые сообщения' },
  { icon: '📷', title: 'Фото', desc: 'Отправляй изображения для анализа и обсуждения' },
  { icon: '🎭', title: 'Режимы', desc: 'Учёба, работа, психолог и другие' },
]
</script>

<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Particles Background -->
    <div class="particles-bg">
      <div
        v-for="(p, i) in particles" :key="i"
        class="particle"
        :style="{
          left: p.x + '%',
          bottom: '-5%',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
          width: (3 + Math.random() * 4) + 'px',
          height: (3 + Math.random() * 4) + 'px',
        }"
      />
    </div>

    <!-- Gradient Orbs -->
    <div class="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
    <div class="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg">M</div>
        <span class="text-xl font-bold gradient-text">Morgan AI</span>
      </div>
      <div class="flex gap-3">
        <router-link to="/login" class="btn-ghost text-sm">Войти</router-link>
        <router-link to="/register" class="btn-primary text-sm">Начать</router-link>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="relative z-10 flex flex-col items-center text-center px-6 pt-16 md:pt-24 pb-20">
      <div class="animate-fade-in">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
          <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          AI-компаньон нового поколения
        </div>
      </div>

      <h1 class="text-5xl md:text-7xl font-extrabold leading-tight mb-6 animate-fade-in-delay-1">
        Погрузись в мир<br/>
        <span class="gradient-text">ролевых игр</span>
        <span class="text-purple-300"> с ИИ</span>
      </h1>

      <p class="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 animate-fade-in-delay-2">
        Общайся с уникальными персонажами, отправляй голосовые и фото,
        выбирай режимы поведения. Morgan AI — это ролевые игры с душой.
      </p>

      <div class="flex gap-4 animate-fade-in-delay-3">
        <router-link to="/register" class="btn-primary text-lg px-8 py-4">
          🚀 Начать бесплатно
        </router-link>
        <a href="#features" class="btn-ghost text-lg px-8 py-4">
          Узнать больше ↓
        </a>
      </div>

      <!-- Chat Preview Mockup -->
      <div class="mt-16 w-full max-w-2xl glass-card p-6 animate-fade-in-delay-3">
        <div class="flex flex-col gap-4">
          <div class="flex justify-start">
            <div class="chat-bubble-ai">
              <p class="text-sm text-purple-300 font-medium mb-1">Морган</p>
              <p>*приподнимает бровь и слегка улыбается*</p>
              <p class="mt-1">О, привет. Рад тебя видеть. Расскажи о себе?</p>
              <p class="text-xs text-slate-500 mt-1">(Интересно, что это за человек...)</p>
            </div>
          </div>
          <div class="flex justify-end">
            <div class="chat-bubble-user">
              <p>Привет, Морган! Меня зовут Алексей</p>
            </div>
          </div>
          <div class="flex justify-start">
            <div class="chat-bubble-ai">
              <p class="text-sm text-purple-300 font-medium mb-1">Морган</p>
              <p>*кивает с одобрением*</p>
              <p class="mt-1">Алексей, значит. Хорошее имя. Ну что, готов к приключениям? 😏</p>
              <p class="text-xs text-slate-500 mt-1">(Кажется, мы подружимся.)</p>
            </div>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-2 bg-[var(--color-surface)] rounded-2xl p-3">
          <input class="flex-1 bg-transparent text-sm outline-none text-slate-300 placeholder:text-slate-600" placeholder="Напиши сообщение..." disabled />
          <button class="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm" disabled>↑</button>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="relative z-10 px-6 md:px-12 py-20">
      <h2 class="text-3xl md:text-4xl font-bold text-center mb-12">
        Всё что нужно для <span class="gradient-text">RP</span>
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <div v-for="f in features" :key="f.title" class="glass-card p-6 text-center">
          <div class="text-4xl mb-4">{{ f.icon }}</div>
          <h3 class="text-lg font-semibold mb-2">{{ f.title }}</h3>
          <p class="text-slate-400 text-sm">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative z-10 px-6 py-20 text-center">
      <div class="glass-card max-w-3xl mx-auto p-12">
        <h2 class="text-3xl font-bold mb-4">Готов начать?</h2>
        <p class="text-slate-400 mb-8">Регистрация бесплатна. Начни общаться с Морганом прямо сейчас.</p>
        <router-link to="/register" class="btn-primary text-lg px-10 py-4">Создать аккаунт</router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-white/5 px-6 py-8 text-center text-slate-500 text-sm">
      <p>© 2026 Morgan AI. Создано с ❤️</p>
    </footer>
  </div>
</template>
