# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Правила работы Claude

1. **Язык:** Все ответы — строго на **русском языке**. Технические термины и идентификаторы кода остаются на языке оригинала.
2. **Playwright скриншоты:** Все скриншоты и файлы Playwright сохранять строго в папку **`PlayWrightPNG/`** в корне проекта. Очищать папку перед новым запуском тестов, если не указано иное.
3. **Документация:** Все гайды, описания задач, технические документы и changelog хранить строго в папке **`Docs/`** в корне проекта.

---

## Правила Git и CI/CD

### Разрешено без дополнительного подтверждения

- **Коммиты и пуш в `dev`** — после завершения задачи Claude самостоятельно делает коммит и пушит изменения в ветку `dev`.
- **Минимизация токенов на git-операции** — для коммитов, пушей и проверки CI использовать модель `claude-haiku-4-5` или делегировать через `Agent(subagent_type="claude", model="haiku")`.
- **Проверка CI/CD после каждого пуша** — `gh run list --branch dev --limit 3`. Если упало — изучить логи (`gh run view <id> --log-failed`) и исправить.

### Запрещено категорически

- **Любые действия с веткой `main`** — только по прямой команде пользователя с явным подтверждением.
- **Циклический фикс** — если та же ошибка повторяется более 2 раз подряд, остановиться и сообщить.
- **Бесполезные действия** — не запускать linter/typecheck/build без необходимости. Не перечитывать файлы, уже прочитанные в сессии.

---

## Экономия токенов

- **Grep перед Read:** для поиска строк/функций использовать `grep -n`, а не читать весь файл.
- **Задавать вопросы до начала работы** — если задача неоднозначна, уточнить перед стартом.
- **Предлагать план при сложных задачах** (3+ файла, архитектурные решения) — план в 3–5 пунктах, ждать одобрения.

---

## О проекте

**Morgan AI** — веб-платформа 18+ для ролевых игр с AI-персонажами. Чат с текстом, голосом и изображениями. Мигрировано из Telegram-бота в веб-приложение.

---

## Development Commands

```bash
# Оба сервиса из корня
npm run dev

# По отдельности
cd server && npm run dev     # Express :3001, tsx watch mode
cd client && npm run dev     # Vite :5173, проксирует /api → :3001

# Type check (обязательно перед коммитом)
cd client && npx vue-tsc --noEmit
cd server && npx tsc --noEmit

# Build
npm run build                # собирает оба
cd client && npm run build   # → client/dist/
cd server && npm run build   # → server/dist/
```

---

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, MySQL (mysql2/promise), JWT + httpOnly cookies (bcryptjs + jsonwebtoken + cookie-parser), multer
- **Frontend:** Vue 3 (`<script setup lang="ts">`) + TailwindCSS v4 + Pinia + Vue Router 4
- **AI:** OpenRouter API (default: `deepseek/deepseek-chat-v4-0324`), SSE streaming, prompt caching (cache_control: ephemeral)
- **TTS:** MiniMax API (`speech-2.6-turbo`)
- **OAuth:** Google Identity Services (GSI), Telegram Login Widget

---

## Architecture

### Main Request Flow (Chat Streaming)

```
POST /api/chat/stream { message, characterSlug, clientTimezone? }
  → authMiddleware: JWT из httpOnly cookie morgan_token
  → Проверить is_banned → 403
  → Проверить subscription_expires_at → auto-downgrade если истёк
  → checkMessageLimit(user, planType) → 429 если превышен лимит
  → Инкремент daily_messages_count
  → Load character + last N сообщений из DB (N берётся из plan_limits)
  → system_prompt = character.system_prompt + getBehaviorPrompt(mode, voiceCount)
  → injectPromptVariables(prompt, { userName, userLocalTime, currentDate })
  → MemoryManager.buildMessages() → trim по context_chars из plan_limits
  → system prompt с cache_control: ephemeral → кэш на стороне OpenRouter ~5 мин
  → OpenRouterClient.generateStreamResponse() → SSE: data: { text: "chunk" }
  → Parse [VOICE: text] → MiniMaxTTS.generateSpeech() → data: { voice: base64 }
  → data: [DONE]
  → Save full response to chat_history
```

