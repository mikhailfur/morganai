<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import type { UserCharacter } from '../types'
import CharacterEditorModal from './CharacterEditorModal.vue'

const props = defineProps<{
  visible: boolean
  currentSlug: string
}>()

const emit = defineEmits<{
  close: []
  select: [slug: string]
}>()

const chat = useChatStore()

const activeTab = ref<'canonical' | 'mine' | 'community'>('canonical')
const showEditor = ref(false)
const editingChar = ref<UserCharacter | null>(null)

onMounted(async () => {
  if (chat.myCharacters.length === 0) await chat.fetchMyCharacters()
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
  showEditor.value = true
}

function openEdit(char: UserCharacter) {
  editingChar.value = char
  showEditor.value = true
}

function onEditorSaved(_char: UserCharacter) {
  showEditor.value = false
}

function onEditorDeleted(id: number) {
  // если удалён текущий персонаж — переключиться на morgan
  if (props.currentSlug === `uc:${id}`) {
    emit('select', 'morgan')
  }
  showEditor.value = false
}

</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-box" style="max-width: 640px; width: 100%; padding: 0; overflow: hidden;">

        <!-- Modal header -->
        <div style="padding: 20px 24px 0; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-family: var(--font-display); font-size: 22px; font-weight: 600;">Персонажи</div>
          <button @click="emit('close')" class="btn-ghost btn-sm" style="font-size: 18px; padding: 2px 8px;">✕</button>
        </div>

        <!-- Tabs -->
        <div style="display: flex; gap: 0; padding: 16px 24px 0; border-bottom: var(--border);">
          <button
            v-for="tab in [
              { id: 'canonical', label: 'Каноничные' },
              { id: 'mine', label: 'Мои' },
              { id: 'community', label: 'Сообщество' },
            ]"
            :key="tab.id"
            @click="activeTab = tab.id as any"
            :style="{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--fg)',
              cursor: 'pointer',
              opacity: activeTab === tab.id ? 1 : 0.6,
              transition: 'all 0.15s',
              marginBottom: '-1px',
            }"
          >{{ tab.label }}</button>
        </div>

        <!-- Content -->
        <div style="padding: 20px 24px; max-height: 480px; overflow-y: auto;">

          <!-- Canonical tab -->
          <div v-if="activeTab === 'canonical'">
            <div class="char-label" style="margin-bottom: 12px;">Официальные персонажи платформы</div>
            <div class="char-grid">
              <button
                v-for="c in chat.characters"
                :key="c.slug"
                @click="selectCanonical(c.slug)"
                :class="['char-card', currentSlug === c.slug ? 'active' : '']"
              >
                <div class="char-avatar">
                  <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name" />
                  <span v-else class="char-avatar-placeholder">{{ c.name[0] }}</span>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-family: var(--font-display); font-weight: 600; font-size: 15px;">{{ c.name }}</span>
                    <span v-if="c.is_premium" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent); letter-spacing: 1px;">✦ Premium</span>
                    <span v-if="currentSlug === c.slug" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent2); letter-spacing: 1px;">● активен</span>
                  </div>
                  <div style="font-family: var(--font-display); font-size: 12px; opacity: 0.7; margin-top: 3px; line-height: 1.3;">
                    {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '...' : '' }}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Mine tab -->
          <div v-else-if="activeTab === 'mine'">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div class="char-label">Ваши персонажи</div>
              <button class="btn-primary btn-sm" @click="openCreate">+ Создать</button>
            </div>
            <div v-if="chat.myCharacters.length === 0" style="text-align: center; padding: 32px 0; font-family: var(--font-display); font-size: 14px; opacity: 0.5;">
              Создайте своего первого персонажа
            </div>
            <div v-else class="char-grid">
              <div
                v-for="c in chat.myCharacters"
                :key="c.id"
                class="char-card"
                :class="{ active: currentSlug === `uc:${c.id}` }"
                style="cursor: default;"
              >
                <div class="char-avatar" @click="selectUserChar(c.id)" style="cursor: pointer;">
                  <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name" />
                  <span v-else class="char-avatar-placeholder">{{ c.name[0] }}</span>
                </div>
                <div style="flex: 1; min-width: 0; cursor: pointer;" @click="selectUserChar(c.id)">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-family: var(--font-display); font-weight: 600; font-size: 15px;">{{ c.name }}</span>
                    <span v-if="c.is_public" style="font-family: var(--font-mono); font-size: 9px; color: var(--meta); letter-spacing: 1px;">◎ публичный</span>
                    <span v-if="currentSlug === `uc:${c.id}`" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent2); letter-spacing: 1px;">● активен</span>
                  </div>
                  <div style="font-family: var(--font-display); font-size: 12px; opacity: 0.7; margin-top: 3px; line-height: 1.3;">
                    {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '...' : '' }}
                  </div>
                </div>
                <button
                  @click.stop="openEdit(c)"
                  class="btn-ghost btn-sm"
                  style="font-size: 12px; padding: 4px 8px; flex-shrink: 0;"
                  title="Редактировать"
                >✎</button>
              </div>
            </div>
          </div>

          <!-- Community tab -->
          <div v-else-if="activeTab === 'community'">
            <div class="char-label" style="margin-bottom: 12px;">Персонажи, опубликованные пользователями</div>
            <div v-if="chat.publicCharacters.length === 0" style="text-align: center; padding: 32px 0; font-family: var(--font-display); font-size: 14px; opacity: 0.5;">
              Пока нет публичных персонажей
            </div>
            <div v-else class="char-grid">
              <button
                v-for="c in chat.publicCharacters"
                :key="c.id"
                @click="selectUserChar(c.id)"
                class="char-card"
                :class="{ active: currentSlug === `uc:${c.id}` }"
              >
                <div class="char-avatar">
                  <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.name" />
                  <span v-else class="char-avatar-placeholder">{{ c.name[0] }}</span>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-family: var(--font-display); font-weight: 600; font-size: 15px;">{{ c.name }}</span>
                    <span v-if="currentSlug === `uc:${c.id}`" style="font-family: var(--font-mono); font-size: 9px; color: var(--accent2); letter-spacing: 1px;">● активен</span>
                  </div>
                  <div style="font-family: var(--font-display); font-size: 12px; opacity: 0.7; margin-top: 3px; line-height: 1.3;">
                    {{ c.description?.slice(0, 80) }}{{ (c.description?.length ?? 0) > 80 ? '...' : '' }}
                  </div>
                  <div v-if="c.author_name" style="font-family: var(--font-mono); font-size: 9px; opacity: 0.5; margin-top: 4px; letter-spacing: 1px;">
                    by {{ c.author_name }}
                  </div>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Editor modal -->
    <CharacterEditorModal
      :visible="showEditor"
      :character="editingChar"
      @close="showEditor = false"
      @saved="onEditorSaved"
      @deleted="onEditorDeleted"
    />
  </Teleport>
</template>

<style scoped>
.char-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  opacity: 0.6;
}

.char-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.char-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: none;
  border: var(--border);
  color: var(--fg);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, border-color 0.12s;
  width: 100%;
}

.char-card:hover {
  background: var(--bg-alt);
}

.char-card.active {
  border-color: var(--accent);
  background: var(--bg-alt);
}

.char-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-alt);
  border: var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.char-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-avatar-placeholder {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}
</style>
