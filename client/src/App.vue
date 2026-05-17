<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import BackgroundOrbs from './components/BackgroundOrbs.vue'
import CookieBanner from './components/CookieBanner.vue'

const auth = useAuthStore()
onMounted(() => auth.fetchAppConfig())
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
