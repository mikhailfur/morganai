# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Правила работы Claude

1. **Язык:** Все ответы — строго на **русском языке**. Технические термины и идентификаторы кода остаются на языке оригинала.
2. **Playwright скриншоты:** Все скриншоты и файлы Playwright сохранять строго в папку **`PlayWrightPNG/`** в корне проекта.
3. **Документация:** Все гайды, описания задач, технические документы и changelog хранить строго в папке **`Docs/`** в корне проекта.

---

## Что такое Morgan AI

**Morgan AI** — веб-платформа для ролевых игр с AI-персонажами. Пользователи общаются с уникальными AI-компаньонами через чат с поддержкой текста, голосовых сообщений и изображений. Мигрировано из Telegram-бота ([alyabot](https://github.com/mikhailfur/alyabot)) в веб-приложение.

---

## Development Commands

```bash
# Запуск обоих сервисов из корня
npm run dev

# По отдельности:
cd server && npm run dev     # Express на порту 3001 (tsx watch mode)
cd client && npm run dev     # Vite на порту 5173 (проксирует /api → :3001)

# Type check
cd server && npx tsc --noEmit
cd client && npx vue-tsc --noEmit    # ← обязательно перед коммитом

# Build
npm run build                # собирает оба
cd server && npm run build   # → server/dist/
cd client && npm run build   # → client/dist/
```

---

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, MySQL (mysql2/promise), JWT (bcryptjs + jsonwebtoken), multer
- **Frontend:** Vue 3 (`<script setup lang="ts">`) + TailwindCSS v4 + Pinia + Vue Router 4
- **AI:** OpenRouter API (default model: `deepseek/deepseek-chat-v4-0324`), SSE streaming
- **TTS:** MiniMax API (`speech-2.6-turbo`)

---

## Architecture

### Main Request Flow (Chat Streaming)

```
POST /api/chat/stream { message, characterSlug }
  → Load user + character + last 20 messages from DB
  → system_prompt = character.system_prompt + getBehaviorPrompt(mode, voiceCount)
  → MemoryManager.buildMessages() → trims to 12000 chars
  → OpenRouterClient.generateStreamResponse() → SSE: data: { text: "chunk" }
  → Parse [VOICE: text] tag → MiniMaxTTS.generateSpeech() → data: { voice: base64 }
  → data: [DONE]
  → Save full response to chat_history
```

### Production Container

Root `Dockerfile` — multi-stage single container:
1. `client-builder` — Vue build → `/client/dist`
2. `server-builder` — tsc build → `/server/dist`
3. Final image — Express serves API + static Vue из `/app/public/`

В production `CLIENT_URL=*` активирует `origin: true` в CORS (wildcard-строка работает, а `*` с `credentials: true` — нет).

### CI/CD (GitHub Actions → Dokploy)

Файл: `.github/workflows/deploy.yml` — триггер: push в ветку `dev`:
1. Build + push Docker image в `ghcr.io/mikhailfur/morganai` (`:latest` + `:sha`)
2. POST на `${{ secrets.DOKPLOY_WEBHOOK_URL }}` — редеплой в Dokploy

Пакет `ghcr.io/mikhailfur/morganai` должен быть **публичным** (иначе Dokploy не сможет pull без auth).
Секрет `DOKPLOY_WEBHOOK_URL` берётся из Dokploy panel → приложение → Deploy Webhook.

`docker-compose.yml` в корне — для локальной разработки с отдельными сервисами (db + server + client).

---

## Key Files

| Файл | Назначение |
|------|-----------|
| `server/src/config.ts` | Читает `.env` из корня репо; путь `../../.env` относительно `dist/` |
| `server/src/database.ts` | MySQL pool + все CREATE TABLE + seed персонажа "Morgan" |
| `server/src/auth.ts` | bcrypt hash/compare, JWT sign/verify, `authMiddleware`, `adminMiddleware` |
| `server/src/openrouter.ts` | OpenRouter client: generate, stream, analyzeImage (vision) |
| `server/src/memory.ts` | Форматирует историю: max 20 сообщений, max 12000 chars |
| `server/src/prompt.ts` | `getBehaviorPrompt()` — режим поведения + NSFW фильтр + лимит голосовых |
| `server/src/voice.ts` | MiniMax TTS: hex response → Buffer → mp3 |
| `client/src/style.css` | Дизайн-система: CSS variables, компоненты, анимации |
| `client/src/types/index.ts` | TypeScript типы: `User`, `ChatMessage`, `Character`, `AuthResponse` |

---

## Environment Variables

```env
OPENROUTER_API_KEY=          # Обязательно
OPENROUTER_MODEL=            # Default: deepseek/deepseek-chat-v4-0324
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai      # Создать вручную: CREATE DATABASE morganai
JWT_SECRET=                  # Обязательно
JWT_EXPIRES_IN=7d
MINIMAX_API_TOKEN=           # Опционально — TTS голос
MINIMAX_VOICE_ID=            # Опционально — MiniMax voice ID
ADMIN_EMAILS=email@mail.com  # Через запятую
PORT=3001
CLIENT_URL=http://localhost:5173
```

В Docker `.env` отсутствует — env vars передаются через Docker environment config.

---

## Database Schema

**5 таблиц:** `users`, `characters`, `chat_history`, `subscriptions`, `voice_messages`

Все timestamps — **BIGINT миллисекунды** (`Date.now()`).

Ключевые поля:
- `users.behavior_mode`: `'default' | 'study' | 'work' | 'psychologist' | 'nsfw'`
- `users.selected_character`: slug (default `'morgan'`)
- `characters.slug`: URL-safe уникальный ID
- `chat_history`: composite index на `(user_id, character_slug, timestamp)`
- `voice_messages`: rate-limiting — max 20 за 5 часов на пользователя

---

## Design System — Yume & Nocturne

Дизайн: **manga/editorial dual-theme** — вдохновлён японскими манга и арт-журналами.

### Темы

| | Yume (светлая, default) | Nocturne (тёмная) |
|--|------------------------|-------------------|
| `--bg` | `#f5ecdc` (кремовый) | `#0e0807` (кофейный чёрный) |
| `--bg-alt` | `#ede2cd` | `#16100d` |
| `--fg` | `#2a1014` (тёмно-бордовый) | `#eee2c8` (кремовый) |
| `--accent` | `#5c1a1f` (бордо) | `#c63d2f` (алый) |
| `--accent2` | `#c8543b` (терракота) | `#c63d2f` |
| `--accent3` | `#e89478` (персиковый) | `#a8753a` (янтарный) |
| `--border` | `2.5px solid #2a1014` | `1px solid rgba(...)` |
| `--shadow-box` | `5px 5px 0 #2a1014` | `none` |

Переключение темы: добавление/удаление класса `html.dark`. Состояние хранится в `useThemeStore` (Pinia), сохраняется в `localStorage`.

### Шрифты

- `--font-display`: `'Fraunces', 'Noto Serif JP', serif` — заголовки, декоративные элементы, имена персонажей
- `--font-ui`: `'Inter', sans-serif` — интерфейс, тело текста
- `--font-mono`: системный monospace — лейблы, метки, технический текст

### Ключевые CSS-компоненты (`client/src/style.css`)

| Класс | Назначение |
|-------|-----------|
| `.editorial-label` | Метка секции: `ОЧ · РАЗДЕЛ` с иероглифом-декором |
| `.display-heading` | Большой serif-заголовок с letter-spacing |
| `.btn-primary` | Кнопка: `--bg` + тёмная обводка, `white-space: nowrap` |
| `.btn-ghost` | Кнопка-контур, `white-space: nowrap` |
| `.btn-sm` | Модификатор уменьшенного размера |
| `.nav-item` | Элемент навигации с hover/active состоянием |
| `.chat-bubble-user` | Пузырь сообщения пользователя (правый, `--bg-alt`) |
| `.chat-bubble-ai` | Пузырь AI (левый, `--bg`) |
| `.m-textarea` | Textarea для ввода сообщений |
| `.art-slot` | Слот под арт персонажа (диагональная штриховка) |
| `.washi-tape` | Декоративная "лента васи" (только в светлой теме) |
| `.theme-toggle` | Кнопка переключения темы (monospace, `СВЕТ`/`НОЧЬ`) |
| `.mode-card` | Карточка выбора режима с active состоянием |
| `.typing-dot` | Анимированная точка индикатора набора |
| `.animate-fade-in` | Плавное появление |

### Форматирование сообщений AI (ChatView.vue)

Сырой текст от AI проходит через `formatContent()`:
1. Удаляет `[VOICE: ...]` теги
2. `(мысль)` → `<span class="msg-thought">` (прозрачный, курсив)
3. `*действие*` → `<em class="msg-action">` (цвет `--accent3`, блочный)
4. Переносы `\n` → `<br>`

**Важно:** мысли (`(...)`) заменяются **до** курсива (`*...*`), иначе CSS-переменные типа `(--accent3)` будут ошибочно обёрнуты в `msg-thought`.

### Mobile Layout

- Root containers используют `height: 100dvh` (dynamic viewport height) для корректной работы с адресной строкой браузера на мобильных.
- Chat sidebar на мобильном: `position: fixed`, появляется по hamburger-кнопке с backdrop overlay.
- Settings sidebar на мобильном: горизонтальный скролируемый topbar.
- Кнопки с `white-space: nowrap` предотвращают перенос текста на мобильном.

---

## Conventions

- **Язык:** Весь user-facing текст и AI промпты — **на русском**
- **Timestamps:** Всегда миллисекунды (`Date.now()`)
- **API errors:** `{ error: "message" }` + HTTP status code
- **Route typing:** Routes используют `req: any` для обхода TypeScript strictness на `req.user`
- **Singletons:** Модули экспортируют экземпляры: `database`, `openrouterClient`, `memoryManager`, `minimaxTTS`
- **Pinia stores:** Composition API / setup function style
- **Chat streaming:** SSE через `POST /api/chat/stream`, не WebSocket
- **CSS:** TailwindCSS v4 + кастомные классы в `style.css` через `@layer components`
- **Vue компоненты:** `<script setup lang="ts">`, без Options API
- **SVG-иконки:** использовать inline SVG вместо emoji для кнопок интерфейса

---

## Character Response Format

```
*действие/эмоция курсивом*   — описание действий
Речь обычным текстом          — что говорит персонаж
(мысли в скобках)             — внутренние мысли
[VOICE: текст]                — генерируется MiniMax TTS
```

---

## Extending the System

**Добавить персонажа:** `INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, is_active, sort_order, created_at) VALUES (...)`

**Добавить режим поведения** — 4 места:
1. `server/src/prompt.ts` → добавить case в `getBehaviorPrompt()`
2. `client/src/views/ChatView.vue` → массив `modes` в модале настроек
3. `client/src/views/SettingsView.vue` → массив `modes`
4. `server/src/routes/user.routes.ts` → массив `validModes`

---

## Tарифы (PricingView.vue)

| Тариф | Цена | Особенности |
|-------|------|------------|
| Free | 0₽ | 50 сообщений/день, 20 голосовых/5ч |
| Premium | 299₽/мес или 2390₽/год | 500 сообщений/день, все персонажи |
| Premium+ | 599₽/мес или 4790₽/год | Безлимит голоса, расширенный контекст (100к токенов), приоритетная генерация |

Premium назначается администратором вручную через AdminView (нет интеграции оплаты).

---

## Known Limitations

- STT (speech-to-text) — placeholder в `voice.routes.ts`, не реализован
- Интеграция оплаты — Premium переключается вручную через AdminView
- Загруженные изображения передаются в AI, но не отображаются как превью в чате
- `avatar_url` в `characters` есть, но нет изображений
- Нет сброса пароля / верификации email
- Нет `express-rate-limit` на API-роутах
- История чата — последние 50 сообщений без пагинации
- Кнопка записи голоса в UI есть, но `MediaRecorder` не подключён
