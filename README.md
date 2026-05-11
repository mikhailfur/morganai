# Morgan AI

Модульный каркас ИИ-платформы (Telegram-бот + WebApp) на **Python 3.11** / **FastAPI** + **Vue 3**.

---

## Стек технологий

| Слой | Технология |
|------|------------|
| Backend | Python 3.11, FastAPI, python-telegram-bot, SQLAlchemy 2.0 (async), asyncpg, Alembic, APScheduler |
| Frontend | Vue 3 (Composition API), Pinia, TailwindCSS, Vite |
| БД | PostgreSQL 15 |
| AI | OpenRouter API, MiniMax (заготовки) |
| Платежи | Tribute (Telegram канал), Paddle (вебхуки) |
| Инфра | Docker, Docker Compose, Nginx |

---

## Быстрый старт (локально через Docker)

### 1. Клонировать репозиторий

```bash
git clone <repo-url> morganai
cd morganai
```

### 2. Подготовить файл окружения

```bash
cp .env.example .env
```

Открой `.env` и **заполни обязательные поля**:

- `TELEGRAM_BOT_TOKEN` — токен от @BotFather
- `TELEGRAM_WEBHOOK_URL` — публичный HTTPS URL твоего сервера (для локального теста Telegram webhook можно пропустить, см. раздел ниже)
- `OPENROUTER_API_KEY` — ключ с [openrouter.ai](https://openrouter.ai)
- `DATABASE_URL` по умолчанию указывает на сервис `db` внутри docker-compose; для локального запуска Python без Docker замени `db` на `localhost`.

### 3. Поднять всё через Docker Compose

```bash
docker compose up --build -d
```

Это запустит 3 сервиса:
- **PostgreSQL** (`db`) — на внутреннем порту `5432`
- **Backend** (`backend`) — FastAPI на `http://localhost:8000`
- **Frontend** (`frontend`) — Nginx с собранным Vue на `http://localhost:80`

### 4. Проверка работы

| Что проверяем | URL / Команда |
|---------------|---------------|
| Health-check API | [http://localhost/](http://localhost/) → проксирует на `frontend`, но API доступен через `/api` |
| Backend напрямую | [http://localhost:8000/](http://localhost:8000/) (если пробросил порт) |
| Health endpoint | `curl http://localhost:80/api/` (должен вернуть `{"status":"ok"}`) |
| WebApp UI | [http://localhost/](http://localhost/) — должен открыться список персонажей |
| Логи бэкенда | `docker compose logs -f backend` |
| Логи БД | `docker compose logs -f db` |

### 5. Остановка

```bash
docker compose down
# Чтобы удалить и том с данными PostgreSQL:
docker compose down -v
```

---

## Добавление зависимостей

Если ты обновил `backend/requirements.txt`, пересобери контейнер:

```bash
docker compose up --build -d backend
```

Аналогично для фронтенда — после изменений в `package.json` пересобери `frontend`.

---

## Telegram Webhook (локальное тестирование)

Telegram требует **публичный HTTPS URL** для webhook. Для локальной разработки используй **ngrok**:

```bash
# Установи ngrok, зарегистрируйся, добавь authtoken

# Пробрось порт 8000 (backend)
ngrok http http://localhost:8000
```

Скопируй HTTPS-адрес (например, `https://abc123.ngrok-free.app`) и обнови в `.env`:

```
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok-free.app
```

Перезапусти backend:

```bash
docker compose restart backend
```

После этого бот будет принимать обновления через ngrok в твоём локальном Docker.

---

## Деплой на Dokploy (и аналогичные Docker-PaaS)

[Dokploy](https://github.com/dokploy/dokploy) — self-hosted PaaS, который деплоит через Docker Compose.

### Шаги:

1. **Заведи сервер** (Ubuntu 22.04+, Docker + Dokploy установлены).
2. **Создай проект** в Dokploy и подключи свой Git-репозиторий.
3. **Укажи путь к Compose** — корень репозитория (`docker-compose.yml` там лежит).
4. **Добавь Environment Variables** в Dokploy UI — скопируй содержимое `.env` (кроме `POSTGRES_...`, если используешь встроенный PostgreSQL от Dokploy).
5. **Настрой домены**:
   - API / Webhook → порт `8000` (backend)
   - WebApp (фронтенд) → порт `80` (frontend)
   - Dokploy автоматически поднимет Traefik и SSL (Let's Encrypt).
6. **Deploy** — Dokploy сам выполнит `docker compose up --build`.

> **Важно**: если Dokploy уже управляет PostgreSQL, можно убрать сервис `db` из `docker-compose.yml` и передать `DATABASE_URL` с данными от внешнего Postgres. Или оставить внутренний `db` — тоже работает.

---

## Переменные окружения (описание)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | AsyncPg connection string | `postgresql+asyncpg://postgres:postgres@db:5432/morgan_ai` |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather | `7221...:AAH...` |
| `TELEGRAM_WEBHOOK_URL` | Публичный HTTPS домен | `https://morgan-ai.com` |
| `TELEGRAM_WEBHOOK_SECRET` | Секрет для валидации webhook | `random_secret_32` |
| `TELEGRAM_PREMIUM_CHANNEL_ID` | ID закрытого Telegram-канала (Tribute) | `-1001234...` |
| `OPENROUTER_API_KEY` | API ключ OpenRouter | `sk-or-v1-...` |
| `OPENROUTER_DEFAULT_MODEL` | Модель по умолчанию | `anthropic/claude-sonnet-4-20250514` |
| `MINIMAX_API_KEY` | API ключ MiniMax (голос) | — |
| `PADDLE_API_KEY` | Paddle API (глобальные платежи) | — |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook secret | — |
| `PROACTIVE_MESSAGE_*` | Настройки времени и частоты proactive | 60 / 9 / 21 |
| `POSTGRES_*` | Логин/пароль для внутреннего сервиса Postgres | postgres / postgres |

---

## Полезные команды

```bash
# Просмотр логов
docker compose logs -f backend

# Выполнить команду внутри backend-контейнера
docker compose exec backend bash

# Запуск backend вне Docker (для отладки)
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Запуск frontend вне Docker (для отладки)
cd frontend
npm install
npm run dev

# Создание Alembic-миграции
docker compose exec backend alembic revision --autogenerate -m "init"
docker compose exec backend alembic upgrade head
```

---

## Архитектура

Подробная структура проекта описана в файле [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Лицензия

MIT — для внутреннего использования проекта Morgan AI.
