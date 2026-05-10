# MorganAI - Project Structure

```
morganai/
├── frontend/                    # Next.js 14+ (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (main)/
│   │   │   │   ├── page.tsx           # Homepage (Marketplace)
│   │   │   │   ├── layout.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── chat/
│   │   │   │   └── [characterId]/
│   │   │   │       ├── page.tsx       # Chat interface
│   │   │   │       └── loading.tsx
│   │   │   ├── studio/
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx     # Character creation
│   │   │   │   └── edit/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   ├── api/
│   │   │   │   ├── characters/
│   │   │   │   ├── chat/
│   │   │   │   └── upload/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn-style components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── card.tsx
│   │   │   ├── character/
│   │   │   │   ├── CharacterCard.tsx
│   │   │   │   ├── CharacterGrid.tsx
│   │   │   │   └── CharacterForm.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── VoiceRecorder.tsx
│   │   │   │   └── ImageUpload.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Footer.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   ├── websocket.ts           # WebSocket client
│   │   │   ├── utils.ts
│   │   │   └── types.ts
│   │   └── hooks/
│   │       ├── useChat.ts
│   │       ├── useVoice.ts
│   │       └── useSubscription.ts
│   ├── public/
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                     # NestJS
│   ├── src/
│   │   ├── characters/
│   │   │   ├── dto/
│   │   │   ├── characters.service.ts
│   │   │   ├── characters.controller.ts
│   │   │   └── characters.module.ts
│   │   ├── chat/
│   │   │   ├── dto/
│   │   │   ├── chat.gateway.ts       # WebSocket gateway
│   │   │   ├── chat.service.ts
│   │   │   └── chat.module.ts
│   │   ├── users/
│   │   │   ├── dto/
│   │   │   ├── users.service.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.module.ts
│   │   ├── subscriptions/
│   │   │   ├── dto/
│   │   │   ├── subscriptions.service.ts
│   │   │   ├── subscriptions.controller.ts
│   │   │   └── subscriptions.module.ts
│   │   ├── prisma/
│   │   │   ├── prisma.service.ts
│   │   │   └── prisma.module.ts
│   │   ├── ai/
│   │   │   ├── ai.service.ts         # Gemini integration
│   │   │   ├── voice.service.ts      # Whisper + MiniMax
│   │   │   └── ai.module.ts
│   │   ├── payments/
│   │   │   ├── stripe.service.ts
│   │   │   ├── yookassa.service.ts
│   │   │   └── payments.module.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tsconfig.json
│   └── package.json
│
├── prisma/
│   └── schema.prisma                  # Shared Prisma schema
│
├── docker-compose.yml
├── .env.example
├── package.json                       # Monorepo root
└── README.md
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **State**: React hooks (useState, useEffect)
- **Real-time**: Native WebSocket API
- **Markdown**: react-markdown

### Backend
- **Framework**: NestJS
- **ORM**: Prisma + PostgreSQL
- **Real-time**: Socket.io / native WebSocket
- **AI**: Gemini 2.5 API, Whisper (transcription), MiniMax (TTS)
- **Payments**: Stripe, YooKassa, CryptoPay

### Infrastructure
- **Database**: PostgreSQL 15+
- **Cache**: Redis (optional, for sessions)
- **Storage**: S3-compatible (avatars, images, audio)
- **Deployment**: Vercel (frontend), Railway/Render (backend)
