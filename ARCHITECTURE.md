# Morgan AI — Архитектура проекта

## Обзор
Модульный каркас ИИ-платформы (Telegram-бот + WebApp) на Python/FastAPI + Vue 3.

---

## Шаг 1. Структура директорий

```
morganai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routers/
│   │   │       ├── __init__.py
│   │   │       ├── admin.py          # Админ-эндпоинты
│   │   │       ├── characters.py     # CRUD персонажей
│   │   │       ├── health.py         # Health-check
│   │   │       ├── payments.py       # Paddle webhooks
│   │   │       ├── telegram_webhook.py
│   │   │       └── users.py          # Пользователи
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py             # Pydantic Settings (.env)
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # DeclarativeBase
│   │   │   └── session.py            # AsyncSessionLocal + get_db()
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py               # User, SubscriptionStatus...
│   │   │   ├── character.py          # Character, BehaviorMode...
│   │   │   └── chat.py               # ChatSession, Message
│   │   ├── repositories/
│   │   │   └── __init__.py           # (CRUD-обёртки)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai/
│   │   │   │   ├── __init__.py
│   │   │   │   └── openrouter.py     # AIService (LLM + мультимодальность)
│   │   │   ├── payments/
│   │   │   │   └── __init__.py       # Tribute check, Paddle logic
│   │   │   └── telegram/
│   │   │       ├── __init__.py
│   │   │       └── handlers.py       # TG команды и хэндлеры
│   │   └── tasks/
│   │       └── proactive.py          # ProactiveMessageService
│   ├── main.py                       # FastAPI + lifespan + webhook
│   ├── requirements.txt
│   ├── alembic.ini                   # (добавить при миграциях)
│   └── tests/
│       └── (pytest заготовки)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── assets/
│       │   └── tailwind.css
│       ├── components/
│       │   └── CharacterList.vue     # Главный UI в стиле Claude
│       ├── stores/
│       │   └── characterStore.js     # Pinia store
│       └── views/
│           └── (страницы роутера)
└── ARCHITECTURE.md                   # Этот файл
```

Принцип разделения:
- **routers** — только HTTP-эндпоинты и Telegram Update routing.
- **services** — чистая бизнес-логика (ИИ, оплаты, cron).
- **repositories/models** — работа с БД.
- **tasks** — фоновые задания (APScheduler или Celery).

---

## Шаг 2. Модели SQLAlchemy

- **User** — telegram_id, роли (user/admin), подписка (free/trial/premium/expired), provider (Tribute/Paddle/manual), даты.
- **Character** — имя, аватар, system_prompt, behavior_mode (study/work/psychologist/nsfw), model_override.
- **ChatSession** — связь user_id + character_id, telegram_chat_id, chat_type (private/group), group_reply_mode (active/mention/reply).
- **Message** — история диалога (role/content), флаги мультимодальности (has_image/video/voice), telegram_message_id.

---

## Шаг 3. main.py (FastAPI + Webhook)

- Async lifespan устанавливает webhook на `/webhook/telegram`.
- Использует `python-telegram-bot` Application внутри `app.state.telegram_app`.
- Глобальный exception handler + health-check.
- Команды и хэндлеры вынесены в `services/telegram/handlers.py`.

---

## Шаг 4. Сервисы ИИ и Крона

- **AIService** (`services/ai/openrouter.py`):
  - `chat()` — текстовый диалог через OpenRouter.
  - `chat_with_image/video()` — base64-мультимодальность (заготовки).
  - `transcribe_voice()` / `text_to_speech()` — STT/TTS через MiniMax (заготовки).
  - `build_system_prompt()` — сборка промпта с учётом поведения и premium-статуса.
  - `trim_context()` — обрезка истории.

- **ProactiveMessageService** (`tasks/proactive.py`):
  - Выборка неактивных Premium/Trial пользователей >24ч.
  - Генерация случайного времени внутри окна (09:00–21:00).
  - LLM-генерация персонализированного сообщения через AIService.
  - Рандомизация (~30%) и логирование.

---

## Шаг 5. Фронтенд (Vue 3 + Tailwind)

- **CharacterList.vue** — главный компонент:
  - Цветовая палитра в стиле Anthropic/Claude (теплый беж/белый + акцент #D97757).
  - Шрифт Inter, скругления 2xl, мягкие тени.
  - Карточки персонажей с анимациями (fade-in, slide-up).
  - Бейджи режимов (Учёба, Работа, Психолог, NSFW).
  - Блокировка NSFW для не-Premium (blur + замок).
  - Баннер Premium с микрочипами (голос, фото, инициативные, 18+).
  - Pinia store с тестовыми данными.

---

## Следующие шаги (рекомендации)

1. **Alembic** — инициализировать `alembic init migrations` и создать первую миграцию.
2. **APScheduler** — добавить в `main.py` фоновый шедулер, который вызывает `ProactiveMessageService.run_daily_cycle()`.
3. **Tribute checker** — функция проверки членства пользователя в закрытом TG-канале (для Tribute).
4. **Paddle webhooks** — реализовать эндпоинт `/api/payments/paddle` для подтверждения оплаты.
5. **Роутер Vue** — добавить `vue-router` и страницы: чат, настройки персонажа, админ-панель.
6. **Защита WebApp** — валидация `initData` из Telegram Web App через HMAC-SHA256.

---

## Docker и развёртывание

### Файлы инфраструктуры

- **`docker-compose.yml`** — оркестрация `db` (Postgres 15), `backend` (FastAPI/Uvicorn), `frontend` (Nginx/Vue SPA).
- **`backend/Dockerfile`** — Python 3.11 slim + Uvicorn.
- **`frontend/Dockerfile`** — Multi-stage: Node 20 → сборка Vite → Nginx stable-alpine.
- **`frontend/nginx.conf`** — reverse-proxy для `/api` и `/webhook` на сервис `backend:8000`.
- **`.env.example`** — полный шаблон переменных окружения (копируется в `.env` перед стартом).

### Локальный запуск

```bash
cp .env.example .env
# Отредактируй .env (добавь TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY и т.д.)

docker compose up --build -d
```

- **WebApp**: [http://localhost/](http://localhost/)
- **Backend (health)**: `curl http://localhost/api/`
- **Логи**: `docker compose logs -f backend`

### Деплой на Dokploy и аналоги

Проект совместим с любыми Docker Compose PaaS (Dokploy, CapRover и т.д.).
Достаточно подключить репозиторий, указать путь к `docker-compose.yml` и загрузить переменные из `.env`. Dokploy автоматически поднимет Traefik и SSL.

> Без публичного HTTPS Telegram Webhook работать не будет — используй [ngrok](https://ngrok.com) для локального тестирования webhook.
