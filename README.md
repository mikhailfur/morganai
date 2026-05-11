# Morgan AI — Отдельный деплой Backend + Frontend

Модульный каркас ИИ-платформы (Telegram-бот + WebApp).
Backend и Frontend теперь деплоятся **отдельно** (например, в Dokploy как два независимых Docker-сервиса).

---

## Что изменено по сравнению с монолитным `docker-compose`

- **Backend** — отдельный Docker-образ (FastAPI + python-telegram-bot). Нет связи с `db` через Docker network. База данных подключается по внешнему `DATABASE_URL`.
- **Frontend** — отдельный Docker-образ (Nginx + статика Vue). **Нет `proxy_pass` на backend**. Nginx просто отдаёт SPA; API вызовы уходят на `VITE_API_URL`.
- **`docker-compose.yml` удалён** — больше не нужен, так как сервисы не связываются через Docker Compose.
- **Исправлен баг `AttributeError: 'APIRouter' object has no attribute 'router'`** — убрана переопределяющая логика в `api/routers/__init__.py`, импорты теперь идут напрямую из модулей.

---

## Структура проекта

```
morganai/
├── .env.example                    # Шаблон переменных окружения (backend + frontend)
├── ARCHITECTURE.md                  # Архитектурное описание
├── README.md                        # Этот файл
│
├── backend/
│   ├── Dockerfile                   # Python 3.11 + Uvicorn
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── main.py                      # FastAPI + Telegram Webhook
│   └── app/...
│
└── frontend/
    ├── Dockerfile                   # Multi-stage: Node → Nginx (без proxy_pass)
    ├── .dockerignore
    ├── nginx.conf                   # Чистая статика SPA
    ├── .env.example                 # VITE_API_URL
    ├── vite.config.js
    ├── package.json
    └── src/...
```

---

## 1. Backend (FastAPI)

### Dockerfile

Использует `python:3.11-slim`, устанавливает зависимости из `requirements.txt` и запускает Uvicorn.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Переменные окружения (backend)

