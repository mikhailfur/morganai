# Быстрый старт - Morgan AI в Docker

## 1. Подготовка (.env файлы)

### Backend (.env в папке backend/)
```env
# Обязательно настроить:
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_IDS=ваш_telegram_id

# OpenRouter (обязательно для ИИ)
OPENROUTER_API_KEY=sk-or-v1-ваш_ключ
OPENROUTER_MODEL=google/gemini-flash-1.5

# База данных (для Docker не менять)
DATABASE_URL=postgresql+asyncpg://morganai:password@db:5432/morganai

# WebApp
WEBAPP_URL=http://localhost:3000
WEBAPP_SECRET_KEY=минимум_32_символа_секретный_ключ

DEBUG=false
```

### WebApp (.env в папке webapp/)
```env
VITE_API_URL=http://backend:8000
VITE_WEBAPP_URL=http://localhost:3000
```

---

## 2. Запуск (одна команда!)

```bash
# В корне проекта
docker-compose up -d --build
```

**Готово!** Откройте http://localhost:3000 в браузере.

---

## 3. Проверка

```bash
# Статус контейнеров
docker-compose ps

# Логи (реальное время)
docker-compose logs -f

# Тест API
curl http://localhost:8000/health
```

---

## 4. Остановка

```bash
# Остановить (данные сохраняются)
docker-compose stop

# Удалить контейнеры (данные БД сохраняются)
docker-compose down

# ПОЛНАЯ ОЧИСТКА (удалит БД!)
docker-compose down -v
```

---

## Структура подключений

```
┌─────────────┐
│           Docker Network (morgan-network)           │
│               │
│  ┌──────────┐      ┌──────────┐               │
│  │ Backend  │◄────►│ WebApp   │               │
│  │ :8000    │      │ :80      │               │
│  └────┬─────┘      └──────────┘               │
│       │              ▲                        │
│       ▼              │                        │
│  ┌──────────┐      │                        │
│  │    DB    │      │                        │
│  │ :5432    │◄─────┘                        │
│  └──────────┘                               │
└─────────────┘
```

### Как это работает:
1. **WebApp** обращается к API через `VITE_API_URL` (внутри сети: `http://backend:8000`)
2. **Nginx** в webapp проксирует `/api/*` запросы на backend
3. **Backend** подключается к БД через `DATABASE_URL` (внутри сети: `db:5432`)
4. Все `.env` файлы читаются при запуске контейнеров

---

## Полезные команды

```bash
# Пересборка одного сервиса
docker-compose up -d --build backend

# Зайти внутрь контейнера
docker-compose exec backend sh
docker-compose exec db psql -U morganai -d morganai

# Посмотреть использование ресурсов
docker stats

# Очистить неиспользуемые образы
docker system prune -a
```

Подробный гайд: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
