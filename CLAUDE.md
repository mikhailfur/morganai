# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Morgan AI** — веб-платформа для ролевых игр с AI-персонажами. Пользователи общаются с AI-компаньонами через чат с поддержкой текста, голосовых сообщений и изображений. Мигрировано из Telegram-бота ([alyabot](https://github.com/mikhailfur/alyabot)) в веб-приложение.

## Development Commands

```bash
# Run both server and client concurrently from root
npm run dev

# Or individually:
cd server && npm run dev     # Express on port 3001 (tsx watch mode)
cd client && npm run dev     # Vite on port 5173 (proxies /api → :3001)

# Type check
cd server && npx tsc --noEmit
cd client && npx vue-tsc --noEmit

# Build
npm run build                # builds both
cd server && npm run build   # → server/dist/
cd client && npm run build   # → client/dist/
```

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, MySQL (mysql2/promise), JWT (bcryptjs + jsonwebtoken), multer
- **Frontend:** Vue 3 (`<script setup>`) + TailwindCSS v4 + Pinia + Vue Router 4
- **AI:** OpenRouter API (default model: `deepseek/deepseek-chat-v4-0324`), SSE streaming
- **TTS:** MiniMax API (`speech-2.6-turbo`)

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

The root `Dockerfile` builds a **single container** (multi-stage):
1. `client-builder` — Vue build → `/client/dist`
2. `server-builder` — tsc build → `/server/dist`
3. Final image — Express serves both API routes and static Vue files from `/app/public/`

In production, `CLIENT_URL=*` triggers `origin: true` in CORS (wildcard string doesn't work with `credentials: true`).

### CI/CD (GitHub Actions → Dokploy)

File: `.github/workflows/deploy.yml` — triggers on push to `dev` branch:
1. Build + push Docker image to `ghcr.io/mikhailfur/morganai` (`:latest` + `:sha`)
2. POST to `${{ secrets.DOKPLOY_WEBHOOK_URL }}` — triggers Dokploy redeploy

Required GitHub secret: `DOKPLOY_WEBHOOK_URL` (from Dokploy panel → app → Deploy Webhook).
The `ghcr.io/mikhailfur/morganai` package must be **public** so Dokploy can pull without auth.

`docker-compose.yml` in root is for local multi-service dev (db + server + client as separate services).

## Key Files

| File | Purpose |
|------|---------|
| `server/src/config.ts` | Reads `.env` from repo root; path is `../../.env` relative to compiled `dist/` |
| `server/src/database.ts` | MySQL pool + all CREATE TABLE statements + seed for default "Morgan" character |
| `server/src/auth.ts` | bcrypt hash/compare, JWT sign/verify, `authMiddleware`, `adminMiddleware` |
| `server/src/openrouter.ts` | OpenRouter client: generate, stream, analyzeImage (vision) |
| `server/src/memory.ts` | Formats chat history: max 20 messages, max 12000 chars |
| `server/src/prompt.ts` | `getBehaviorPrompt()` — appends behavior mode + NSFW filter + voice limit |
| `server/src/voice.ts` | MiniMax TTS: hex response → Buffer → mp3 |
| `client/src/style.css` | Full design system: CSS variables, `.glass-card`, `.btn-primary`, `.chat-bubble-*`, animations |

## Environment Variables

```env
OPENROUTER_API_KEY=          # Required
OPENROUTER_MODEL=            # Default: deepseek/deepseek-chat-v4-0324
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=morganai      # Create manually: CREATE DATABASE morganai
JWT_SECRET=                  # Required
JWT_EXPIRES_IN=7d
MINIMAX_API_TOKEN=           # Optional — TTS voice
MINIMAX_VOICE_ID=            # Optional — MiniMax voice ID
ADMIN_EMAILS=email@mail.com  # Comma-separated
PORT=3001
CLIENT_URL=http://localhost:5173
```

In Docker, `.env` file is absent — env vars are injected via Docker environment config, and `dotenv.config()` is a no-op (reads from `process.env`).

## Database Schema

**5 tables:** `users`, `characters`, `chat_history`, `subscriptions`, `voice_messages`

All timestamps are **BIGINT milliseconds** (`Date.now()`).

Key fields:
- `users.behavior_mode`: `'default' | 'study' | 'work' | 'psychologist' | 'nsfw'`
- `users.selected_character`: slug (default `'morgan'`)
- `characters.slug`: URL-safe unique ID
- `chat_history`: composite index on `(user_id, character_slug, timestamp)`
- `voice_messages`: used for rate-limiting — max 20 per 5 hours per user

## Conventions

- **Language:** All user-facing text and AI prompts in **Russian**
- **Timestamps:** Always milliseconds (`Date.now()`)
- **API errors:** `{ error: "message" }` + HTTP status code
- **Route typing:** Routes use `req: any` to bypass TypeScript strictness on `req.user`
- **Singletons:** Modules export instances: `database`, `openrouterClient`, `memoryManager`, `minimaxTTS`
- **Pinia stores:** Composition API / setup function style (`defineStore` + setup)
- **Chat streaming:** SSE via `POST /api/chat/stream`, not WebSocket
- **CSS:** TailwindCSS v4 + custom classes in `style.css` via `@layer components`
- **Vue components:** `<script setup lang="ts">`, no Options API

## Character Response Format

```
*действие/эмоция курсивом*   — описание действий
Речь обычным текстом          — что говорит персонаж
(мысли в скобках)             — внутренние мысли
[VOICE: текст]                — генерируется MiniMax TTS
```

## Extending the System

**Add a new character:** `INSERT INTO characters (slug, name, description, system_prompt, greeting_message, is_premium, is_active, sort_order, created_at) VALUES (...)`

**Add a new behavior mode** — 4 places:
1. `server/src/prompt.ts` → add case in `getBehaviorPrompt()`
2. `client/src/views/ChatView.vue` → `modes` array in settings modal
3. `client/src/views/SettingsView.vue` → `modes` array
4. `server/src/routes/user.routes.ts` → `validModes` array

## Known Limitations

- STT (speech-to-text) — placeholder in `voice.routes.ts`, not implemented
- Premium is manually toggled by admin — no payment integration
- Image uploads sent to AI but not rendered as thumbnails in chat UI
- Character `avatar_url` field exists but no images seeded
- No password reset / email verification
- No express-rate-limit on API routes
- Chat history loads last 50 messages only (no pagination)
- Voice recording button in UI but `MediaRecorder` not wired up