Файл `.env.example` в корне репозитория содержит все переменные.

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Внешний Postgres (например, `postgresql+asyncpg://user:pass@db-host:5432/morgan_ai`) |
| `TELEGRAM_BOT_TOKEN` | Токен от @BotFather |
| `TELEGRAM_WEBHOOK_URL` | Публичный HTTPS URL бэкенда (например, `https://api.morganai.ru`) |
| `TELEGRAM_WEBHOOK_SECRET` | Случайная строка для защиты webhook |
| `OPENROUTER_API_KEY` | Ключ с [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_DEFAULT_MODEL` | Модель по умолчанию |
| `MINIMAX_API_KEY` | Ключ MiniMax (опционально) |
| `PADDLE_API_KEY` / `PADDLE_WEBHOOK_SECRET` | Для Paddle (опционально) |
| `PROACTIVE_MESSAGE_*` | Настройки proactive-рассылки |

**Важно:** убери `POSTGRES_*` из файла, если БД управляется Dokploy / Railway / отдельно.

### Проверка локально (без Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Проверь: [http://localhost:8000/](http://localhost:8000/) → `{"status":"ok"}`

---

## 2. Frontend (Vue 3 + Tailwind)

### Dockerfile (frontend)

Multi-stage: собирает Vue через Vite, а затем отдаёт статику через **чистый Nginx** (без reverse-proxy на backend).

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (frontend)

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Почему нет `proxy_pass`?** Фронт и бэк на разных доменах / портах. Vue-приложение ходит к API через абсолютный `VITE_API_URL` (настраивается в `.env` перед сборкой).

### Переменные окружения (frontend)

| Переменная | Описание |
|---|---|
| `VITE_API_URL` | Базовый URL бэкенда **без** trailing slash (например, `https://api.morganai.ru`) |

Эта переменная должна быть доступна **во время сборки** (`npm run build`), потому что Vite встраивает её в код.

### Проверка локально

```bash
cd frontend
npm install
# Для dev (proxy работает на localhost:8000)
npm run dev

# Для production-like сборки
VITE_API_URL=https://api.morganai.ru npm run build
# Затем можно поднять любой статический сервер из папки dist/
```

---

## 3. Деплой на Dokploy (пошаговый гайд)

Dokploy позволяет задеплоить каждый сервис как **отдельное приложение**.

### Шаг A — Подготовка репозитория

1. Залей проект на **GitHub / GitLab**.
2. Убедись, что `docker-compose.yml` удалён (мы удалили его).

### Шаг B — Backend

1. В Dokploy создай новое приложение → **Application**.
2. Включи **Docker** сборку.
3. В поле `Dockerfile Path` укажи: `backend/Dockerfile`.
4. В **Environment Variables** добавь **все** переменные из `.env.example` (кроме `VITE_API_URL` и `POSTGRES_*`):
   - `DATABASE_URL` — URL твоего Postgres (можно создать через Dokploy Database или внешний)
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_URL` — URL этого бэкенда-приложения (например, `https://api.morganai.ru`)
   - `TELEGRAM_WEBHOOK_SECRET`
   - `OPENROUTER_API_KEY`
   - и остальные...
5. Выбери **Build Type** = `Dockerfile`.
6. Укажи **Domain** (например, `api.morganai.ru`) — Dokploy сам настроит Traefik + SSL.
7. Нажми **Deploy**.

После деплоя проверь:
```bash
curl https://api.morganai.ru/
# Ожидается: {"status":"ok"}
```

### Шаг C — Frontend

1. В Dokploy создай ещё одно приложение → **Application**.
2. Включи **Docker** сборку.
3. В поле `Dockerfile Path` укажи: `frontend/Dockerfile`.
4. В **Environment Variables** добавь:
   - `VITE_API_URL=https://api.morganai.ru` (URL твоего backend-сервиса)
   
   > ⚠️ **Важно:** Если Dokploy не прокидывает `ENV` на этап `docker build` (только runtime), убедись, что в Dockerfile есть строка `ARG VITE_API_URL` + `ENV VITE_API_URL=${VITE_API_URL}`, или добавь `.env` файл в репозиторий с `VITE_API_URL=...`. Для Dokploy проще добавить `VITE_API_URL` в Build Args, если платформа это поддерживает. Если нет — можешь прямо в `vite.config.js` или `.env` репозитория указать URL.

5. Укажи **Domain** (например, `app.morganai.ru`) — Dokploy + SSL.
6. Нажми **Deploy**.

После деплоя открой `https://app.morganai.ru` — должна открыться страница с персонажами.

---

## 4. Подключение Telegram Webhook

Telegram требует **публичный HTTPS**.

1. После деплоя backend открой URL: `https://api.morganai.ru/webhook/telegram`
2. Убедись, что `TELEGRAM_WEBHOOK_URL=https://api.morganai.ru` и бот при старте вызывает `setWebhook()`.
3. Если хочешь подписаться на webhook руками:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.morganai.ru/webhook/telegram","secret_token":"YOUR_SECRET"}'
```

---

## 5. Устранение ошибок

### `AttributeError: 'APIRouter' object has no attribute 'router'`

**Причина:** В `app/api/routers/__init__.py` создавались пустые `APIRouter()`, которые затем импортировались в `main.py` как модули. При вызове `health.router` Python искал атрибут `router` у объекта `APIRouter`, которого нет.

**Фикс:** Убраны определения из `__init__.py`, импорты в `main.py` теперь:
```python
from app.api.routers.health import router as health_router
```

### `host not found in upstream "backend"` (nginx)

**Причина:** `nginx.conf` содержал `proxy_pass http://backend:8000`, но при отдельном деплое сервис `backend` не существует в сети контейнера фронтенда.

**Фикс:** Убраны все `location /api` и `/webhook` из `nginx.conf`. Nginx теперь только отдаёт статику. API запросы Vue делает через `VITE_API_URL`.

---

## Полезные команды

```bash
# Локальный запуск backend
cd backend && uvicorn main:app --reload --port 8000

# Локальный запуск frontend
cd frontend && npm run dev

# Сборка frontend (для проверки перед Docker)
cd frontend && VITE_API_URL=https://api.morganai.ru npm run build

# Локальный Docker backend
cd backend && docker build -t morgan-backend . && docker run -p 8000:8000 --env-file ../.env morgan-backend

# Локальный Docker frontend
cd frontend && docker build -t morgan-frontend . && docker run -p 80:80 morgan-frontend
```

---

## Лицензия

MIT — для внутреннего проекта Morgan AI.
