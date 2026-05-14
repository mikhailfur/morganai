import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',         name: 'landing',  component: () => import('../views/LandingPage.vue') },
    { path: '/login',    name: 'login',    component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },
    { path: '/pricing',  name: 'pricing',  component: () => import('../views/PricingView.vue') },
    { path: '/legal',    name: 'legal',    component: () => import('../views/LegalView.vue') },
    { path: '/legal/:doc', name: 'legal-doc', component: () => import('../views/LegalView.vue') },
    { path: '/chat',     name: 'chat',     component: () => import('../views/ChatView.vue'),     meta: { requiresAuth: true } },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { requiresAuth: true } },
    { path: '/admin',    name: 'admin',    component: () => import('../views/AdminView.vue'),    meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.token && !auth.user) await auth.fetchUser();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
  if (to.meta.requiresAdmin && !auth.isAdmin) return '/chat';
});

export default router;
