# MorganAI — Technical Draft & Architecture

## Overview

MorganAI is a scalable platform for AI characters (AI companions / personas) with the following core features:

1. Chat interface with selectable LLM models via OpenRouter.
2. Character marketplace & studio (creation, discovery, tagging including NSFW).
3. Voice capabilities: browser recording → transcription → LLM → TTS (MiniMax API) → streaming playback.
4. Admin web dashboard for users, models, pricing, and analytics.
5. Hybrid monetization via Stripe and Tribute with unified premium status.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), React Server Components, Tailwind CSS |
| Backend | NestJS (Node.js), WebSocket Gateway |
| Database | PostgreSQL + Prisma ORM |
| AI Gateway | OpenRouter API (unified LLM access) |
| Voice | MiniMax API (TTS), OpenAI Whisper or similar (STT) |
| Payments | Stripe (cards) + Tribute (crypto/alternative) |
| Real-time | Socket.io (NestJS Gateway) |
| Deployment | Docker + Docker Compose (local), Vercel (frontend), GCP/AWS (backend) |

---

## Block 1. UI/UX and Architecture

### 1.1 Chat Interface & Model Selection

**User Story:**
- User opens a chat with a selected character.
- In the chat header there is a model selector dropdown (e.g., OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Meta Llama 3, etc.).
- The selected model is persisted per chat session.
- Messages are streamed token-by-token.

**Frontend Architecture (Next.js App Router):**

```
app/
  (main)/
    layout.tsx                  # Main shell with sidebar / topbar
    chat/
      [sessionId]/
        page.tsx                # Server Component: loads session + messages
        loading.tsx             # Skeleton while fetching
        error.tsx               # Error boundary
      ChatWindow.tsx            # Client Component ('use client'): handles input, streaming, voice
      ModelSelector.tsx         # Client Component: dropdown to pick model
      MessageList.tsx           # Client Component: renders messages + streaming tokens
      VoiceRecorder.tsx         # Client Component: MediaRecorder API + playback
  api/
    ...
```

- `page.tsx` is a **Server Component** — it fetches session metadata, character prompt, and message history from the backend.
- Inside `ChatWindow.tsx` ( Client Component boundary ) we handle:
  - User input (text / voice).
  - WebSocket connection for real-time streaming.
  - Local optimistic state for new messages.
- `ModelSelector.tsx` is a controlled select input. On change it calls a Server Action (`updateSessionModel`) which PATCHes the backend and revalidates the page.

**Data Flow:**

```
User selects model
  -> ModelSelector (client) -> Server Action updateSessionModel
    -> PATCH /api/chat-sessions/:id  (NestJS)
      -> Prisma: update ChatSession.selectedModel
        -> revalidatePath('/chat/[sessionId]')
```

**WebSocket Protocol for Chat Streaming:**

```json
// Client -> Server
{
  "event": "chat.message",
  "data": {
    "sessionId": "uuid",
    "content": "Hello!",
    "type": "text"
  }
}

// Server -> Client (stream chunks)
{
  "event": "chat.chunk",
  "data": {
    "sessionId": "uuid",
    "messageId": "uuid",
    "chunk": "Hello ",
    "finishReason": null
  }
}

// Server -> Client (final message metadata)
{
  "event": "chat.complete",
  "data": {
    "sessionId": "uuid",
    "messageId": "uuid",
    "usage": { "promptTokens": 120, "completionTokens": 45 }
  }
}
```

---

### 1.2 Marketplace & Studio

**Marketplace:**
- Grid / masonry layout of Character cards.
- Filters: tags (SFW, NSFW, Romantic, Assistant, etc.), popularity, newest.
- Search by name or prompt keywords.
- Each card leads to character detail and "Start Chat" action.

**Studio (Character Creation):**
- Form fields: Name, Description, System Prompt, Tags (multi-select), Visibility (Public / Unlisted / Private), Avatar Image.
- Visibility logic: Public characters appear in Marketplace; Unlisted are accessible via direct link; Private are visible only to creator.

**Frontend Routes:**

```
app/
  (main)/
    marketplace/
      page.tsx              # Server Component: fetch characters with filters
      loading.tsx
      error.tsx
      CharacterCard.tsx     # Shared component
    characters/
      [characterId]/
        page.tsx            # Character detail + "Start Chat" button
      new/
        page.tsx            # Creation form (Server Component wrapping Client Form)
        actions.ts          # Server Actions for creation
```

---

### 1.3 Voice Pipeline

**Pipeline Steps:**

1. **Recording (Browser)**
   - Use `MediaRecorder` API to capture audio from microphone.
   - Format: WebM or WAV.
   - Frontend sends blob to backend via HTTP POST (not WS, to avoid binary overhead in WS frames, though WS is also possible).

2. **Transcription (Backend)**
   - Backend receives audio blob, forwards to STT service (OpenAI Whisper API or self-hosted Whisper).
   - Returns plain text transcript.

