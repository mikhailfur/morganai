<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import BackgroundOrbs from './components/BackgroundOrbs.vue'
import CookieBanner from './components/CookieBanner.vue'

const auth = useAuthStore()
auth.fetchAppConfig()
</script>

<template>
  <BackgroundOrbs />
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from { opacity: 0; transform: translateY(8px); }
.page-leave-to   { opacity: 0; transform: translateY(-8px); }
</style>
