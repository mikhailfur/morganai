<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import type { UserCharacter } from '../types'

const props = defineProps<{
  visible: boolean
  character?: UserCharacter | null
}>()

const emit = defineEmits<{
  close: []
  saved: [char: UserCharacter]
  deleted: [id: number]
}>()

const chat = useChatStore()

const name = ref('')
const description = ref('')
const systemPrompt = ref('')
const greetingMessage = ref('')
const avatarUrl = ref('')
const isPublic = ref(false)

const loading = ref(false)
const error = ref('')

watch(() => props.visible, (val) => {
  if (!val) return
  error.value = ''
  if (props.character) {
    name.value = props.character.name
    description.value = props.character.description || ''
    systemPrompt.value = props.character.system_prompt
    greetingMessage.value = props.character.greeting_message || ''
    avatarUrl.value = props.character.avatar_url || ''
    isPublic.value = props.character.is_public
  } else {
    name.value = ''
    description.value = ''
    systemPrompt.value = ''
    greetingMessage.value = ''
    avatarUrl.value = ''
    isPublic.value = false
  }
}, { immediate: true })

async function save() {
  if (!name.value.trim()) { error.value = 'Введите имя персонажа'; return }
  if (!systemPrompt.value.trim()) { error.value = 'Введите системный промпт'; return }
  loading.value = true
  error.value = ''
  try {
    const data = {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      system_prompt: systemPrompt.value.trim(),
      greeting_message: greetingMessage.value.trim() || undefined,
      avatar_url: avatarUrl.value.trim() || undefined,
      is_public: isPublic.value,
    }
    let char: UserCharacter
    if (props.character) {
      char = await chat.updateUserCharacter(props.character.id, data)
    } else {
      char = await chat.createUserCharacter(data)
    }
    emit('saved', char)
    emit('close')
  } catch (e: any) {
    error.value = e.message || 'Ошибка'
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
    error.value = e.message || 'Ошибка'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-box" style="max-width: 560px; width: 100%;">
        <!-- Header -->
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px;">
          <div style="font-family: var(--font-display); font-size: 22px; font-weight: 600;">
            {{ character ? 'Редактировать персонажа' : 'Создать персонажа' }}
          </div>
          <button @click="emit('close')" class="btn-ghost btn-sm" style="font-size: 18px; padding: 2px 8px;">✕</button>
        </div>

        <div v-if="error" style="padding: 8px 12px; background: var(--bg-alt); border-left: 3px solid var(--accent2); font-size: 13px; color: var(--accent2); margin-bottom: 14px;">{{ error }}</div>

        <!-- Form -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Name -->
          <div>
            <div class="field-label">Имя *</div>
            <input v-model="name" class="m-input" style="width: 100%;" placeholder="Имя персонажа" maxlength="100" />
          </div>

          <!-- Description -->
          <div>
            <div class="field-label">Описание <span style="opacity: 0.5;">(краткое, для карточки)</span></div>
            <input v-model="description" class="m-input" style="width: 100%;" placeholder="Краткое описание..." maxlength="255" />
          </div>

          <!-- System Prompt -->
          <div>
            <div class="field-label">Системный промпт *</div>
            <textarea
              v-model="systemPrompt"
              class="m-textarea"
              style="width: 100%; min-height: 120px; resize: vertical;"
              placeholder="Инструкция для AI: характер, стиль общения, фон персонажа..."
            />
          </div>

          <!-- Greeting -->
          <div>
            <div class="field-label">Приветственное сообщение</div>
            <textarea
              v-model="greetingMessage"
              class="m-textarea"
              style="width: 100%; min-height: 60px; resize: vertical;"
              placeholder="Первое сообщение персонажа пользователю..."
            />
          </div>

          <!-- Avatar URL -->
          <div>
            <div class="field-label">URL аватара <span style="opacity: 0.5;">(необязательно)</span></div>
            <input v-model="avatarUrl" class="m-input" style="width: 100%;" placeholder="https://..." />
          </div>

          <!-- Is public -->
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-family: var(--font-display); font-size: 14px;">
            <input type="checkbox" v-model="isPublic" style="cursor: pointer;" />
            Публичный — виден другим пользователям в разделе «Сообщество»
          </label>
        </div>

        <!-- Actions -->
        <div style="margin-top: 22px; display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-primary btn-sm" :disabled="loading" @click="save">
            {{ loading ? 'Сохранение...' : (character ? 'Сохранить' : 'Создать') }}
          </button>
          <button class="btn-ghost btn-sm" @click="emit('close')">Отмена</button>
          <button
            v-if="character"
            class="btn-ghost btn-sm"
            style="margin-left: auto; color: var(--accent2); border-color: var(--accent2);"
            :disabled="loading"
            @click="remove"
          >Удалить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.field-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin-bottom: 5px;
  opacity: 0.7;
}
</style>
