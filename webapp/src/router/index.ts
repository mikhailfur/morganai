import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import CharactersView from '@/views/CharactersView.vue'
import ModesView from '@/views/ModesView.vue'
import SubscriptionView from '@/views/SubscriptionView.vue'
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/characters',
    name: 'characters',
    component: CharactersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/modes',
    name: 'modes',
    component: ModesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/subscription',
    name: 'subscription',
    component: SubscriptionView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
