/**
 * api.js — Настройка axios для работы с Morgan AI Backend.
 * 
 * Автоматически добавляет заголовок X-Telegram-Init-Data
 * для валидации пользователя на бэкенде.
 */

import axios from 'axios'

// Базовый URL берется из переменных окружения Vite
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000, // 30 секунд на запрос
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * Интерцептор запросов:
 * Добавляем initData от Telegram в заголовки, если он доступен.
 */
apiClient.interceptors.request.use(config => {
  const tg = window.Telegram?.WebApp
  if (tg && tg.initData) {
    config.headers['X-Telegram-Init-Data'] = tg.initData
  } else {
    console.warn('Telegram initData не найден. Запрос может быть отклонен сервером.')
  }
  return config
}, error => {
  return Promise.reject(error)
})

/**
 * Интерцептор ответов:
 * Обрабатываем ошибки авторизации (403) и другие ошибки.
 */
apiClient.interceptors.response.use(response => response, error => {
  if (error.response) {
    const status = error.response.status
    const detail = error.response.data?.detail || 'Неизвестная ошибка'

    if (status === 403) {
      console.error('Ошибка доступа (403):', detail)
      // Можно добавить редирект на страницу ошибки или логику выхода
      window.Telegram?.WebApp?.showAlert(`Ошибка доступа: ${detail}`)
    } else if (status === 401) {
      console.error('Не авторизован (401):', detail)
    }
  }
  return Promise.reject(error)
})

export default apiClient
