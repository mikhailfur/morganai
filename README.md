# MorganAI

Scalable AI character platform — chat, marketplace, voice, and admin dashboard.

## Monorepo Layout

```
morganai/
  docs/
    DRAFT.md              # Full technical specification
  backend/               # NestJS + Prisma + PostgreSQL
    prisma/
      schema.prisma
    src/
      auth/
      chat/
      openrouter/
      payments/
      admin/
      characters/
      users/
      common/
  frontend/              # Next.js 14+ App Router
    app/
      (main)/            # Public routes with sidebar layout
      admin/             # Protected admin dashboard
  docker-compose.yml     # Local PostgreSQL
```

## Quick Start

### 1. Database (Docker)

```bash
docker-compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed    # optional
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Environment Variables

See `docs/DRAFT.md` Appendix A for the full list of required env vars.

## Architecture Highlights

- **Frontend**: Next.js 14 App Router with Server Components, React Suspense, and Server Actions.
- **Backend**: NestJS with modular architecture: `auth`, `chat`, `openrouter`, `payments`, `admin`, `characters`, `users`.
- **Real-time**: WebSocket gateway for streaming LLM responses token-by-token.
- **Payments**: Hybrid Stripe + Tribute via unified `Subscription` table.
- **Admin Panel**: Role-protected routes (`ADMIN` role) with analytics, user management, and model configuration.

## License

MIT
