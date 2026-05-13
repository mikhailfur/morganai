# AGENTS.md — Morgan AI Project Context

## Project Overview

**Morgan AI** — веб-платформа для ролевых игр с AI-персонажами. Пользователи общаются с уникальными AI-персонажами через чат с поддержкой голосовых сообщений, загрузки изображений и различных режимов поведения.

Проект мигрирован из Telegram-бота [alyabot](https://github.com/mikhailfur/alyabot/tree/beta) в полноценное веб-приложение.

---

## Tech Stack

### Backend (`server/`)
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MySQL (mysql2/promise, connection pool)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **AI:** OpenRouter API (модель `deepseek/deepseek-chat-v4-0324`)
- **TTS:** MiniMax API (`speech-2.6-turbo`)
- **File uploads:** multer (memory storage)
- **Dev runner:** tsx (watch mode)

### Frontend (`client/`)
- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **Build tool:** Vite
- **Styling:** TailwindCSS v4 (via `@tailwindcss/vite` plugin)
- **State management:** Pinia
- **Routing:** Vue Router 4
- **Языки:** TypeScript

---

## Project Structure

```
morganai/
├── .env.example                 # Пример переменных окружения
├── .gitignore
├── package.json                 # Root scripts (concurrently)
│
├── server/                      # === BACKEND ===
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Express сервер, CORS, middleware, routes
│       ├── config.ts            # Чтение .env, интерфейс Config, валидация
│       ├── database.ts          # MySQL pool, CREATE TABLE, CRUD-методы, seed персонажа
│       ├── auth.ts              # JWT: hash/compare/generate/verify, authMiddleware, adminMiddleware
│       ├── openrouter.ts        # OpenRouter client: generateResponse, generateStreamResponse, analyzeImage
│       ├── memory.ts            # MemoryManager: formatChatHistory, buildMessages (20 сообщений, 12000 chars)
│       ├── prompt.ts            # getBehaviorPrompt(): режимы + NSFW фильтр + лимит голосовых
│       ├── voice.ts             # MiniMaxTTS: generateSpeech() → Buffer (mp3)
│       └── routes/
│           ├── auth.routes.ts   # POST /register, POST /login, GET /me
│           ├── chat.routes.ts   # POST /send, POST /stream (SSE), GET /history, DELETE /clear
│           ├── image.routes.ts  # POST /upload (multer + OpenRouter vision)
│           ├── voice.routes.ts  # POST /generate (TTS), POST /upload (STT placeholder)
│           ├── user.routes.ts   # GET /stats, PUT /settings, GET /characters
│           └── admin.routes.ts  # GET /stats, GET /users, PUT /user/:id/premium
│
├── client/                      # === FRONTEND ===
│   ├── index.html               # Inter font, SEO meta, theme-color
│   ├── vite.config.ts           # Vue + TailwindCSS plugins, proxy /api → :3001
│   ├── package.json
│   └── src/
│       ├── main.ts              # createApp + Pinia + Router
│       ├── App.vue              # <RouterView />
│       ├── style.css            # Дизайн-система: CSS variables, glass-card, btn-primary, chat-bubble, animations
│       ├── types/
│       │   └── index.ts         # User, ChatMessage, Character, AuthResponse
│       ├── stores/
│       │   ├── auth.ts          # useAuthStore: login, register, fetchUser, logout, updateSettings
│       │   └── chat.ts          # useChatStore: sendMessage (SSE stream), sendImage, fetchHistory, clearHistory
│       ├── router/
│       │   └── index.ts         # Routes с auth guards
│       └── views/
│           ├── LandingPage.vue  # Hero + chat preview + features + CTA
│           ├── LoginView.vue    # Форма входа
│           ├── RegisterView.vue # Форма регистрации
│           ├── ChatView.vue     # Основной чат: sidebar, messages, input, voice, image, settings modal
│           ├── SettingsView.vue # Режимы поведения, инфо аккаунта
│           └── AdminView.vue    # Статистика, таблица пользователей, Premium toggle
```

---

## Database Schema (MySQL)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK AUTO_INCREMENT | |
| email | VARCHAR(255) UNIQUE | |
| username | VARCHAR(255) | |
| password_hash | VARCHAR(255) | bcrypt, 12 rounds |
| avatar_url | VARCHAR(500) NULL | |
| is_premium | BOOLEAN | default 0 |
| is_admin | BOOLEAN | auto-set by ADMIN_EMAILS |
| subscription_until | BIGINT NULL | timestamp ms |
| behavior_mode | VARCHAR(50) | 'default' / 'study' / 'work' / 'psychologist' / 'nsfw' |
| selected_character | VARCHAR(100) | default 'morgan' |
| trial_used | BOOLEAN | default 0 |
| total_messages | INT | auto-incremented |
| created_at | BIGINT | timestamp ms |
| last_active | BIGINT NULL | timestamp ms |

### `characters`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| slug | VARCHAR(100) UNIQUE | URL-safe identifier |
| name | VARCHAR(255) | display name |
| description | TEXT | |
| avatar_url | VARCHAR(500) NULL | |
| system_prompt | TEXT | полный промпт персонажа |
| greeting_message | TEXT NULL | первое сообщение |
| is_premium | BOOLEAN | |
| is_active | BOOLEAN | |
| sort_order | INT | |
| created_at | BIGINT | |

### `chat_history`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| user_id | INT FK → users | CASCADE DELETE |
| character_slug | VARCHAR(100) | default 'morgan' |
| role | ENUM('user','assistant') | |
| content | TEXT | max 10000 chars |
| has_voice | BOOLEAN | |
| has_image | BOOLEAN | |
| image_url | VARCHAR(500) NULL | |
| timestamp | BIGINT | |
| INDEX | (user_id, character_slug, timestamp) | composite |

### `subscriptions`
| Column | Type |
|--------|------|
| id | INT PK |
| user_id | INT FK → users |
| plan | VARCHAR(50) |
| started_at | BIGINT |
| expires_at | BIGINT |
| is_active | BOOLEAN |

### `voice_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| user_id | INT | |
| timestamp | BIGINT | для rate-limiting (20 за 5 часов) |

---

## API Routes

### Auth (public)
| Method | Route | Body | Response |
|--------|-------|------|----------|
| POST | `/api/auth/register` | `{ email, username, password }` | `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | — (Bearer token) | `User` object |

### Chat (auth required)
| Method | Route | Body/Query | Response |
|--------|-------|------------|----------|
| POST | `/api/chat/send` | `{ message, characterSlug? }` | `{ response, voiceUrl?, characterName }` |
| POST | `/api/chat/stream` | `{ message, characterSlug? }` | SSE: `data: { text }` chunks, then `data: { voice }`, then `data: [DONE]` |
| GET | `/api/chat/history` | `?character=slug&limit=50` | `{ messages: [] }` |
| DELETE | `/api/chat/clear` | `?character=slug` | `{ success: true }` |

### Image (auth required, Premium only)
| Method | Route | Body | Response |
|--------|-------|------|----------|
| POST | `/api/image/upload` | FormData: `image` file + `message` + `characterSlug` | `{ response, characterName }` |

### Voice (auth required, Premium only)
| Method | Route | Body | Response |
|--------|-------|------|----------|
| POST | `/api/voice/generate` | `{ text }` | audio/mp3 binary |
| POST | `/api/voice/upload` | FormData: `audio` file | `{ transcription }` |

### User (auth required)
| Method | Route | Body | Response |
|--------|-------|------|----------|
| GET | `/api/user/stats` | — | stats object |
| PUT | `/api/user/settings` | `{ behavior_mode?, selected_character? }` | updated settings |
| GET | `/api/user/characters` | — | `{ characters: [] }` |

### Admin (auth + admin required)
| Method | Route | Body | Response |
|--------|-------|------|----------|
| GET | `/api/admin/stats` | — | `{ total_users, premium_users, active_users, total_messages }` |
| GET | `/api/admin/users` | `?page=0` | `{ users, total, page, pages }` |
| PUT | `/api/admin/user/:id/premium` | `{ is_premium, months? }` | `{ success }` |

### Health
| GET | `/api/health` | — | `{ status: 'ok', timestamp }` |

---

## Environment Variables

```env
OPENROUTER_API_KEY=          # Required — OpenRouter API key
OPENROUTER_MODEL=            # Default: deepseek/deepseek-chat-v4-0324
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai
JWT_SECRET=                  # Required — random string for JWT signing
JWT_EXPIRES_IN=7d
MINIMAX_API_TOKEN=           # Optional — for TTS voice messages
MINIMAX_VOICE_ID=            # Optional — MiniMax voice ID
ADMIN_EMAILS=admin@mail.com  # Comma-separated admin emails
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## Key Architectural Decisions

### AI Response Flow
1. User sends message → `POST /api/chat/stream`
2. Server loads user + character + chat history (last 20 messages)
3. System prompt = `character.system_prompt` + `getBehaviorPrompt(mode, voiceCount)`
4. MemoryManager formats history (max 12000 chars) + appends user message
5. OpenRouterClient streams response via SSE (`data: { text: "chunk" }`)
6. Server parses `[VOICE: ...]` tags → calls MiniMax TTS → sends voice as base64
7. Full response saved to `chat_history`

### Character System
- Characters stored in MySQL `characters` table
- Each has a `slug` (URL-safe ID), `system_prompt`, and optional `greeting_message`
- Default character "Morgan" is seeded on DB init
- Users select character via `selected_character` field
- Premium characters gated by `is_premium` flag
- **Adding a new character = INSERT into `characters` table with a system_prompt**

### Behavior Modes
- `default` — standard RP with NSFW filter
- `study` — tutor mode, no voice for formulas
- `work` — business/planning assistant
- `psychologist` — emotional support, gentle tone
- `nsfw` — adult content allowed (Premium only)

### Voice System
- AI may include `[VOICE: text]` tags in responses (10-15% of messages)
- Pause markers `<#X#>` are stripped before TTS
- Rate limited: tracked per user, 20 per 5 hours
- TTS via MiniMax API → hex-encoded audio → Buffer → base64 data URL
- Voice feature requires Premium

### NSFW Filter
- Non-NSFW modes: AI instructed to return `[NSFW_BLOCKED]` for explicit content
- Server checks response for this tag and returns appropriate error message
- NSFW mode: filter disabled, Premium only

### Auth Flow
- Register: email + username + password (min 6 chars) → bcrypt hash (12 rounds) → JWT
- Login: email + password → verify hash → JWT
- Token stored in `localStorage` as `morgan_token`
- Bearer token sent in `Authorization` header
- Admin status auto-assigned if email in `ADMIN_EMAILS` env var

---

## Design System (CSS)

The design uses a **dark theme** with purple/pink gradients:

- **Background:** `#0a0a0f` (near-black)
- **Primary:** `#8b5cf6` (purple)
- **Accent:** `#f472b6` (pink)
- **Gradient:** `#667eea → #764ba2 → #f093fb`
- **Glass cards:** semi-transparent with `backdrop-filter: blur(16px)`
- **Font:** Inter (Google Fonts)
- **Animations:** slideIn, fadeIn, typingBounce, pulseRing, floatParticle, shimmer

Key CSS classes:
- `.glass-card` — glassmorphism card with hover glow
- `.gradient-text` — gradient text fill
- `.btn-primary` — gradient pink→purple button with hover lift
- `.btn-ghost` — outline button
- `.input-field` — dark input with purple focus ring
- `.chat-bubble-user` / `.chat-bubble-ai` — message bubbles with slide animations
- `.typing-indicator` — three bouncing dots
- `.mode-card` — selectable card with active state
- `.particle` — floating background particles

---

## Development Commands

```bash
# Install all dependencies
cd server && npm install
cd client && npm install

# Start backend (port 3001)
cd server && npm run dev

# Start frontend (port 5173, proxies /api to :3001)
cd client && npm run dev

# Type check
cd server && npx tsc --noEmit
cd client && npx vue-tsc --noEmit

# Build
cd server && npm run build
cd client && npm run build
```

---

## Conventions

- **Language:** All user-facing text and AI prompts are in **Russian**
- **Timestamps:** All timestamps stored as **milliseconds** (Date.now())
- **API errors:** `{ error: "message" }` with appropriate HTTP status codes
- **Auth:** All protected routes use `req.user.userId` from JWT payload
- **Route typing:** Routes use `req: any` to avoid TypeScript strictness on `req.user`
- **Exports:** Modules export singleton instances (`database`, `openrouterClient`, `memoryManager`, `minimaxTTS`)
- **Frontend state:** Pinia stores with Composition API (`defineStore` + setup function syntax)
- **Chat streaming:** SSE (Server-Sent Events) via `POST /api/chat/stream`, NOT WebSocket

---

## Known Limitations / TODO

- [ ] Speech-to-text (STT) — placeholder, needs Whisper API integration
- [ ] Payment integration — Premium is manually toggled by admin, no Stripe/payment yet
- [ ] Push notifications — not implemented (replacing Telegram's proactive messages)
- [ ] Image preview in chat — images sent but not displayed as thumbnails
- [ ] Character avatar images — avatar_url field exists but no images seeded
- [ ] Password reset / email verification — not implemented
- [ ] Rate limiting on API routes — no express-rate-limit yet
- [ ] Production deployment config — no Docker/nginx setup yet
- [ ] Chat message pagination / infinite scroll — loads last 50 only
- [ ] Voice recording in browser — button exists but MediaRecorder not wired up
