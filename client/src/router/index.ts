import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    requiresStaff?: boolean;
    requiresGuest?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('../views/PricingView.vue'),
    },
    {
      path: '/legal',
      name: 'legal',
      component: () => import('../views/LegalView.vue'),
    },
    {
      path: '/legal/:doc',
      name: 'legal-doc',
      component: () => import('../views/LegalView.vue'),
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('../views/SupportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // Fetch user once per session
  if (!auth.initialized) await auth.fetchUser();

  // Redirect logged-in users away from guest-only pages
  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'chat' };
  }

  // Redirect unauthenticated users away from protected pages
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  // Redirect non-admins away from admin panel
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'chat' };
  }

  // Redirect non-staff away from staff-only pages
  if (to.meta.requiresStaff && !auth.isStaff) {
    return { name: 'chat' };
  }
});

export default router;
