<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import type { UserCharacter } from '../types'
import Modal    from './ui/Modal.vue'
import Input    from './ui/Input.vue'
import Textarea from './ui/Textarea.vue'
import Button   from './ui/Button.vue'

const props = defineProps<{
  visible:    boolean
  character?: UserCharacter | null
}>()

const emit = defineEmits<{
  close:   []
  saved:   [char: UserCharacter]
  deleted: [id: number]
}>()

const chat = useChatStore()

const name            = ref('')
const description     = ref('')
const systemPrompt    = ref('')
const greetingMessage = ref('')
const avatarUrl       = ref('')
const isPublic        = ref(false)
const isNsfw          = ref(false)

const loading = ref(false)
const error   = ref('')

watch(() => props.visible, (val) => {
  if (!val) return
  error.value = ''
  if (props.character) {
    name.value            = props.character.name
    description.value     = props.character.description || ''
    systemPrompt.value    = props.character.system_prompt
    greetingMessage.value = props.character.greeting_message || ''
    avatarUrl.value       = props.character.avatar_url || ''
    isPublic.value        = props.character.is_public
    isNsfw.value          = props.character.is_nsfw ?? false
  } else {
    name.value            = ''
    description.value     = ''
    systemPrompt.value    = ''
    greetingMessage.value = ''
    avatarUrl.value       = ''
    isPublic.value        = false
    isNsfw.value          = false
  }
}, { immediate: true })

async function save() {
  if (!name.value.trim())         { error.value = 'Введите имя персонажа'; return }
  if (!systemPrompt.value.trim()) { error.value = 'Введите системный промпт'; return }
  loading.value = true
  error.value   = ''
  try {
    const data = {
      name:             name.value.trim(),
      description:      description.value.trim() || undefined,
      system_prompt:    systemPrompt.value.trim(),
      greeting_message: greetingMessage.value.trim() || undefined,
      avatar_url:       avatarUrl.value.trim() || undefined,
      is_public:        isPublic.value,
      is_nsfw:          isNsfw.value,
    }
    const char = props.character
      ? await chat.updateUserCharacter(props.character.id, data)
      : await chat.createUserCharacter(data)
    emit('saved', char)
    emit('close')
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка'
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!props.character) return
  if (!confirm(`Удалить персонажа «${props.character.name}»? Это действие нельзя отменить.`)) return
  loading.value = true
  try {
    await chat.deleteUserCharacter(props.character.id)
    emit('deleted', props.character.id)
    emit('close')
  } catch (e: any) {
    error.value = e.message || 'Произошла ошибка'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal
    :open="visible"
    :title="character ? 'Редактировать персонажа' : 'Создать персонажа'"
    size="md"
    @update:open="val => !val && emit('close')"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">

      <!-- Error banner -->
      <div
        v-if="error"
        class="flex items-start gap-2 px-3 py-2.5 rounded-[8px]
               bg-red-500/10 border border-red-500/30 text-sm text-red-400"
      >
        <svg class="size-4 shrink-0 mt-px" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 6.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
        </svg>
        {{ error }}
      </div>

      <!-- Name -->
      <Input
        v-model="name"
        label="Имя"
        placeholder="Имя персонажа"
        :maxlength="100"
        required
      />

      <!-- Description -->
      <Input
        v-model="description"
        label="Описание"
        placeholder="Краткое описание для карточки..."
        hint="Отображается в списке персонажей"
        :maxlength="255"
      />

      <!-- System Prompt -->
      <Textarea
        v-model="systemPrompt"
        label="Системный промпт"
        placeholder="Инструкция для AI: характер, стиль общения, биография персонажа..."
        :rows="5"
        :maxlength="8000"
        required
      />

      <!-- Greeting -->
      <Textarea
        v-model="greetingMessage"
        label="Приветственное сообщение"
        placeholder="Первое сообщение персонажа пользователю..."
        :rows="2"
        :maxlength="1000"
      />

      <!-- Avatar URL -->
      <Input
        v-model="avatarUrl"
        label="URL аватара"
        placeholder="https://..."
        type="url"
        hint="Необязательно — прямая ссылка на изображение"
      />

      <!-- Moderation status banner -->
      <div v-if="character?.moderation_status === 'pending'"
           class="flex items-start gap-2 px-3 py-2.5 rounded-[8px]
                  bg-amber-500/10 border border-amber-500/30 text-sm text-amber-400">
        <svg class="size-4 shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        На модерации — ждите проверки
      </div>
      <div v-else-if="character?.moderation_status === 'rejected'"
           class="flex flex-col gap-1 px-3 py-2.5 rounded-[8px]
                  bg-red-500/10 border border-red-500/30 text-sm text-red-400">
        <span>Персонаж отклонён</span>
        <span v-if="character.rejection_reason" class="text-xs opacity-80">{{ character.rejection_reason }}</span>
      </div>

      <!-- Public toggle -->
      <label class="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          v-model="isPublic"
          class="mt-0.5 size-4 rounded border-[var(--border)] bg-[var(--surface)]
                 accent-violet-500 cursor-pointer"
        />
        <div>
          <span class="text-sm text-[var(--fg)]">Публичный персонаж</span>
          <p class="text-xs text-[var(--fg-subtle)] mt-0.5">
            Виден другим пользователям. Будет отправлен на модерацию.
          </p>
        </div>
      </label>

      <!-- NSFW toggle -->
      <label class="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          v-model="isNsfw"
          class="mt-0.5 size-4 rounded border-[var(--border)] bg-[var(--surface)]
                 accent-violet-500 cursor-pointer"
        />
        <div>
          <span class="text-sm text-[var(--fg)]">NSFW-контент</span>
          <p class="text-xs text-[var(--fg-subtle)] mt-0.5">
            18+ — персонаж будет скрыт от пользователей без NSFW-доступа
          </p>
        </div>
      </label>
    </div>

    <!-- Footer buttons -->
    <template #footer>
      <div class="flex items-center gap-2 flex-wrap">
        <Button
          variant="primary"
          size="md"
          :loading="loading"
          @click="save"
        >
          {{ character ? 'Сохранить' : 'Создать персонажа' }}
        </Button>

        <Button
          variant="ghost"
          size="md"
          :disabled="loading"
          @click="emit('close')"
        >
          Отмена
        </Button>

        <Button
          v-if="character"
          variant="ghost"
          size="md"
          :disabled="loading"
          class="ml-auto !text-red-400 !border-red-500/30 hover:!bg-red-500/10 hover:!border-red-500/40"
          @click="remove"
        >
          Удалить
        </Button>
      </div>
    </template>
  </Modal>
</template>
