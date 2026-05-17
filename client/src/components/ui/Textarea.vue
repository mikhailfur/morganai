<script setup lang="ts">
import { computed, ref, watch, nextTick, useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?:  string
  label?:       string
  placeholder?: string
  error?:       string
  hint?:        string
  maxlength?:   number
  rows?:        number
  disabled?:    boolean
  required?:    boolean
  autoresize?:  boolean
  id?:          string
  class?:       string
}>(), {
  rows:       3,
  disabled:   false,
  required:   false,
  autoresize: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uid = useId()
const textareaId = computed(() => props.id ?? uid)
const elRef = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const el = elRef.value
  if (!el || !props.autoresize) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(() => props.modelValue, () => nextTick(resize))

const charCount = computed(() => props.modelValue?.length ?? 0)
const charRatio = computed(() =>
  props.maxlength ? charCount.value / props.maxlength : 0
)

const textareaCls = computed(() => [
  'w-full bg-[var(--surface)] text-[var(--fg)] text-sm',
  'border rounded-[8px] px-3 py-2.5',
  'placeholder:text-[var(--fg-subtle)]',
  'outline-none transition-all duration-200 resize-none',
  'focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-0',
  props.error
    ? 'border-red-500/60 focus-visible:border-red-500/60 focus-visible:ring-red-500/20'
    : 'border-[var(--border)] focus-visible:border-violet-500/40',
  props.disabled ? 'opacity-50 cursor-not-allowed' : '',
  props.class ?? '',
].join(' '))
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <!-- Label row -->
    <div v-if="label || maxlength" class="flex items-center justify-between">
      <label
        v-if="label"
        :for="textareaId"
        class="text-xs font-semibold tracking-widest uppercase text-[var(--fg-muted)]"
      >
        {{ label }}<span v-if="required" class="text-red-400 ml-0.5">*</span>
      </label>
      <span
        v-if="maxlength"
        class="text-xs font-mono tabular-nums ml-auto"
        :class="charRatio >= 0.9 ? 'text-red-400' : charRatio >= 0.75 ? 'text-amber-400' : 'text-[var(--fg-subtle)]'"
      >
        {{ charCount }}/{{ maxlength }}
      </span>
    </div>

    <!-- Textarea -->
    <textarea
      ref="elRef"
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :required="required"
      :class="textareaCls"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value); resize()"
    />

    <!-- Error -->
    <p v-if="error" class="text-xs text-red-400 flex items-center gap-1">
      <svg class="size-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 4.5zm0 6.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
      </svg>
      {{ error }}
    </p>

    <!-- Hint -->
    <p v-else-if="hint" class="text-xs text-[var(--fg-subtle)]">{{ hint }}</p>
  </div>
</template>
