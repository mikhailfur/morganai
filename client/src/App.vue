<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import BackgroundOrbs from './components/BackgroundOrbs.vue'
import CookieBanner from './components/CookieBanner.vue'

const auth = useAuthStore()
onMounted(() => auth.fetchAppConfig())
</script>

<template>
  <BackgroundOrbs />
  <RouterView :key="$route.fullPath" />
  <CookieBanner />
</template>
