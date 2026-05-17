import { createI18n } from 'vue-i18n'
import ru from './locales/ru.json'

const savedLocale = localStorage.getItem('app-locale') || 'ru'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'ru',
  messages: { ru },
})

export default i18n
