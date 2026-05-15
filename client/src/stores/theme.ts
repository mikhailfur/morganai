import { defineStore } from 'pinia'
import { ref } from 'vue'

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
    const nextDark = !isDark.value
    const overlayColor = nextDark ? '#0e0807' : '#f5ecdc'

    const overlay = document.createElement('div')
    overlay.className = 'theme-overlay'
    overlay.style.background = overlayColor
    document.body.appendChild(overlay)

    // Slide in
    requestAnimationFrame(() => {
      overlay.classList.add('theme-overlay--in')
      setTimeout(() => {
        // Switch theme at peak of overlay
        isDark.value = nextDark
        localStorage.setItem('morgan-theme', nextDark ? 'dark' : 'light')
        apply()
        overlay.classList.add('theme-overlay--out')
        setTimeout(() => overlay.remove(), 300)
      }, 250)
    })
  }

  apply()

  return { isDark, toggle }
})
