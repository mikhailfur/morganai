<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'link'
  size?:    'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?:    'button' | 'submit' | 'reset'
  as?:      string
  class?:   string
}>(), {
  variant: 'primary',
  size:    'md',
  loading:  false,
  disabled: false,
  type:    'button',
  as:      'button',
})

const base = [
  'inline-flex items-center justify-center gap-2',
  'font-medium leading-none whitespace-nowrap select-none',
  'rounded-[10px] border transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090514]',
  'disabled:pointer-events-none disabled:opacity-40',
  'active:scale-[0.97]',
]

const variants: Record<string, string[]> = {
  primary: [
    'bg-gradient-to-br from-violet-600 to-indigo-600',
    'text-white border-transparent',
    'shadow-[0_8px_24px_-8px_rgb(124_58_237_/_0.5)]',
    'hover:from-violet-500 hover:to-violet-600',
    'hover:shadow-[0_12px_32px_-8px_rgb(124_58_237_/_0.7)]',
    'hover:-translate-y-px',
  ],
  secondary: [
    'bg-[var(--surface-2)] text-[var(--fg)]',
    'border-[var(--border)] hover:border-[var(--border-hover)]',
    'hover:bg-[var(--surface-3)]',
  ],
  ghost: [
    'bg-transparent text-[var(--fg-muted)]',
    'border-[var(--border)] hover:border-[var(--border-hover)]',
    'hover:bg-[var(--surface-2)] hover:text-[var(--fg)]',
  ],
  link: [
    'bg-transparent border-transparent',
    'text-violet-400 hover:text-violet-300',
    'hover:underline underline-offset-4',
    'p-0 h-auto',
  ],
}

const sizes: Record<string, string> = {
  sm: 'h-8  px-3   text-xs',
  md: 'h-10 px-5   text-sm',
  lg: 'h-12 px-6   text-base',
}

const cls = computed(() => [
  ...base,
  ...variants[props.variant],
  props.variant !== 'link' ? sizes[props.size] : '',
  props.class ?? '',
].join(' '))
</script>

<template>
  <component
    :is="as"
    :type="as === 'button' ? type : undefined"
    :disabled="disabled || loading"
    :class="cls"
  >
    <!-- Loading spinner -->
    <svg
      v-if="loading"
      class="size-4 animate-spin shrink-0"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>

    <slot />
  </component>
</template>