3. **LLM Streaming (Backend)**
   - Transcript is treated as a user message.
   - Backend calls OpenRouter with character system prompt + history.
   - Response streamed back to frontend via WebSocket.

4. **Text-to-Speech (Backend)**
   - When LLM stream finishes, the full assistant message is sent to MiniMax TTS API.
   - Or, for faster perceived latency, we can use sentence-level chunking: buffer sentences, send to TTS in parallel, stream audio chunks back.
   - Audio URL / blob is sent to frontend via WebSocket.

5. **Playback (Browser)**
   - Frontend receives audio chunks (or a single URL) and plays via `<audio>` or Web Audio API.

**Component:**

```tsx
// VoiceRecorder.tsx  (Client Component)
'use client'

import { useState, useRef } from 'react'

export default function VoiceRecorder({ sessionId, onTranscript }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await uploadAudio(blob)
      chunksRef.current = []
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  async function uploadAudio(blob: Blob) {
    const formData = new FormData()
    formData.append('audio', blob)
    formData.append('sessionId', sessionId)
    const res = await fetch('/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    })
    const { transcript } = await res.json()
    onTranscript(transcript)   // inserts into chat input and triggers send
  }

  return (
    <button onMouseDown={startRecording} onMouseUp={stopRecording}>
      {isRecording ? 'Recording…' : 'Hold to Talk'}
    </button>
  )
}
```

---

### 1.4 Admin Panel (Web Dashboard)

**Requirements:**
- Protected route `/admin/*`. Access is role-based (`User.role === 'ADMIN'`).
- Sections:
  1. **Users**: Table with search, pagination, role toggle, premium status override.
  2. **Models**: CRUD for OpenRouter models available to users (model ID, name, context length, pricing multiplier, isActive).
  3. **Pricing / Subscriptions**: View plans, edit Stripe product prices, view Tribute transactions.
  4. **Analytics**: Dashboard charts (new users per day, active chats, revenue by provider).

**Frontend Routes:**

```
app/
  admin/
    layout.tsx          # Admin shell; checks role and redirects non-admins
    page.tsx            # Redirect to /admin/users
    users/
      page.tsx          # Server Component: fetches users + pagination
      loading.tsx
    models/
      page.tsx
    subscriptions/
      page.tsx
    analytics/
      page.tsx          # Can use recharts or similar (Client Component)
```

**Protection Strategy:**
- A server-side middleware (not Next.js middleware, but a server component check) verifies the session JWT and `role`.
- `layout.tsx` in `/admin` checks `user.role`. If not `ADMIN`, redirect to `/`.
- Additionally, backend API routes under `/api/admin/*` use a NestJS Guard (`AdminGuard`) that validates the JWT payload.

---

## Block 2. Key Logic (Integrations)

### 2.1 AI via OpenRouter

**OpenRouter** acts as a unified proxy to hundreds of LLMs. We integrate with it via HTTP streaming.

**Backend Service (`OpenRouterService`):**

The service accepts:
- `message`: the latest user message string.
- `history`: prior messages from Prisma (role: user | assistant).
- `systemPrompt`: the current character's system prompt.
- `model`: the model ID selected by user (e.g. `anthropic/claude-3.5-sonnet`).

It constructs the OpenRouter `chat/completions` request body and returns a Node.js `ReadableStream` (or uses `axios` / `fetch` with streaming).

**Headers required:**
- `Authorization: Bearer <OPENROUTER_API_KEY>`
- `HTTP-Referer: <SITE_URL>`
- `X-Title: MorganAI`

