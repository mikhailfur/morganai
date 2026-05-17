// Theme store is a no-op — the app uses a fixed Midnight Violet dark theme.
// Kept for compatibility with any remaining imports.
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', () => {
  return {}
})
