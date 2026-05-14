<div align="center">

# Morgan AI

**Веб-платформа для ролевых игр с AI-компаньонами**

[![Branch: dev](https://img.shields.io/badge/branch-dev-8B2FC9?style=flat-square)](https://github.com/mikhailfur/morganai/tree/dev)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fmikhailfur%2Fmorganai-2496ED?style=flat-square&logo=docker)](https://github.com/mikhailfur/morganai/pkgs/container/morganai)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/mikhailfur/morganai/deploy.yml?branch=dev&style=flat-square&label=deploy)](https://github.com/mikhailfur/morganai/actions)
[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Vue](https://img.shields.io/badge/Vue-3-42b883?style=flat-square&logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

*Общение с уникальными AI-персонажами через текст, голос и изображения*

---

</div>

## О проекте

Morgan AI — веб-платформа для погружённых ролевых разговоров с AI-персонажами. Пользователи общаются с компаньонами через стриминговый чат с поддержкой текстовых сообщений, голосовых ответов (TTS) и анализа изображений. Проект мигрирован из Telegram-бота [alyabot](https://github.com/mikhailfur/alyabot) в полноценное веб-приложение.

### Ключевые возможности

- **Стриминговый чат** — ответы AI приходят потоком (SSE), без задержки ожидания
- **Голосовые ответы** — персонаж озвучивает части ответа через MiniMax TTS (тег `[VOICE: ...]`)
- **Анализ изображений** — отправка фото в чат, AI видит и комментирует
- **Режимы поведения** — `default`, `study`, `work`, `psychologist`, `nsfw`
- **Dual-theme дизайн** — Yume (светлая) и Nocturne (тёмная) темы в manga/editorial стиле
- **Мобильная адаптация** — полноценный mobile-first layout с `100dvh`
- **Многопользовательская система** — JWT-авторизация, тарифы Free/Premium/Premium+
- **Панель администратора** — управление пользователями, подписками, статистика

---

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Backend** | Node.js 20 · Express · TypeScript · mysql2/promise |
| **Frontend** | Vue 3 (`<script setup>`) · Vite · TailwindCSS v4 · Pinia · Vue Router 4 |
| **AI** | OpenRouter API · `deepseek/deepseek-chat-v4-0324` · SSE streaming |
| **TTS** | MiniMax API · `speech-2.6-turbo` |
| **Auth** | JWT · bcryptjs · jsonwebtoken |
| **Uploads** | multer |
| **Container** | Docker (multi-stage) · GitHub Container Registry |
| **Deploy** | GitHub Actions → GHCR → Dokploy |

---

## Архитектура

### Поток запроса (стриминг чата)

```
POST /api/chat/stream { message, characterSlug }
  → Load user + character + last 20 messages from DB
  → system_prompt = character.system_prompt + getBehaviorPrompt(mode, voiceCount)
  → MemoryManager.buildMessages()  ←  trim до 12 000 символов
  → OpenRouterClient.generateStreamResponse()
       ↓ SSE: data: { text: "chunk" }
  → Parse [VOICE: text]  →  MiniMaxTTS.generateSpeech()
       ↓ SSE: data: { voice: "<base64 mp3>" }
  → SSE: data: [DONE]
  → Save full response → chat_history
```

### Структура проекта

```
morganai/
├── client/                  # Vue 3 SPA
│   ├── src/
│   │   ├── views/           # LandingPage, ChatView, SettingsView, AdminView…
│   │   ├── stores/          # Pinia: auth, theme
│   │   ├── router/          # Vue Router 4
│   │   ├── types/           # TypeScript типы
│   │   └── style.css        # Дизайн-система (CSS variables + компоненты)
│   └── vite.config.ts       # Прокси /api → :3001
├── server/                  # Express API
│   └── src/
│       ├── routes/          # auth, chat, user, admin, image, voice
│       ├── auth.ts          # JWT middleware
│       ├── database.ts      # MySQL pool + schema + seed
│       ├── openrouter.ts    # OpenRouter client (stream, vision)
│       ├── memory.ts        # История: max 20 сообщений / 12k символов
│       ├── prompt.ts        # getBehaviorPrompt() — режимы и фильтры
│       └── voice.ts         # MiniMax TTS
├── Dockerfile               # Multi-stage: client build → server build → final
├── docker-compose.yml       # Локальная разработка: db + server + client
├── .github/workflows/
│   └── deploy.yml           # Push dev → Docker image → Dokploy webhook
└── Docs/                    # Гайды и changelog
```

### База данных (MySQL)

**5 таблиц** · все timestamps — **BIGINT миллисекунды** (`Date.now()`)

| Таблица | Назначение |
|---------|-----------|
| `users` | Аккаунты, режим поведения, выбранный персонаж |
| `characters` | Персонажи: slug, промпт, приветствие, флаги premium/active |
| `chat_history` | История сообщений (индекс на `user_id, character_slug, timestamp`) |
| `subscriptions` | Подписки пользователей |
| `voice_messages` | Rate-limit голосовых: max 20 за 5 часов |

---

## Дизайн-система — Yume & Nocturne

Вдохновлён японскими манга и арт-журналами. Два контрастных варианта.

| | **Yume** (светлая, default) | **Nocturne** (тёмная) |
|--|---------------------------|----------------------|
| Фон | `#f5ecdc` — тёплый кремовый | `#0e0807` — кофейный чёрный |
| Текст | `#2a1014` — тёмно-бордовый | `#eee2c8` — кремовый |
| Акцент | `#5c1a1f` — бордо | `#c63d2f` — алый |
| Рамки | `2.5px solid #2a1014` | `1px solid rgba(...)` |
| Тени | `5px 5px 0 #2a1014` | нет |

**Шрифты:** `Fraunces` + `Noto Serif JP` — заголовки · `Inter` — UI · monospace — лейблы

Переключение темы: класс `html.dark` · хранится в Pinia `useThemeStore` + `localStorage`.

### Формат ответа персонажа

```
*действие или эмоция курсивом*      →  <em class="msg-action">
Речь обычным текстом                →  plain text
(внутренняя мысль)                  →  <span class="msg-thought">
[VOICE: текст для озвучки]          →  генерируется MiniMax TTS → base64 mp3
```

---

## Быстрый старт

### Требования

- Node.js 20+
- MySQL 8+ (база `morganai` создаётся вручную: `CREATE DATABASE morganai;`)
- API-ключи: OpenRouter (обязательно), MiniMax TTS (опционально)

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/mikhailfur/morganai.git
cd morganai

# 2. Установить зависимости
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. Создать файл переменных окружения
cp .env.example .env
# Заполнить .env (см. раздел ниже)

# 4. Запустить (оба сервиса одновременно)
npm run dev
```

Клиент: [http://localhost:5173](http://localhost:5173)  
API: [http://localhost:3001](http://localhost:3001)

### Docker (локальная разработка)

```bash
docker compose up -d
```

### Переменные окружения

```env
# Обязательные
OPENROUTER_API_KEY=sk-or-...
JWT_SECRET=your-long-random-secret

# База данных
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai

# Опциональные
OPENROUTER_MODEL=deepseek/deepseek-chat-v4-0324
JWT_EXPIRES_IN=7d
MINIMAX_API_TOKEN=           # TTS голос
MINIMAX_VOICE_ID=            # MiniMax voice ID
ADMIN_EMAILS=you@mail.com    # Через запятую
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## Команды разработки

```bash
# Dev-сервер (оба сервиса)
npm run dev

# По отдельности
cd server && npm run dev     # Express на :3001, tsx watch mode
cd client && npm run dev     # Vite на :5173

# Проверка типов — запускать перед коммитом
cd server && npx tsc --noEmit
cd client && npx vue-tsc --noEmit

# Сборка
npm run build                # оба
cd server && npm run build   # → server/dist/
cd client && npm run build   # → client/dist/
```

---

## CI/CD

```
push → dev
  ↓
GitHub Actions (.github/workflows/deploy.yml)
  ↓
Docker multi-stage build
  ↓
Push → ghcr.io/mikhailfur/morganai:latest + :sha
  ↓
POST → DOKPLOY_WEBHOOK_URL  →  Dokploy redeploy
```

> Docker-пакет `ghcr.io/mikhailfur/morganai` должен быть **публичным** — Dokploy не аутентифицируется при pull.

---

## Тарифы

| Тариф | Цена | Сообщений/день | Голосовых | Особенности |
|-------|------|----------------|-----------|------------|
| **Free** | 0 ₽ | 50 | 20 / 5ч | Базовый доступ |
| **Premium** | 299 ₽/мес · 2390 ₽/год | 500 | 20 / 5ч | Все персонажи |
| **Premium+** | 599 ₽/мес · 4790 ₽/год | Безлимит | Безлимит | 100к токенов контекста, приоритет |

Premium назначается администратором вручную через AdminView.

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `server/src/config.ts` | Читает `.env` из корня; путь `../../.env` от `dist/` |
| `server/src/database.ts` | MySQL pool · CREATE TABLE · seed персонажа "Morgan" |
| `server/src/auth.ts` | bcrypt · JWT sign/verify · authMiddleware · adminMiddleware |
| `server/src/openrouter.ts` | OpenRouter: generate, stream, analyzeImage |
| `server/src/memory.ts` | История: max 20 сообщений / 12 000 символов |
| `server/src/prompt.ts` | `getBehaviorPrompt()` — режим + NSFW фильтр + лимит голосовых |
| `server/src/voice.ts` | MiniMax TTS: hex → Buffer → mp3 |
| `client/src/style.css` | Дизайн-система: CSS variables, компоненты, анимации |
| `client/src/types/index.ts` | TypeScript типы: `User`, `ChatMessage`, `Character`, `AuthResponse` |

---

## Известные ограничения

- STT (speech-to-text) — placeholder в `voice.routes.ts`, не реализован
- Интеграция оплаты — Premium переключается вручную через AdminView
- Кнопка записи голоса в UI есть, но `MediaRecorder` не подключён
- JWT хранится в `localStorage` (уязвимость XSS — запланирована миграция на httpOnly cookie)
- Нет rate-limiting на API-роутах (`express-rate-limit`)
- История чата — последние 50 сообщений, без пагинации
- Лимиты сообщений объявлены в тарифах, но на сервере не применяются

---

<div align="center">

*Разработка ведётся в ветке [`dev`](https://github.com/mikhailfur/morganai/tree/dev)*

</div>
