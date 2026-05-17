<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?:  'default' | 'raised' | 'ghost'
  padding?:  'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  class?:    string
  as?:       string
}>(), {
  variant:   'default',
  padding:   'md',
  hoverable:  false,
  as:        'div',
})

const paddings: Record<string, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

const cls = computed(() => [
  'rounded-[14px] border transition-all duration-200',
  // Variant
  props.variant === 'default' ? 'bg-[var(--surface)] border-[var(--border)]' : '',
  props.variant === 'raised'  ? 'bg-[var(--surface)] border-[var(--border)] shadow-[0_0_32px_-8px_rgb(124_58_237_/_0.25)]' : '',
  props.variant === 'ghost'   ? 'bg-transparent border-[var(--border)]' : '',
  // Padding
  paddings[props.padding],
  // Hover glow
  props.hoverable
    ? 'hover:border-violet-500/30 hover:bg-[var(--surface-2)] hover:shadow-[0_0_32px_-4px_rgb(124_58_237_/_0.3)] cursor-pointer'
    : '',
  props.class ?? '',
].join(' '))
</script>

<template>
  <component :is="as" :class="cls">
    <slot />
  </component>
</template>
