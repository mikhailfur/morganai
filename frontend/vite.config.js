import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: {
    port: 3000,
    // Proxy работает только при локальной разработке (npm run dev).
    // В production / Dokploy фронт ходит к API через VITE_API_URL.
    proxy: {
      '/api': 'http://localhost:8000',
      '/webhook': 'http://localhost:8000',
    }
  }
})
