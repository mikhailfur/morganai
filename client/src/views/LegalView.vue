<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { legalDocs } from '../legal/index'

const route       = useRoute()
const docs        = legalDocs
const activeDocId = ref((route.params.doc as string) || 'privacy')
const activeDoc   = computed(() => docs.find(d => d.id === activeDocId.value) || docs[0])
</script>

<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--fg)] relative z-10">

    <!-- Header -->
    <header class="sticky top-0 z-50 flex items-center justify-between
                   h-14 px-6 md:px-12
                   border-b border-[var(--border)]
                   bg-[#090514]/80 backdrop-blur-md">
      <router-link to="/" class="flex items-center gap-2.5 no-underline">
        <div class="flex size-8 items-center justify-center rounded-[8px]
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-white font-bold text-sm">M</div>
        <span class="font-semibold text-[var(--fg)] text-[15px]">Morgan AI</span>
      </router-link>
      <div class="flex items-center gap-6">
        <router-link to="/" class="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] no-underline transition-colors">
          Главная
        </router-link>
        <a href="mailto:support@morgan.ai" class="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] no-underline transition-colors">
          Поддержка
        </a>
      </div>
    </header>

    <!-- Body -->
    <div class="max-w-[1200px] mx-auto px-6 md:px-12 py-8">

      <!-- Mobile: horizontal doc picker -->
      <div class="flex gap-2 overflow-x-auto pb-3 mb-6 md:hidden" style="scrollbar-width:none">
        <button
          v-for="d in docs" :key="d.id"
          @click="activeDocId = d.id"
          class="shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-mono tracking-wider uppercase
                 border transition-all duration-150 whitespace-nowrap"
          :class="activeDocId === d.id
            ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
            : 'border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
        >
          {{ d.name }}
        </button>
      </div>

      <div class="md:grid md:grid-cols-[240px_1fr_200px] md:gap-10">

        <!-- TOC Sidebar (desktop) -->
        <nav class="hidden md:block">
          <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-3">
            Документы
          </div>
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] overflow-hidden">
            <button
              v-for="d in docs" :key="d.id"
              @click="activeDocId = d.id"
              class="flex items-start gap-2.5 w-full px-3.5 py-3 text-left
                     border-0 border-t border-[var(--border)] cursor-pointer
                     transition-all duration-150 first:border-t-0"
              :class="activeDocId === d.id
                ? 'bg-violet-500/12 text-[var(--accent-soft)]'
                : 'bg-transparent text-[var(--fg-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]'"
            >
              <span class="font-mono text-[10px] tracking-[0.1em] opacity-60 mt-0.5 shrink-0">{{ d.num }}</span>
              <div>
                <div class="text-[13px] font-medium leading-[1.3]">{{ d.name }}</div>
                <div class="font-mono text-[9px] tracking-[0.08em] uppercase opacity-50 mt-0.5">{{ d.version }}</div>
              </div>
            </button>
          </div>
        </nav>

        <!-- Document content -->
        <div class="max-w-[620px]">
          <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--fg-subtle)] mb-3">
            {{ activeDoc.num }} — Документ
          </div>
          <h1 class="font-bold text-[clamp(28px,4vw,48px)] tracking-[-0.03em] text-[var(--fg)] mb-2 leading-tight">
            {{ activeDoc.heading }}
          </h1>
          <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--fg-subtle)]">
            Обновлено {{ activeDoc.version }}
          </div>
          <div class="h-px bg-[var(--border)] my-5"></div>

          <p class="text-[15px] leading-[1.7] text-[var(--fg-muted)] mb-8">
            Привет. Это не типичный документ. Мы — Morgan AI — стараемся писать понятно.
            <span class="bg-violet-500/20 text-[var(--accent-soft)] px-1.5 py-px rounded-[4px] font-medium">Коротко:</span>
            {{ activeDoc.summary }}
          </p>

          <div v-for="s in activeDoc.sections" :key="s.sym" class="mt-7">
            <h2 class="font-semibold text-[18px] tracking-[-0.01em] text-[var(--accent-soft)] mb-2.5">
              {{ s.sym }} — {{ s.title }}
            </h2>
            <p class="text-[15px] leading-[1.65] text-zinc-300">{{ s.text }}</p>
          </div>
        </div>

        <!-- Right aside (desktop) -->
        <aside class="hidden md:block">
          <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4 mb-5">
            <div class="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--accent-soft)] font-bold mb-2">
              Кратко
            </div>
            <p class="text-[13px] leading-[1.5] text-[var(--fg-muted)] italic">
              {{ activeDoc.summary }}
            </p>
          </div>
          <div class="h-px bg-[var(--border)] mb-4"></div>
          <div class="font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--fg-subtle)] mb-1.5">
            Вопросы?
          </div>
          <a href="mailto:privacy@morgan.ai"
             class="text-[14px] text-[var(--accent-soft)] underline underline-offset-2">
            privacy@morgan.ai
          </a>
        </aside>
      </div>
    </div>
  </div>
</template>