### Auth Flow (httpOnly Cookie)

```
POST /api/auth/login | /register | /google | /telegram
  → Verify credentials (bcrypt / Google idToken / Telegram HMAC)
  → res.cookie('morgan_token', jwt, { httpOnly: true, sameSite: 'lax' })
  → Все fetch на клиенте: credentials: 'include'
  → authMiddleware читает req.cookies.morgan_token (fallback: Authorization header)
```

### Google OAuth

```
Client: google.accounts.id.renderButton() → невидимый iframe поверх styled button
  → popup окно Google → credential (idToken) → POST /api/auth/google { idToken }
Server: OAuth2Client.verifyIdToken() → декодировать payload
  → найти/создать user по google_id или email → httpOnly cookie → return user
```

### Telegram OAuth

```
Client: Telegram.Login.auth({ bot_id, request_access, origin }, callback)
  → callback получает user object → POST /api/auth/telegram { ...user }
Server: Проверить HMAC-SHA256(SHA256(botToken), dataCheckString)
  → найти/создать user по telegram_id → httpOnly cookie → return user
```

### Production Container

Root `Dockerfile` — multi-stage single container:
1. `client-builder` — Vue build → `/client/dist`
2. `server-builder` — tsc build → `/server/dist`
3. Final image — Express serves API + static Vue из `/app/public/`

CI/CD: `.github/workflows/deploy.yml` — триггер push в `dev` → Docker build → push `ghcr.io/mikhailfur/morganai` → POST на `DOKPLOY_WEBHOOK_URL`.

---

## Key Files

| Файл | Назначение |
|------|-----------|
| `server/src/config.ts` | Читает `.env` из корня; путь `../../.env` относительно `dist/` |
| `server/src/database.ts` | MySQL pool + CREATE TABLE + seed + все DB-методы |
| `server/src/auth.ts` | bcrypt, JWT, `authMiddleware`, `adminMiddleware`, cookie constants |
| `server/src/openrouter.ts` | OpenRouter client: generate, stream, analyzeImage, **prompt caching** |
| `server/src/memory.ts` | Форматирует историю: max N сообщений, max M chars (из plan_limits) |
| `server/src/prompt.ts` | `getBehaviorPrompt()` + `injectPromptVariables()` ({{user_name}}, {{user_time}}, {{current_date}}) |
| `server/src/voice.ts` | MiniMax TTS: hex response → Buffer → mp3 |
| `server/src/characters/` | Персонажи как TS-модули: `types.ts`, `morgan.ts`, `index.ts` |
| `server/src/routes/auth.routes.ts` | register, login, logout, me, config, google, telegram |
| `server/src/routes/user.routes.ts` | settings, change-password, delete-account, kyc-verify, characters |
| `server/src/routes/chat.routes.ts` | send, stream (с лимитами и кэшем), history, clear |
| `server/src/routes/admin.routes.ts` | stats, users, ban, subscription, plan-limits, events |
| `client/src/stores/auth.ts` | Pinia: login/logout/register/google/telegram, `appConfig` (runtime env) |
| `client/src/stores/theme.ts` | Тема Yume/Nocturne, **slide overlay** при переключении |
| `client/src/style.css` | Дизайн-система: CSS variables, компоненты, анимации |
| `client/src/components/CookieBanner.vue` | GDPR cookie consent баннер |
| `client/src/views/SettingsView.vue` | Настройки: смена пароля, удаление аккаунта, KYC/18+, NSFW |
| `client/src/views/AdminView.vue` | Таб-панель: обзор, пользователи, подписки, лимиты, лог событий |
| `client/public/logo.svg` | Логотип — SVG, прозрачный фон, работает в обеих темах |
| `client/public/characters/` | Арт персонажей: `morgan-portrait.png`, `morgan-hero.png` |
| `Docs/` | Гайды: OAuth setup, art placeholders, character prompts, CHANGELOG |

---

## Environment Variables