**Request Body:**

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "messages": [
    { "role": "system", "content": "You are Morgan, a witty cyberpunk hacker..." },
    { "role": "user", "content": "Hi there!" }
  ],
  "stream": true,
  "temperature": 0.8
}
```

**Streaming Response Handling:**
- Use `fetch` with `ReadableStream` in Node.js 18+.
- Parse Server-Sent Events (SSE) lines (`data: {...}`).
- For each chunk, emit via WebSocket Gateway to the specific client room.

**Error Handling:**
- If OpenRouter returns 4xx/5xx, catch and emit `chat.error` event to client with user-friendly message.
- Track rate limits via `X-RateLimit-Remaining` headers.

---

### 2.2 Hybrid Monetization (Tribute + Stripe)

**Goal:** Support two payment providers while keeping a single, provider-agnostic `Premium` status for users.

**Database Design:**

- `Subscription` table is polymorphic via `provider` enum (`STRIPE`, `TRIBUTE`).
- `User` table has `isPremium` and `premiumUntil` derived from the active subscription.
- A background job (or Prisma query on each login) checks `premiumUntil >= now()` and flips `isPremium` if expired.

**Stripe Flow:**

1. User clicks "Subscribe" → frontend calls `/api/payments/stripe/create-checkout-session`.
2. Backend creates Stripe Checkout Session with `mode: 'subscription'`.
3. User completes payment on Stripe hosted page.
4. Stripe sends `invoice.payment_succeeded` webhook to `/api/payments/stripe/webhook`.
5. Backend validates webhook signature, creates `Subscription` record with `provider: STRIPE`, `providerSubscriptionId: sub_id`, `status: ACTIVE`, and updates `User.premiumUntil = current_period_end`.
6. On recurring payments, webhook updates `premiumUntil`.
7. On cancellation, webhook updates `status` to `CANCELLED`.

**Tribute Flow:**

1. User clicks "Subscribe via Tribute" → frontend redirected to Tribute payment page (or iframe).
2. Tribute processes payment and sends POSTback to configured URL `/api/payments/tribute/webhook`.
3. Backend validates Tribute signature (HMAC or token), creates `Subscription` record with `provider: TRIBUTE`, `providerSubscriptionId: tribute_payment_id`.
4. Since Tribute may not have a native "subscription" cycle, we map each successful payment to an extension of `premiumUntil` (e.g., +30 days).

**Unified Premium Check:**

```typescript
function isUserPremium(user: User): boolean {
  return user.isPremium && user.premiumUntil > new Date()
}
```

**Premium-Only Features (to enforce):**
- Voice chat.
- Access to high-tier models (e.g., GPT-4o, Claude Opus).
- Higher message rate limits.

These checks are enforced by NestJS Guards (`PremiumGuard`) on relevant endpoints.

---

## Block 3. Code Foundation

### 3.1 Prisma Schema

(See `backend/prisma/schema.prisma` in generated files.)

Key entities:
- `User` — identity, auth, role, premium flags.
- `Character` — persona definition, creator relation, tags, visibility.
- `ChatSession` — belongs to user + character; stores `selectedModel`.
- `Message` — content, role, optional audioUrl.
- `Subscription` — provider-agnostic record of premium access.
- `PlatformModel` — admin-controlled list of models available via OpenRouter.

### 3.2 Backend File Structure (NestJS)

```
backend/
  prisma/
    schema.prisma
  src/
    app.module.ts
    main.ts
    auth/
      auth.controller.ts
      auth.module.ts
      auth.service.ts
      jwt.strategy.ts
      guards/
        jwt-auth.guard.ts
        roles.guard.ts
        premium.guard.ts
    chat/
      chat.gateway.ts           # WebSocket gateway
      chat.module.ts
      chat.service.ts
    openrouter/
      openrouter.service.ts
      openrouter.module.ts
    payments/
      payments.module.ts
      stripe/
        stripe.service.ts
        stripe.controller.ts
        stripe.webhook.controller.ts
      tribute/
        tribute.service.ts
        tribute.webhook.controller.ts
    admin/
      admin.controller.ts
      admin.module.ts
      admin.service.ts
    characters/
      characters.controller.ts
      characters.module.ts
      characters.service.ts
    users/
      users.controller.ts
      users.module.ts
      users.service.ts
    common/
      decorators/
        roles.decorator.ts
        current-user.decorator.ts
      filters/
        http-exception.filter.ts
      pipes/
        validation.pipe.ts
  test/
    ...
```

### 3.3 OpenRouter Service

(See `backend/src/openrouter/openrouter.service.ts` in generated files.)

Features:
- Streams completions via `fetch` + `ReadableStream`.
- Injectable NestJS service.
- Emits chunks via `EventEmitter` so `ChatGateway` can broadcast.
- Handles abort via `AbortController`.

### 3.4 Admin Panel API Endpoints

(See below for full endpoint list.)

All endpoints under `/api/admin/*` are protected by `AdminGuard`.

---

## Appendix A. Environment Variables

```bash
# Backend
DATABASE_URL="postgresql://user:pass@localhost:5432/morganai?schema=public"
JWT_SECRET="super-secret-jwt-key"
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_REFERER="https://morganai.example.com"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
TRIBUTE_API_KEY="..."
TRIBUTE_WEBHOOK_SECRET="..."
MINIMAX_API_KEY="..."

# Frontend
NEXT_PUBLIC_APP_URL="https://morganai.example.com"
NEXT_PUBLIC_API_URL="https://api.morganai.example.com"
NEXT_PUBLIC_WS_URL="wss://api.morganai.example.com"
```

## Appendix B. Security Checklist

- [ ] All backend routes (except public auth) require JWT Bearer token.
- [ ] Admin routes require `ADMIN` role.
- [ ] Premium routes require active subscription.
- [ ] Stripe webhooks verified with `stripe.webhooks.constructEvent`.
- [ ] Tribute webhooks verified with HMAC signature.
- [ ] File uploads (avatars, audio) validated for type and size; served via signed URLs or CDN.
- [ ] NSFW content confined to authenticated users with age verification / consent toggles; filtered from public SEO.
- [ ] Rate limiting on auth and chat endpoints.

## Appendix C. SEO & Performance Notes

- Marketplace page uses Server Components with `generateMetadata` per character (dynamic OG images).
- `next/image` for avatars and character art.
- `loading.tsx` skeletons on chat and marketplace.
- Streaming SSR for chat history (React Suspense boundaries).
- Voice audio is lazy-loaded and preloaded only on user interaction.
