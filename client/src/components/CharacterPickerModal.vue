<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import type { UserCharacter } from '../types'
import Modal  from './ui/Modal.vue'
import Button from './ui/Button.vue'
import CharacterEditorModal from './CharacterEditorModal.vue'

const props = defineProps<{
  visible:      boolean
  currentSlug:  string
}>()

const emit = defineEmits<{
  close:  []
  select: [slug: string]
}>()

const chat        = useChatStore()
const activeTab   = ref<'canonical' | 'mine' | 'community'>('canonical')
const showEditor  = ref(false)
const editingChar = ref<UserCharacter | null>(null)

onMounted(async () => {
  if (chat.myCharacters.length === 0)     await chat.fetchMyCharacters()
  if (chat.publicCharacters.length === 0) await chat.fetchPublicCharacters()
})

function selectCanonical(slug: string) {
  emit('select', slug)
  emit('close')
}

function selectUserChar(id: number) {
  emit('select', `uc:${id}`)
  emit('close')
}

function openCreate() {
  editingChar.value = null
  showEditor.value  = true
}

function openEdit(char: UserCharacter) {
  editingChar.value = char
  showEditor.value  = true
}

function onEditorSaved(_char: UserCharacter) { showEditor.value = false }

function onEditorDeleted(id: number) {
  if (props.currentSlug === `uc:${id}`) emit('select', 'morgan')
  showEditor.value = false
}

const tabs = [
  { id: 'canonical',  label: 'Каноничные' },
  { id: 'mine',       label: 'Мои' },
  { id: 'community',  label: 'Сообщество' },
] as const
</script>

<template>
  <!-- Picker -->
  <Modal
    :open="visible && !showEditor"
    title="Персонажи"
    size="md"
    @update:open="val => !val && emit('close')"
    @close="emit('close')"
  >
    <!-- Tab bar (inside body slot, above content) -->
    <template #default>
      <!-- Tabs -->
      <div class="-mx-5 -mt-5 mb-4 flex border-b border-[var(--border)] overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="shrink-0 px-4 py-3 text-xs font-mono tracking-widest uppercase transition-colors duration-150"
          :class="activeTab === tab.id
            ? 'text-violet-400 border-b-2 border-violet-400 -mb-px'
            : 'text-[var(--fg-subtle)] hover:text-[var(--fg)]'"
        >{{ tab.label }}</button>
      </div>

      <!-- Canonical tab -->
      <div v-if="activeTab === 'canonical'" class="flex flex-col gap-2">
        <p class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase mb-1">
          Официальные персонажи платформы
        </p>
        <button
          v-for="c in chat.characters"
          :key="c.slug"
          @click="selectCanonical(c.slug)"
          class="flex items-center gap-3 p-3 w-full text-left rounded-[10px] border transition-all duration-150"
          :class="currentSlug === c.slug
            ? 'border-violet-500/40 bg-violet-500/10'
            : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]'"
        >
          <div class="size-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600
                      flex items-center justify-center shrink-0 text-white font-bold text-sm">
            <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name"
                 class="size-full rounded-full object-cover" />
            <span v-else>{{ c.name[0] }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-[var(--fg)]">{{ c.name }}</span>
              <span v-if="c.is_premium"
                    class="text-[10px] font-mono tracking-wider text-violet-400">✦ Premium</span>
              <span v-if="currentSlug === c.slug"
                    class="text-[10px] font-mono tracking-wider text-violet-400">● активен</span>
            </div>
            <p class="text-xs text-[var(--fg-muted)] mt-0.5 line-clamp-1">
              {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '…' : '' }}
            </p>
          </div>
        </button>
      </div>

      <!-- Mine tab -->
      <div v-else-if="activeTab === 'mine'" class="flex flex-col gap-2">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase">Ваши персонажи</p>
          <Button variant="primary" size="sm" @click="openCreate">+ Создать</Button>
        </div>

        <p v-if="chat.myCharacters.length === 0"
           class="py-8 text-center text-sm text-[var(--fg-muted)]">
          У вас пока нет персонажей
        </p>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="c in chat.myCharacters"
            :key="c.id"
            class="flex items-center gap-3 p-3 rounded-[10px] border transition-all duration-150"
            :class="currentSlug === `uc:${c.id}`
              ? 'border-violet-500/40 bg-violet-500/10'
              : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]'"
          >
            <button class="size-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600
                           flex items-center justify-center shrink-0 text-white font-bold text-sm"
                    @click="selectUserChar(c.id)">
              <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name"
                   class="size-full rounded-full object-cover" />
              <span v-else>{{ c.name[0] }}</span>
            </button>
            <div class="flex-1 min-w-0 cursor-pointer" @click="selectUserChar(c.id)">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-[var(--fg)]">{{ c.name }}</span>
                <span v-if="c.is_public"
                      class="text-[10px] font-mono tracking-wider text-[var(--fg-subtle)]">◎ публичный</span>
                <span v-if="currentSlug === `uc:${c.id}`"
                      class="text-[10px] font-mono tracking-wider text-violet-400">● активен</span>
              </div>
              <p class="text-xs text-[var(--fg-muted)] mt-0.5 line-clamp-1">
                {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '…' : '' }}
              </p>
            </div>
            <button
              class="p-1.5 rounded-[6px] text-[var(--fg-subtle)] hover:text-[var(--fg)]
                     hover:bg-[var(--surface-3)] transition-colors duration-150 shrink-0"
              title="Редактировать"
              @click.stop="openEdit(c)"
            >
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Community tab -->
      <div v-else-if="activeTab === 'community'" class="flex flex-col gap-2">
        <p class="text-xs text-[var(--fg-subtle)] font-mono tracking-wider uppercase mb-1">
          Персонажи, опубликованные пользователями
        </p>
        <p v-if="chat.publicCharacters.length === 0"
           class="py-8 text-center text-sm text-[var(--fg-muted)]">
          Пока нет публичных персонажей
        </p>
        <button
          v-for="c in chat.publicCharacters"
          :key="c.id"
          @click="selectUserChar(c.id)"
          class="flex items-center gap-3 p-3 w-full text-left rounded-[10px] border transition-all duration-150"
          :class="currentSlug === `uc:${c.id}`
            ? 'border-violet-500/40 bg-violet-500/10'
            : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-2)]'"
        >
          <div class="size-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600
                      flex items-center justify-center shrink-0 text-white font-bold text-sm">
            <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name"
                 class="size-full rounded-full object-cover" />
            <span v-else>{{ c.name[0] }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-[var(--fg)]">{{ c.name }}</span>
              <span v-if="currentSlug === `uc:${c.id}`"
                    class="text-[10px] font-mono tracking-wider text-violet-400">● активен</span>
            </div>
            <p class="text-xs text-[var(--fg-muted)] mt-0.5 line-clamp-1">
              {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '…' : '' }}
            </p>
            <p v-if="c.author_name" class="text-[10px] text-[var(--fg-subtle)] font-mono mt-0.5">
              by {{ c.author_name }}
            </p>
          </div>
        </button>
      </div>
    </template>
  </Modal>

  <!-- Editor modal (stacked) -->
  <CharacterEditorModal
    :visible="showEditor"
    :character="editingChar"
    @close="showEditor = false"
    @saved="onEditorSaved"
    @deleted="onEditorDeleted"
  />
</template>
