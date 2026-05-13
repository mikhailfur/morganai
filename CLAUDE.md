# CLAUDE.md — Morgan AI Project Context

Этот файл содержит полный контекст проекта для Claude и других AI-ассистентов.

## Что это за проект

Morgan AI — веб-платформа для ролевых игр (RP) с AI-персонажами. Пользователь общается с AI-компаньонами через чат с поддержкой текста, голосовых сообщений и изображений. Проект мигрирован из Telegram-бота (github.com/mikhailfur/alyabot) в веб-приложение.

## Стек технологий

- **Backend:** Node.js + Express + TypeScript, MySQL (mysql2/promise), JWT auth (bcryptjs + jsonwebtoken)
- **Frontend:** Vue 3 (Composition API, `<script setup>`) + TailwindCSS v4 + Pinia + Vue Router
- **AI:** OpenRouter API (модель `deepseek/deepseek-chat-v4-0324`), стриминг через SSE
- **TTS:** MiniMax API (`speech-2.6-turbo`) для генерации голосовых сообщений
- **Сборка:** Vite (фронт), tsx (бэк, watch mode)

## Структура

```
morganai/
├── server/src/
│   ├── index.ts           # Express app: CORS, middleware, routes подключение
│   ├── config.ts          # .env → Config интерфейс (openrouter, mysql, jwt, minimax, admin)
│   ├── database.ts        # MySQL pool, все таблицы (users, characters, chat_history, subscriptions, voice_messages)
│   ├── auth.ts            # bcrypt hash/compare, JWT generate/verify, authMiddleware, adminMiddleware
│   ├── openrouter.ts      # OpenRouterClient: generateResponse, generateStreamResponse (SSE), analyzeImage (vision)
│   ├── memory.ts          # MemoryManager: обрезка истории до 20 сообщений / 12000 chars
│   ├── prompt.ts          # getBehaviorPrompt(): добавляет к system prompt режим + NSFW фильтр + voice limit
│   ├── voice.ts           # MiniMaxTTS: generateSpeech() → Buffer mp3 (hex → buffer)
│   └── routes/
│       ├── auth.routes.ts   # POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
│       ├── chat.routes.ts   # POST /send (non-stream), POST /stream (SSE), GET /history, DELETE /clear
│       ├── image.routes.ts  # POST /upload — multer + OpenRouter vision (Premium only)
│       ├── voice.routes.ts  # POST /generate (TTS), POST /upload (STT placeholder)
│       ├── user.routes.ts   # GET /stats, PUT /settings, GET /characters
│       └── admin.routes.ts  # GET /stats, GET /users, PUT /user/:id/premium
│
├── client/src/
│   ├── main.ts            # createApp + Pinia + Router
│   ├── App.vue            # <RouterView />
│   ├── style.css          # Полная дизайн-система: CSS variables, glassmorphism, градиенты, анимации
│   ├── types/index.ts     # TypeScript типы: User, ChatMessage, Character, AuthResponse
│   ├── stores/auth.ts     # Pinia: login/register/logout/fetchUser/updateSettings, token в localStorage
│   ├── stores/chat.ts     # Pinia: sendMessage (SSE streaming), sendImage, fetchHistory, clearHistory, fetchCharacters
│   ├── router/index.ts    # Маршруты с auth guards (beforeEach проверяет token)
│   └── views/
│       ├── LandingPage.vue  # Hero section + chat preview mockup + features grid + CTA
│       ├── LoginView.vue    # Форма email + password
│       ├── RegisterView.vue # Форма email + username + password
│       ├── ChatView.vue     # Главный вид: sidebar (персонажи), сообщения, ввод, голос, фото, settings modal
│       ├── SettingsView.vue # Карточки режимов поведения + инфо аккаунта
│       └── AdminView.vue    # Статистика (4 карточки) + таблица пользователей + Premium toggle
```

## База данных (MySQL)

**5 таблиц:**

1. **users** — email (unique), username, password_hash (bcrypt 12), is_premium, is_admin, behavior_mode, selected_character, total_messages, timestamps
2. **characters** — slug (unique), name, system_prompt, greeting_message, is_premium, is_active, sort_order
3. **chat_history** — user_id (FK), character_slug, role (user/assistant), content (max 10000), has_voice, has_image, timestamp. Composite index: (user_id, character_slug, timestamp)
4. **subscriptions** — user_id (FK), plan, started_at, expires_at, is_active
5. **voice_messages** — user_id, timestamp (для rate limiting: 20 за 5 часов)

Все timestamps хранятся как **BIGINT** (миллисекунды, `Date.now()`).

Дефолтный персонаж **Морган** сидится автоматически при `database.init()`.

## Как работает чат (главный flow)

```
1. Юзер → POST /api/chat/stream { message, characterSlug }
2. Сервер загружает: user, character, chat_history (20 последних), voiceCount
3. system_prompt = character.system_prompt + getBehaviorPrompt(mode, voiceCount)
4. MemoryManager форматирует историю (≤12000 chars) + текущее сообщение
5. OpenRouterClient.generateStreamResponse() → SSE chunks: data: { text: "..." }
6. Если в ответе есть [VOICE: текст] и юзер Premium → MiniMax TTS → data: { voice: base64 }
7. data: [DONE]
8. Полный ответ сохраняется в chat_history
```

## Система персонажей

- Персонажи хранятся в таблице `characters`
- Каждый имеет `slug` (URL-safe ID) и `system_prompt`
- По умолчанию есть "Морган" — харизматичный, саркастичный, но добрый AI-компаньон
- Юзер выбирает персонажа через sidebar → `PUT /api/user/settings { selected_character }`
- Premium-персонажи доступны только платным юзерам
- **Добавить нового персонажа = INSERT в таблицу characters**

