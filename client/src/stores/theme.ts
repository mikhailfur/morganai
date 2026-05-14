import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('morgan-theme') === 'dark')

  function apply() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('morgan-theme', isDark.value ? 'dark' : 'light')
    apply()
  }

  apply()
  watch(isDark, apply)

  return { isDark, toggle }
})