```env
# Обязательные
OPENROUTER_API_KEY=
JWT_SECRET=
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai

# Опциональные — AI / TTS
OPENROUTER_MODEL=deepseek/deepseek-chat-v4-0324
MINIMAX_API_TOKEN=
MINIMAX_VOICE_ID=

# OAuth (runtime, не нужны при build)
GOOGLE_CLIENT_ID=          # google-auth-library verifyIdToken
TELEGRAM_BOT_TOKEN=        # HMAC verification + bot_id для виджета

# Прочее
ADMIN_EMAILS=email@mail.com   # через запятую
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

В Docker передаются как env vars, `.env` файл отсутствует в контейнере.

---

## Database Schema

**Таблицы:** `users`, `characters`, `chat_history`, `subscriptions`, `voice_messages`, `plan_limits`, `admin_events`

Все timestamps — BIGINT миллисекунды (`Date.now()`).

**`users` — ключевые поля:**
- `behavior_mode`: `'default' | 'study' | 'work' | 'psychologist' | 'nsfw'`
- `selected_character`: slug (default `'morgan'`)
- `subscription_type`: `'free' | 'premium' | 'premium_plus'`
- `subscription_expires_at`: BIGINT — если < Date.now(), авто-downgrade на free
- `kyc_verified`: BOOLEAN — разблокирует NSFW без Premium
- `is_banned`: BOOLEAN — проверяется в authMiddleware → 403
- `daily_messages_count` / `daily_messages_reset`: счётчик лимита, сбрасывается в начале UTC-дня
- `google_id` / `telegram_id`: для OAuth

**`plan_limits`** — конфигурируемые лимиты по тарифу:
- `daily_message_limit`, `context_messages`, `context_chars`, `voice_limit`, `voice_window_hours`
- Редактируются через Admin → Лимиты. Кэшируются на стороне сервера.

**`admin_events`** — лог действий администратора (ban, subscription change).

Добавить персонажа: `INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, is_active, sort_order, created_at) VALUES (...)`

---

## Vite/Static Assets — Важная особенность

**Никогда не использовать статический `src="..."` для путей к файлам из `public/`.**
Vite/rolldown при сборке пытается разрешить их как ES-модули → `UNRESOLVED_IMPORT` → CI ломается.

```html
<!-- ❌ Сломает CI -->
<img src="/logo.svg">
<img src="/characters/morgan-hero.png">

<!-- ✅ Правильно — динамический биндинг, Vite не трогает -->
<img :src="'/logo.svg'">
<img :src="'/characters/morgan-hero.png'">
```

---

## Design System — Yume & Nocturne

Переключение: `html.dark` класс. Состояние в `useThemeStore` (localStorage). При переключении — **slide overlay** анимация (`.theme-overlay` в style.css).

| | Yume (светлая) | Nocturne (тёмная) |
|--|--|--|
| `--bg` | `#f5ecdc` (кремовый) | `#0e0807` (кофейный чёрный) |
| `--fg` | `#2a1014` (тёмно-бордовый) | `#eee2c8` (кремовый) |
| `--accent` | `#5c1a1f` (бордо) | `#c63d2f` (алый) |
| `--accent2` | `#c8543b` (терракота) | `#c63d2f` |
| `--accent3` | `#e89478` (персиковый) | `#a8753a` (янтарный) |

**Шрифты:**
- `--font-display`: `Fraunces, Noto Serif JP, serif` — заголовки, имена персонажей
- `--font-ui`: `Inter, sans-serif` — интерфейс, тело текста
- `--font-mono`: системный monospace — лейблы, метки

