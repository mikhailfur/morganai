<template>
  <div class="min-h-screen bg-claude-bg">
    <!-- Header -->
    <header class="border-b border-claude-border bg-claude-surface/80 backdrop-blur-md sticky top-0 z-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">✨</span>
          <h1 class="text-xl font-semibold tracking-tight text-claude-text">
            Morgan AI
          </h1>
        </div>
        <div class="flex items-center gap-3">
          <span
            v-if="characterStore.isPremium"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
          >
            🏆 Premium
          </span>
          <button class="btn-ghost text-sm">
            Профиль
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <!-- Hero -->
      <div class="mb-10 animate-fade-in">
        <h2 class="text-3xl sm:text-4xl font-bold text-claude-text mb-3 tracking-tight">
          Твои ИИ-персонажи
        </h2>
        <p class="text-claude-muted text-lg max-w-xl leading-relaxed">
          Создавай уникальных собеседников с разными характерами, голосами и стилями общения.
        </p>
      </div>

      <!-- Characters Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="character in characterStore.characters"
          :key="character.id"
          class="card-claude p-4 animate-slide-up cursor-pointer group relative overflow-hidden"
          @click="characterStore.selectCharacter(character)"
        >
          <!-- Premium badge for NSFW -->
          <div
            v-if="character.behavior_mode === 'nsfw' && !characterStore.isPremium"
            class="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
          >
            <span class="text-3xl">🔒</span>
            <span class="text-sm font-medium text-claude-muted">Premium</span>
          </div>

          <div class="flex items-start gap-4">
            <img
              :src="character.avatar_url"
              :alt="character.name"
              class="w-14 h-14 rounded-xl object-cover border border-claude-border shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold text-claude-text truncate">
                  {{ character.name }}
                </h3>
                <span
                  v-if="character.is_default"
                  class="text-[10px] uppercase font-semibold tracking-wider text-claude-accent bg-claude-accent/10 px-1.5 py-0.5 rounded-md"
                >
                  default
                </span>
              </div>
              <p class="text-sm text-claude-muted line-clamp-2 leading-snug">
                {{ character.description }}
              </p>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border"
                  :class="modeBadgeClass(character.behavior_mode)"
                >
                  {{ modeLabel(character.behavior_mode) }}
                </span>
                <span
                  v-if="characterStore.selectedCharacter?.id === character.id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  ✓ Активен
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Card -->
        <button
          class="card-claude p-4 flex flex-col items-center justify-center gap-3 min-h-[140px] group hover:border-claude-accent/40"
          @click="isCreating = true"
        >
          <span class="text-3xl text-claude-muted group-hover:text-claude-accent transition-colors duration-200">
            +
          </span>
          <span class="text-sm font-medium text-claude-muted group-hover:text-claude-accent transition-colors">
            Создать персонажа
          </span>
        </button>
      </div>

      <!-- Selected Character Detail (Demo) -->
      <div
        v-if="characterStore.selectedCharacter"
        class="mt-12 animate-slide-up"
      >
        <div class="card-claude p-6 sm:p-8">
          <div class="flex flex-col sm:flex-row sm:items-start gap-6">
            <img
              :src="characterStore.selectedCharacter.avatar_url"
              class="w-24 h-24 rounded-2xl object-cover border border-claude-border shadow-sm self-start"
            />
            <div class="flex-1">
              <h3 class="text-2xl font-bold text-claude-text mb-2">
                {{ characterStore.selectedCharacter.name }}
              </h3>
              <p class="text-claude-muted mb-6 leading-relaxed">
                {{ characterStore.selectedCharacter.description }}
              </p>
              <div class="flex flex-wrap gap-3">
                <button class="btn-primary">
                  Начать диалог
                </button>
                <button class="btn-ghost border border-claude-border">
                  Настройки
                </button>
                <button
                  v-if="!characterStore.selectedCharacter.is_default"
                  class="btn-ghost text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent"
                  @click="characterStore.removeCharacter(characterStore.selectedCharacter.id)"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Subscription Promo -->
      <div
        v-if="!characterStore.isPremium"
        class="mt-12 animate-fade-in"
      >
        <div
          class="relative overflow-hidden rounded-2xl border border-claude-border bg-gradient-to-br from-amber-50/80 to-orange-50/80 p-6 sm:p-8"
        >
          <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl"></div>
          <div class="relative">
            <h3 class="text-lg font-semibold text-claude-text mb-2">
              Разблокируй весь потенциал Morgan AI
            </h3>
            <p class="text-claude-muted mb-4 max-w-lg text-sm leading-relaxed">
              Premium открывает голосовые сообщения, фото, NSFW-режимы и персонализированные инициативные сообщения.
            </p>
            <div class="flex flex-wrap gap-3">
              <span class="inline-flex items-center gap-1.5 text-xs text-claude-muted bg-white/60 border border-claude-border rounded-lg px-3 py-1.5">
                🎙️ Голос
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-claude-muted bg-white/60 border border-claude-border rounded-lg px-3 py-1.5">
                📸 Фото & Видео
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-claude-muted bg-white/60 border border-claude-border rounded-lg px-3 py-1.5">
                💬 Инициативные сообщения
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-claude-muted bg-white/60 border border-claude-border rounded-lg px-3 py-1.5">
                18+ Режимы
              </span>
            </div>
            <button class="mt-6 btn-primary">
              Оформить Premium — от $4.99
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCharacterStore } from '../stores/characterStore.js'

const characterStore = useCharacterStore()
const isCreating = ref(false)

const modeLabels = {
  study: 'Учёба',
  work: 'Работа',
  psychologist: 'Психолог',
  nsfw: 'NSFW',
}

function modeLabel(mode) {
  return modeLabels[mode] || mode
}

const modeBadgeMap = {
  study: 'bg-blue-50 text-blue-700 border-blue-200',
  work: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  psychologist: 'bg-teal-50 text-teal-700 border-teal-200',
  nsfw: 'bg-rose-50 text-rose-700 border-rose-200',
}

function modeBadgeClass(mode) {
  return modeBadgeMap[mode] || 'bg-gray-50 text-gray-600 border-gray-200'
}
</script>
