<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useThemeStore } from './stores/theme'
import CookieBanner from './components/CookieBanner.vue'

useThemeStore()
</script>

<template>
  <RouterView />
  <CookieBanner />
</template>