**Ключевые CSS-классы** (`client/src/style.css`): `.editorial-label`, `.display-heading`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.nav-item`, `.chat-bubble-user`, `.chat-bubble-ai`, `.m-textarea`, `.art-slot`, `.washi-tape`, `.theme-toggle`, `.mode-card`, `.typing-dot`, `.animate-fade-in`

---

## Character Response Format

```
*действие/эмоция*    — описание, <em class="msg-action">
Речь обычным текстом — что говорит персонаж
(мысли в скобках)   — внутренние мысли, <span class="msg-thought">
[VOICE: текст]      — генерируется MiniMax TTS, тег удаляется из UI
```

`formatContent()` в ChatView.vue: удаляет [VOICE:], оборачивает мысли, действия, конвертирует \n → `<br>`. **Порядок важен:** мысли заменяются до курсива.

---

## Conventions

- **Timestamps:** всегда миллисекунды (`Date.now()`)
- **API errors:** `{ error: "message" }` + HTTP status
- **Route typing:** `req: any` для обхода TS strictness на `req.user`
- **Singletons:** `database`, `openrouterClient`, `memoryManager`, `minimaxTTS`
- **Pinia stores:** composition API / setup function style
- **SSE streaming:** `POST /api/chat/stream`, не WebSocket
- **CSS:** TailwindCSS v4 + кастомные классы в `style.css` через `@layer components`
- **Vue компоненты:** `<script setup lang="ts">`, без Options API
- **SVG-иконки:** inline SVG вместо emoji

---

## Тарифы

| Тариф | Цена | Лимиты |
|-------|------|--------|
| Free | 0₽ | 50 сообщений/день, 20 контекстных, 12к символов |
| Premium | 299₽/мес | 500 сообщений/день, все персонажи, голос, NSFW |
| Premium+ | 599₽/мес | Безлимит голоса, 100к токенов контекста, приоритет |

Лимиты редактируются через Admin → Лимиты (`plan_limits` таблица). Premium назначается администратором вручную через AdminView.

---

## Что реализовано (основные фазы)

- **httpOnly Cookie Auth** — `morgan_token` cookie, `credentials: 'include'` везде
- **OpenRouter Prompt Caching** — `cache_control: ephemeral` на system prompt
- **Theme Slide Overlay** — анимация при переключении темы
- **Cookie Consent Banner** — `CookieBanner.vue`, consent в localStorage
- **Password Change / Account Deletion** — `POST /api/user/change-password`, `DELETE /api/user/account`
- **KYC/NSFW** — `POST /api/user/kyc-verify`, разблокировка NSFW без Premium
- **Message Limits** — проверка в chat.routes.ts, конфиг в `plan_limits`, авто-сброс по UTC-дню
- **Персонажи как TS-модули** — `server/src/characters/`: types, morgan, index
- **Prompt Variables** — `injectPromptVariables()` с `{{user_name}}`, `{{user_time}}`, `{{current_date}}`
- **Google OAuth** — renderButton overlay (popup), `google-auth-library` верификация
- **Telegram OAuth** — Login Widget, HMAC-SHA256 верификация
- **Admin Panel** — tabs: обзор, пользователи, подписки, лимиты, лог событий, ban
- **Logo SVG** — `logo.svg` прозрачный фон, работает в обеих темах; все изображения персонажей в `client/public/characters/`

---

## Что предстоит сделать

| Задача | Приоритет | Примечание |
|--------|-----------|------------|
| Интеграция оплаты | Высокий | Stripe / ЮKassa / СБП; сейчас только ручная выдача через Admin |
| Email-верификация | Средний | Нет верификации email при регистрации |
| Сброс пароля | Средний | Нет flow "забыл пароль" |
| STT (голосовой ввод) | Средний | Placeholder в `voice.routes.ts`, `MediaRecorder` не подключён |
| `express-rate-limit` | Средний | Нет rate-limiting на API-роутах (DoS-уязвимость) |
| Пагинация истории чата | Низкий | Сейчас только последние 50 сообщений, без постраничной загрузки |
| Превью загруженных изображений | Низкий | Изображения в AI передаются, но в UI не отображаются как превью |
| Автоматическое продление подписки | Низкий | Сейчас подписка не продлевается автоматически |

---

## Как добавить новый режим поведения

Изменить 4 места:
1. `server/src/prompt.ts` — добавить case в `getBehaviorPrompt()`
2. `client/src/views/ChatView.vue` — массив `modes` в модале настроек
3. `client/src/views/SettingsView.vue` — массив `modes`
4. `server/src/routes/user.routes.ts` — массив `validModes`
