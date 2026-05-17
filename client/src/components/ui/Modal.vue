<script setup lang="ts">
import { watch, onMounted, onBeforeUnmount, ref, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  open:         boolean
  title?:       string
  description?: string
  closeable?:   boolean
  size?:        'sm' | 'md' | 'lg' | 'xl'
}>(), {
  closeable: true,
  size:      'md',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close:         []
}>()

function close() {
  if (!props.closeable) return
  emit('update:open', false)
  emit('close')
}

// Escape key handler
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open && props.closeable) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

// Scroll lock on body when open
watch(() => props.open, (val) => {
  document.body.style.overflow = val ? 'hidden' : ''
}, { immediate: true })

// Focus first focusable element when opened
const panelRef = ref<HTMLElement | null>(null)
watch(() => props.open, async (val) => {
  if (!val) return
  await nextTick()
  const focusable = panelRef.value?.querySelector<HTMLElement>(
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
  )
  focusable?.focus()
})

const maxWidths: Record<string, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end md:items-center justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="close"
        />

        <!-- Panel — bottom-sheet on mobile, centered on md+ -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          leave-active-class="transition duration-200 ease-in"
          enter-from-class="translate-y-full md:translate-y-4 md:scale-95 opacity-0"
          leave-to-class="translate-y-full md:translate-y-4 md:scale-95 opacity-0"
        >
          <div
            v-if="open"
            ref="panelRef"
            :class="[
              // Base
              'relative z-10 flex flex-col',
              'bg-[var(--surface)] border-[var(--border)]',
              // Mobile: full-width bottom-sheet
              'w-full border-t border-x rounded-t-[20px] max-h-[90dvh]',
              // Desktop: centered dialog
              'md:border md:rounded-[14px] md:w-full md:mx-4',
              maxWidths[size],
              // Glow
              'md:shadow-[0_0_64px_-16px_rgb(124_58_237_/_0.5)]',
            ]"
            @click.stop
          >
            <!-- Mobile drag handle -->
            <div class="flex justify-center pt-3 pb-1 shrink-0 md:hidden">
              <div class="w-10 h-1 rounded-full bg-[var(--surface-3)]" />
            </div>

            <!-- Header -->
            <div
              v-if="title || closeable"
              class="flex items-start justify-between gap-3 px-5 py-4 shrink-0 border-b border-[var(--border)]"
            >
              <div class="min-w-0">
                <h2
                  v-if="title"
                  class="text-base font-semibold text-[var(--fg)] tracking-tight leading-snug"
                >{{ title }}</h2>
                <p
                  v-if="description"
                  class="text-sm text-[var(--fg-muted)] mt-0.5 leading-snug"
                >{{ description }}</p>
              </div>
              <button
                v-if="closeable"
                class="shrink-0 p-1.5 -mr-1 rounded-[8px] text-[var(--fg-subtle)]
                       hover:text-[var(--fg)] hover:bg-[var(--surface-2)]
                       transition-colors duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Закрыть"
                @click="close"
              >
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Scrollable body -->
            <div class="overflow-y-auto overscroll-contain flex-1 px-5 py-5">
              <slot />
            </div>

            <!-- Footer slot -->
            <div
              v-if="$slots.footer"
              class="shrink-0 border-t border-[var(--border)] px-5 py-4"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
