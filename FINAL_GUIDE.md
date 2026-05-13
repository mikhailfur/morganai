# Итоговый гайд - Morgan AI Docker Deployment

## Что сделано

### 1. Созданы .env файлы для всех сервисов:

**backend/.env** - настройки бэкенда
**webapp/.env** - настройки фронтенда

### 2. Настроены переменные окружения:

- **Docker Compose** передает переменные через `env_file` и `environment`
- **Vue 3** читает `VITE_*` переменные через `import.meta.env`
- **FastAPI** читает `.env` через pydantic-settings
- **Nginx** проксирует `/api/*` запросы на backend

---

## Быстрый запуск (3 команды!)

### Шаг 1: Настроить .env файлы

```bash
# В папке backend/.env
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
OPENROUTER_API_KEY=sk-or-v1-ваш_ключ
ADMIN_IDS=ваш_telegram_id
DATABASE_URL=postgresql+asyncpg://morganai:password@db:5432/morganai
WEBAPP_URL=http://localhost:3000
WEBAPP_SECRET_KEY=минимум_32_символа_секретный_ключ
DEBUG=false
```

### Шаг 2: Запустить через Docker

```bash
# В корне проекта
docker-compose up -d --build
```

### Шаг 3: Открыть в браузере

```
http://localhost:3000
```

---

## Как это работает

### Схема подключений:

```
┌─────────────────────────────────────────┐
│         Docker Network              │
│         (morgan-network)            │
│                                              │
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
└─────────────────────────────────────────┘
```

### Путь запроса:

1. **Пользователь** открывает http://localhost:3000 в браузере
2. **Nginx** (в webapp контейнере) отдает Vue приложение
3. **Vue приложение** делает API запросы на `/api/v1/*`
4. **Nginx** проксирует `/api/*` на `backend:8000`
5. **Backend** обрабатывает запрос, обращается к БД `db:5432`
6. **Backend** отвечает через Nginx клиенту

---

## Переменные окружения - как связаны

| Переменная | Где задается | Где используется | Описание |
|------------|----------------|------------------|-----------|
| `TELEGRAM_BOT_TOKEN` | `backend/.env` | `backend` контейнер | Токен Telegram бота |
| `OPENROUTER_API_KEY` | `backend/.env` | `backend` контейнер | Ключ OpenRouter для ИИ |
| `DATABASE_URL` | `backend/.env`, `docker-compose.yml` | `backend` контейнер | URL подключения к БД |
| `VITE_API_URL` | `webapp/.env`, `docker-compose.yml` (build args) | `webapp` контейнер | URL для API запросов |
| `VITE_WEBAPP_URL` | `webapp/.env`, `docker-compose.yml` (build args) | `webapp` контейнер | URL самого WebApp |

---

## Полезные команды

### Просмотр логов:
```bash
docker-compose logs -f              # Все сервисы
docker-compose logs -f backend     # Только backend
docker-compose logs -f webapp      # Только webapp
docker-compose logs -f db          # Только БД
```

### Управление контейнерами:
```bash
docker-compose ps                   # Статус контейнеров
docker-compose restart backend       # Перезапуск backend
docker-compose stop                  # Остановка всех
docker-compose down                 # Удаление контейнеров
docker-compose down -v              # Удаление с БД (ОСТОРОЖНО!)
```

### Выполнение миграций БД:
```bash
docker-compose exec backend alembic upgrade head
```

---

## Проверка работоспособности

```bash
# Health check бэкенда
curl http://localhost:8000/health

# Swagger документация
# Откройте в браузере: http://localhost:8000/docs

# Проверка фронтенда
curl http://localhost:3000

# Проверка БД (внутри контейнера)
docker-compose exec db psql -U morganai -d morganai -c "SELECT * FROM users;"
```

---

## Подробная документация

- **DOCKER_DEPLOYMENT.md** - полный гайд по Docker deployment
- **QUICKSTART.md** - быстрый старт (этоот файл)
- **README.md** - обзор проекта и локальная разработка

---

## Важные замечания

1. **Telegram Bot**: Не забудьте настроить Menu Button в @BotFather с URL `http://localhost:3000`
2. **BigInteger для Telegram ID**: В БД используется `BigInteger` (BIGINT) для хранения Telegram ID
3. **Раздельный деплой**: Backend и WebApp работают в отдельных контейнерах
4. **Защита WebApp**: Все запросы валидируются через HMAC-SHA-256

---

## Готово!

Проект полностью готов к запуску в Docker:
- ✅ Все `.env` файлы созданы
- ✅ Переменные окружения передаются через env_file
- ✅ Vue приложение собирается без ошибок (`npm run build` ✅)
- ✅ Docker Compose настроен с правильными сетями
- ✅ Nginx проксирует API запросы
- ✅ Подробные гайды созданы

**Удачи с Morgan AI!** 🚀
