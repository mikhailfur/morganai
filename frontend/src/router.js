/**
 * router.js — Маршрутизация Vue с защитой для Telegram WebApp.
 * 
 * Проверяет наличие window.Telegram.WebApp перед каждым переходом.
 * Если приложение открыто не из Telegram — доступ запрещен.
 */

import { createRouter, createWebHistory } from 'vue-router'
import CharacterListView from './views/CharacterListView.vue'
import CharacterDetailView from './views/CharacterDetailView.vue'
import ProfileView from './views/ProfileView.vue'

const routes = [
  {
    path: '/',
    name: 'characters',
    component: CharacterListView,
    meta: { title: 'Персонажи' }
  },
  {
    path: '/character/:id',
    name: 'character-detail',
    component: CharacterDetailView,
    meta: { title: 'Детали персонажа' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { title: 'Профиль' }
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('./views/ForbiddenView.vue'),
    meta: { title: 'Доступ запрещен' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Глобальный guard:
 * Проверяет, что приложение запущено внутри Telegram.
 */
router.beforeEach((to, from, next) => {
  // Разрешаем доступ к странице ошибки
  if (to.name === 'forbidden') {
    return next()
  }

  // Проверка среды Telegram
  const tg = window.Telegram?.WebApp
  if (!tg) {
    console.warn('Попытка открыть WebApp вне Telegram')
    return next({ name: 'forbidden' })
  }

  // Инициализируем Telegram WebApp, если он еще не готов
  if (!tg.initData) {
    console.warn('Данные инициализации Telegram отсутствуют')
    // Можно попробовать tg.ready(), но если initData нет, это подозрительно
  }

  // Устанавливаем заголовок страницы
  if (to.meta.title) {
    document.title = `Morgan AI — ${to.meta.title}`
  }

  next()
})

export default router
