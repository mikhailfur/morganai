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
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="$route.path" />
    </Transition>
  </RouterView>
  <CookieBanner />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to   { opacity: 0; transform: translateY(-6px); }
</style>
