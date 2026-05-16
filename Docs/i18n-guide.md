# Гайд: Локализация (i18n)

Проект использует [vue-i18n v9](https://vue-i18n.intlify.dev/) в Composition API режиме.

---

## Структура файлов

```
client/src/
├── i18n.ts                  ← настройка vue-i18n, список языков
└── locales/
    ├── ru.json              ← русский (язык по умолчанию, полный)
    ├── template.json        ← шаблон для переводчика (все значения пустые)
    └── en.json              ← английский (пример будущего перевода)
```

---

## Как добавить новый язык

### Шаг 1 — Скопируй шаблон

```bash
cp client/src/locales/template.json client/src/locales/en.json
```

### Шаг 2 — Заполни переводы

Открой `en.json` и заполни все значения (сейчас они пустые `""`).
Структура ключей должна оставаться **точно такой же**, как в `ru.json`.

Пример:
```json
{
  "nav": {
    "home": "Home",
    "login": "Sign in"
  },
  "auth": {
    "login": {
      "button": "Sign in"
    }
  }
}
```

### Шаг 3 — Зарегистрируй в i18n.ts

Открой `client/src/i18n.ts` и добавь импорт и язык:

```ts
import ru from './locales/ru.json'
import en from './locales/en.json'   // ← добавить

const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru,
    en,  // ← добавить
  },
})
```

---

## Как использовать переводы в компонентах

### В шаблоне Vue

```vue
<template>
  <button>{{ $t('auth.login.button') }}</button>
  <p>{{ $t('settings.subscription.expires', { date: '01.08.2026' }) }}</p>
</template>
```

### В script setup

```ts
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const title = t('chat.placeholder')
const msg = t('pricing.messages_per_day', { n: 50 })
```

### Интерполяция переменных

В JSON-файле используй фигурные скобки:
```json
{
  "expires": "до {date}",
  "messages": "{n} сообщений/день"
}
```

В коде передавай как объект:
```ts
t('settings.subscription.expires', { date: '01.08.2026' })
```

---

## Как добавить переключатель языка

В компоненте (например, в header):

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { locale, availableLocales } = useI18n()
</script>

<template>
  <select v-model="locale">
    <option v-for="lang in availableLocales" :key="lang" :value="lang">
      {{ lang.toUpperCase() }}
    </option>
  </select>
</template>
```

Для сохранения выбора в localStorage:

```ts
watch(locale, (val) => {
  localStorage.setItem('lang', val)
})

// При инициализации:
const saved = localStorage.getItem('lang')
if (saved && availableLocales.includes(saved)) {
  locale.value = saved
}
```

---

## Соглашение по именованию ключей

Формат: `секция.подсекция.элемент`

| Префикс | Что содержит |
|---------|-------------|
| `nav.*` | навигация, меню |
| `landing.*` | главная страница |
| `auth.login.*` | страница входа |
| `auth.register.*` | страница регистрации |
| `chat.*` | чат, сообщения |
| `settings.*` | страница настроек |
| `characters.editor.*` | редактор персонажей |
| `legal.*` | /legal страница |
| `pricing.*` | страница тарифов |
| `errors.*` | сообщения об ошибках |
| `common.*` | кнопки и слова, используемые повсюду |

### Правила

- Используй `snake_case` для составных слов: `cta_primary`, `not_found`
- Для кнопок — глагол: `save`, `cancel`, `delete`, `confirm`
- Для плейсхолдеров — суффикс `_placeholder`: `name_placeholder`
- Для ошибок — описание: `error_invalid`, `error_exists`

---

## Текущее состояние

Инфраструктура готова, но компоненты ещё **не переведены** (используют хардкод).
Чтобы перевести компонент:

1. Добавь нужные ключи в `ru.json` (и в `template.json` пустыми)
2. Замени строки в шаблоне на `$t('key')`
3. Замени строки в script setup на `t('key')`

Переключить язык программно:
```ts
import { useI18n } from 'vue-i18n'
const { locale } = useI18n()
locale.value = 'en'
```
