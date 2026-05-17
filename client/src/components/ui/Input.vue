<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?:  string | number
  label?:       string
  placeholder?: string
  type?:        string
  error?:       string
  hint?:        string
  disabled?:    boolean
  required?:    boolean
  autofocus?:   boolean
  autocomplete?: string
  id?:          string
  class?:       string
}>(), {
  type:     'text',
  disabled:  false,
  required:  false,
  autofocus: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const uid = useId()
const inputId = computed(() => props.id ?? uid)

const inputCls = computed(() => [
  'w-full bg-[var(--surface)] text-[var(--fg)] text-sm',
  'border rounded-[8px] px-3 py-2.5',
  'placeholder:text-[var(--fg-subtle)]',
  'outline-none transition-all duration-200',
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
    <!-- Label -->
    <label
      v-if="label"
      :for="inputId"
      class="text-xs font-semibold tracking-widest uppercase text-[var(--fg-muted)]"
    >
      {{ label }}<span v-if="required" class="text-red-400 ml-0.5">*</span>
    </label>

    <!-- Input -->
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :autofocus="autofocus"
      :autocomplete="autocomplete"
      :class="inputCls"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
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
