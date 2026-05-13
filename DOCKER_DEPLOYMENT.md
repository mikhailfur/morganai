# Docker Deployment Guide - Morgan AI Platform

## Полное руководство по запуску в Docker

### Требования

- Docker Desktop (Windows/Mac) или Docker Engine (Linux)
- Docker Compose v2.0+
- Минимум 2GB RAM
- Свободные порты: 3000, 8000, 5432

---

## Быстрый старт (3 шага)

### Шаг 1: Клонирование и подготовка

```bash
# Клонировать репозиторий
git clone <your-repo-url>
cd morganai

# Создать .env файлы (если их нет)
```

### Шаг 2: Настройка переменных окружения

#### Backend (.env файл в папке `backend/`)

Создайте файл `backend/.env`:

```env
# Telegram Bot (обязательно)
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_IDS=ваш_telegram_id

# OpenRouter AI (обязательно для работы ИИ)
OPENROUTER_API_KEY=sk-or-v1-ваш_ключ
OPENROUTER_MODEL=google/gemini-flash-1.5

# MiniMax (опционально - для голосовых)
MINIMAX_API_KEY=ваш_ключ_minimax

# Платежные системы (опционально)
TRIBUTE_API_KEY=ваш_ключ_tribute
PADDLE_API_KEY=ваш_ключ_paddle

# База данных (не меняйте для Docker)
DATABASE_URL=postgresql+asyncpg://morganai:password@db:5432/morganai

# WebApp
WEBAPP_URL=http://localhost:3000
WEBAPP_SECRET_KEY=минимум_32_символа_секретный_ключ

# Режим работы
DEBUG=false
```

**Как получить токены:**
1. **Telegram Bot Token**: Напишите @BotFather в Telegram, создайте бота командой `/newbot`
2. **OpenRouter API Key**: Зарегистрируйтесь на https://openrouter.ai, создайте ключ в настройках
3. **Ваш Telegram ID**: Напишите @userinfobot в Telegram, он покажет ваш ID

#### WebApp (.env файл в папке `webapp/`)

Создайте файл `webapp/.env`:

```env
VITE_API_URL=http://backend:8000
VITE_WEBAPP_URL=http://localhost:3000
```

### Шаг 3: Запуск через Docker Compose

```bash
# Построить и запустить все контейнеры
docker-compose up -d --build

# Проверить статус контейнеров
docker-compose ps

# Посмотреть логи (всех сервисов)
docker-compose logs -f

# Посмотреть логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f webapp
docker-compose logs -f db
```

---

## Доступ к сервисам

После успешного запуска:

| Сервис | URL | Описание |
|--------|-----|------------|
| **WebApp** | http://localhost:3000 | Vue 3 приложение (открывать через Telegram!) |
| **Backend API** | http://localhost:8000 | FastAPI документация доступна на /docs |
| **Health Check** | http://localhost:8000/health | Проверка работоспособности |
| **PostgreSQL** | localhost:5432 | База данных (внешний доступ для отладки) |

---

## Настройка Telegram Bot

1. Откройте @BotFather в Telegram
2. Выберите вашего бота командой `/mybots`
3. Зайдите в **Bot Settings** -> **Menu Button** -> **Configure**
4. Установите URL: `http://localhost:3000` (для локального теста) или `https://ваш-домен` (для продакшена)
5. Настройте команды бота:
   ```
   /start - Начать общение
   ```

---

## Управление контейнерами

### Просмотр логов

```bash
# Логи в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
```

### Остановка сервисов

```bash
# Остановить все контейнеры (данные сохранятся в volume)
docker-compose stop

# Остановить и удалить контейнеры (данные БД сохранятся)
docker-compose down

# Полная очистка (УДАЛИТ ВСЕ ДАННЫЕ БД!)
docker-compose down -v
```

### Перезапуск отдельных сервисов

```bash
# Перезапустить только backend
docker-compose restart backend

# Пересобрать и перезапустить
docker-compose up -d --build backend
```

---

## Выполнение миграций базы данных

При первом запуске миграции выполняются автоматически. Если нужно выполнить миграции вручную:

