<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useThemeStore } from './stores/theme'
import { useAuthStore } from './stores/auth'
import CookieBanner from './components/CookieBanner.vue'

useThemeStore()
const auth = useAuthStore()
onMounted(() => auth.fetchAppConfig())
</script>

<template>
  <RouterView />
  <CookieBanner />
</template>