### Формат ответов персонажа

```
*действие/эмоция курсивом*          — описание действий
Речь обычным текстом                 — что говорит персонаж
(мысли в скобках)                    — внутренние мысли
[VOICE: текст голосового]            — генерируется MiniMax TTS
```

## Режимы поведения

| Режим | ID | Premium? | Описание |
|-------|-----|----------|----------|
| Обычный | `default` | Нет | Стандартное RP с NSFW фильтром |
| Учёба | `study` | Нет | Репетитор, помощь с заданиями |
| Работа | `work` | Нет | Деловой помощник |
| Психолог | `psychologist` | Нет | Эмоциональная поддержка |
| NSFW | `nsfw` | **Да** | Без фильтра (18+) |

## Аутентификация

- **Регистрация:** email + username + password (≥6 chars) → bcrypt hash (12 rounds) → JWT
- **Логин:** email + password → verify → JWT
- **JWT payload:** `{ userId, email }`, expires in 7d
- **Storage:** `localStorage.morgan_token`
- **Header:** `Authorization: Bearer <token>`
- **Admin:** email совпадает с `ADMIN_EMAILS` env var → `is_admin = true`

## Дизайн

**Тёмная тема** с фиолетово-розовыми акцентами:

- Фон: `#0a0a0f`, карточки: `rgba(15, 15, 25, 0.8)` с `backdrop-filter: blur(16px)`
- Градиент: `#667eea → #764ba2 → #f093fb`
- Кнопки: розово-фиолетовый градиент с hover-подъёмом и glow
- Сообщения user: фиолетовый градиент, скругление 18/18/4/18
- Сообщения AI: тёмная карточка с border, скругление 18/18/18/4
- Шрифт: Inter (Google Fonts)
- Анимации: slideIn, fadeIn, typingBounce, pulseRing, floatParticle

## Переменные окружения (.env)

```
OPENROUTER_API_KEY=          # Обязательно — ключ OpenRouter
OPENROUTER_MODEL=            # По умолчанию: deepseek/deepseek-chat-v4-0324
MYSQL_HOST=localhost          # MySQL хост
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai       # БД создаётся вручную: CREATE DATABASE morganai
JWT_SECRET=                   # Обязательно — случайная строка
JWT_EXPIRES_IN=7d
MINIMAX_API_TOKEN=            # Опционально — для TTS
MINIMAX_VOICE_ID=             # Опционально — голос MiniMax
ADMIN_EMAILS=admin@mail.com   # Через запятую
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Команды для разработки

```bash
# Бэкенд (порт 3001)
cd server && npm install && npm run dev

# Фронтенд (порт 5173, проксирует /api → :3001)
cd client && npm install && npm run dev

# Проверка типов
cd server && npx tsc --noEmit
cd client && npx vue-tsc --noEmit

# Сборка
cd server && npm run build     # → server/dist/
cd client && npm run build     # → client/dist/
```

## Правила и конвенции

1. **Язык интерфейса и промптов** — русский
2. **Timestamps** — всегда миллисекунды (`Date.now()`)
3. **API ошибки** — формат `{ error: "текст" }` + HTTP status code
4. **Роуты** — `req: any` чтобы обойти строгую типизацию `req.user`
5. **Синглтоны** — модули экспортируют инстансы: `database`, `openrouterClient`, `memoryManager`, `minimaxTTS`
6. **Pinia stores** — Composition API / setup function стиль
7. **Чат стриминг** — SSE (Server-Sent Events) через `POST /api/chat/stream`, НЕ WebSocket
8. **Файл .env** — лежит в корне (`morganai/.env`), читается из `server/src/config.ts` через `path.join(__dirname, '..', '..', '.env')`
9. **CSS** — TailwindCSS v4 + кастомные CSS классы в `style.css` (через `@layer components`)
10. **Vue компоненты** — `<script setup lang="ts">`, без Options API

## Известные ограничения / TODO

- **STT** — речь в текст не реализована (placeholder в voice.routes.ts)
- **Оплата** — Premium управляется вручную через админку, нет Stripe
- **Push-уведомления** — нет (в Telegram были проактивные сообщения)
- **Превью изображений** — изображения отправляются, но не показываются в чате
- **Аватары персонажей** — поле `avatar_url` есть, но картинки не загружены
- **Сброс пароля / верификация email** — не реализовано
- **Rate limiting** — нет express-rate-limit на API роутах
- **Docker / production** — нет конфигурации для деплоя
- **Пагинация чата** — загружает только последние 50 сообщений
- **Запись голоса** — кнопка есть, но MediaRecorder не подключён

## Как добавить нового персонажа

Вставить в MySQL:

```sql
INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, is_active, sort_order, created_at)
VALUES (
  'character-slug',
  'Имя Персонажа',
  'Краткое описание',
  'Полный system prompt с правилами поведения, форматом ответов, примерами...',
  'Приветственное сообщение при первом контакте',
  0,    -- 1 для Premium
  1,    -- active
  2,    -- порядок сортировки
  UNIX_TIMESTAMP() * 1000
);
```

## Как добавить новый режим поведения

1. Добавить case в `server/src/prompt.ts` → `getBehaviorPrompt()`
2. Добавить в массив `modes` в `client/src/views/ChatView.vue` (settings modal)
3. Добавить в массив `modes` в `client/src/views/SettingsView.vue`
4. Добавить в валидацию `validModes` в `server/src/routes/user.routes.ts`