```bash
# Зайти в контейнер backend
docker-compose exec backend sh

# Выполнить миграции
alembic upgrade head

# Создать новую миграцию
alembic revision --autogenerate -m "description"

# Выход из контейнера
exit
```

---

## Проверка работоспособности

### 1. Проверка Backend API

```bash
# Health check
curl http://localhost:8000/health

# Swagger документация
# Откройте в браузере: http://localhost:8000/docs
```

### 2. Проверка WebApp

```bash
# Откройте в браузере
http://localhost:3000

# Или через curl
curl http://localhost:3000
```

### 3. Проверка базы данных

```bash
# Подключиться к БД через psql
docker-compose exec db psql -U morganai -d morganai

# Внутри psql:
\l  # Список баз данных
\dt # Список таблиц
SELECT * FROM users;  # Просмотр пользователей
\q # Выход
```

---

## Структура сети Docker

```
┌─────────────────────────────────────────────────────┐
│                Docker Network                     │
│                (morgan-network)                  │
│                                                 │
│  ┌──────────┐      ┌──────────┐               │
│  │ Backend  │◄────►│ WebApp   │               │
│  │ :8000    │      │ :80      │               │
│  └────┬─────┘      └──────────┘               │
│       │                                        │
│       ▼                                        │
│  ┌──────────┐                                   │
│  │   DB     │                                   │
│  │ :5432    │                                   │
│  └──────────┘                                   │
└─────────────────────────────────────────────────────┘
```

**Важные моменты:**
- Контейнеры общаются внутри сети `morgan-network` по именам сервисов
- `backend:8000` - доступен для webapp внутри сети
- `db:5432` - доступен для backend внутри сети
- Внешний доступ открыт только через проброшенные порты

---

## Переменные окружения (Environment Variables)

### Как это работает:

1. **Backend** читает `.env` файл через `pydantic-settings`
2. **WebApp** получает переменные через build args (VITE_* переменные)
3. **Docker Compose** передает переменные в контейнеры через `environment` и `env_file`

### Таблица соответствия переменных:

| Переменная | Где используется | Описание |
|------------|------------------|-----------|
| `TELEGRAM_BOT_TOKEN` | backend/.env | Токен от @BotFather |
| `OPENROUTER_API_KEY` | backend/.env | Ключ OpenRouter для ИИ |
| `DATABASE_URL` | backend/.env, docker-compose | URL подключения к БД |
| `VITE_API_URL` | webapp/ (build-time) | URL для API запросов |
| `VITE_WEBAPP_URL` | webapp/ (build-time) | URL самого WebApp |

---

## Решение проблем

### Проблема: Backend не может подключиться к БД

```bash
# Проверить, запущен ли контейнер БД
docker-compose ps db

# Посмотреть логи БД
docker-compose logs db

# Проверить сеть
docker network inspect morganai_morgan-network
```

### Проблема: WebApp не может достучаться до API

```bash
# Зайти в контейнер webapp
docker-compose exec webapp sh

# Проверить, куда уходит запрос
curl http://backend:8000/health
```

### Проблема: Ошибка "relation does not exist"

```bash
# Выполнить миграции
docker-compose exec backend alembic upgrade head
```

---

## Production Deployment

Для продакшена рекомендуется:

1. **Использовать managed PostgreSQL** (AWS RDS, DigitalOcean Managed DB)
2. **Настроить HTTPS** через reverse proxy (Nginx, Traefik, Caddy)
3. **Изменить `DEBUG=false`** в backend/.env
4. **Использовать секреты Docker** для хранения токенов:

```bash
# Создать секреты
echo "ваш_токен" | docker secret create telegram_bot_token -

# Или использовать env_file в docker-compose с правами 600
chmod 600 backend/.env
```

---

## Полезные команды

```bash
# Пересобрать все без кэша
docker-compose build --no-cache

# Очистить неиспользуемые образы
docker system prune -a

# Посмотреть использование ресурсов
docker stats

# Экспорт логов
docker-compose logs > morganai-logs.txt 2>&1
```

---

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь, что все `.env` файлы созданы
3. Проверьте, что порты не заняты другими приложениями
4. Для локальной разработки без Docker см. README.md
