# Гайд по настройке Dokploy для Morgan AI

## Проблема
CI падает на шаге "Trigger Dokploy redeploy" с ошибкой HTTP 404.
Docker образ при этом успешно собирается и публикуется в `ghcr.io/mikhailfur/morganai`.

## Что нужно сделать

### 1. Создать приложение в Dokploy

1. Войди в панель Dokploy
2. Выбери проект **morgan-ai** (или создай его)
3. Нажми **Create Application**
4. Настройки:
   - **Source**: Docker Image
   - **Docker Image**: `ghcr.io/mikhailfur/morganai:latest`
   - **Registry**: выбери GitHub Container Registry (ghcr.io)
   - Если образ приватный — добавь GitHub Personal Access Token с правом `read:packages`

### 2. Добавить PostgreSQL в Dokploy

1. В том же проекте создай сервис **PostgreSQL**
2. Запомни или задай:
   - Database name: `morganai`
   - Username: `morganai`
   - Password: (любой надёжный)
3. Скопируй connection string формата:  
   `postgresql://morganai:<password>@<host>:5432/morganai`

### 3. Настроить переменные окружения приложения

В настройках приложения → **Environment Variables** добавь:

```
TELEGRAM_BOT_TOKEN=<твой токен от @BotFather>
OPENROUTER_API_KEY=<твой ключ от openrouter.ai>
DATABASE_URL=postgresql://morganai:<pass>@<postgres-host>:5432/morganai
OPENROUTER_FREE_PRIMARY_MODEL=meta-llama/llama-3.1-70b-instruct:free
OPENROUTER_FREE_FALLBACK_MODEL=google/gemma-2-9b-it:free
OPENROUTER_PREMIUM_MODEL=deepseek/deepseek-chat
OPENROUTER_WHISPER_MODEL=openai/whisper-1
OPENROUTER_SITE_URL=https://t.me/morganai_bot
OPENROUTER_SITE_NAME=MorganAI
CONTEXT_WINDOW_SIZE=20
LOG_LEVEL=info
NODE_ENV=production
```

### 4. Получить Webhook URL из Dokploy

1. В настройках приложения найди раздел **Deploy Webhook** (или **Redeploy Webhook**)
2. Скопируй URL вида `https://your-dokploy.com/api/deploy/XXXXXXXX`

### 5. Добавить секрет в GitHub

1. Перейди в репозиторий: `https://github.com/mikhailfur/morganai`
2. Settings → Secrets and variables → Actions
3. Нажми **New repository secret**
4. Имя: `DOKPLOY_WEBHOOK_URL`
5. Значение: вставь URL из шага 4

### 6. Запустить деплой

После настройки можно либо:
- Сделать пустой коммит в `dev` и запушить:
  ```
  git commit --allow-empty -m "trigger: deploy" && git push origin dev
  ```
- Или вручную запустить деплой в панели Dokploy

## Проверка успешного запуска

В логах Dokploy должны появиться строки:
```
Starting Morgan AI...
Database migrations completed
Bot is running
```

## Telegram Bot Token

Если токена ещё нет:
1. Напиши @BotFather в Telegram
2. `/newbot` → задай имя и username
3. Скопируй токен вида `1234567890:ABCDEF...`
