# Morgan AI Platform

ИИ-платформа с Telegram-ботом и WebApp, позволяющая общаться с различными ИИ-персонажами.

## Особенности

- **Telegram Bot**: Личные сообщения и групповые чаты с 3 режимами работы
- **ИИ-персонажи**: Базовые персонажи с настраиваемыми системными промптами
- **Мультимодальность**: Поддержка текста, фото (Vision) и голосовых сообщений
- **WebApp**: Vue 3 приложение внутри Telegram с защитой HMAC-SHA-256
- **Монетизация**: Подписки через Tribute (РФ) и Paddle (Global)
- **Админ-панель**: Управление пользователями и настройками

## Технологии

### Backend
- **FastAPI** - современный async web framework
- **SQLAlchemy 2.0** - ORM с поддержкой async
- **PostgreSQL** - база данных (BigInteger для Telegram ID)
- **aiogram 3.x** - Telegram Bot API
- **OpenRouter** - доступ к LLM (Gemini, Claude, GPT)
- **MiniMax** - синтез и распознавание речи

### Frontend
- **Vue 3** - Composition API, TypeScript
- **Vite** - быстрый сборщик
- **Pinia** - управление состоянием
- **Vue Router 4** - маршрутизация

## Структура проекта

```
morganai/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/        # API роуты
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   ├── services/       # Бизнес-логика
│   │   └── tasks/         # Фоновые задачи
│   ├── alembic/           # Миграции БД
│   └── requirements.txt
├── webapp/                 # Vue 3 WebApp
│   ├── src/
│   │   ├── components/    # Vue компоненты
│   │   ├── views/         # Страницы
│   │   ├── stores/        # Pinia stores
│   │   ├── composables/   # Композаблес
│   │   └── types/         # TypeScript типы
│   └── package.json
├── docker-compose.yml     # Оркестрация
└── README.md
```

## Быстрый старт

### Предварительные требования

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+
- Docker (опционально)

### Backend установка

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r requirements.txt

# Настроить переменные окружения
cp .env.example .env
# Отредактировать .env (добавить токены и ключи)

# Запустить миграции
alembic upgrade head

# Запустить сервер
python -m uvicorn app.main:app --reload
```

### Frontend установка

```bash
cd webapp

# Установить зависимости
npm install

# Настроить (опционально)
# Отредактировать vite.config.ts если нужно

# Запустить dev сервер
npm run dev

# Сборка для продакшена
npm run build
```

### Docker развертывание

```bash
# Сборка и запуск всех сервисов
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## Настройка

### Telegram Bot

1. Создать бота через @BotFather
2. Получить токен и добавить в `TELEGRAM_BOT_TOKEN`
3. Настроить WebApp URL в BotFather

### OpenRouter

1. Зарегистрироваться на https://openrouter.ai
2. Получить API ключ и добавить в `OPENROUTER_API_KEY`

### MiniMax (для голосовых)

1. Зарегистрироваться на https://www.minimaxi.com/
2. Получить API ключ и добавить в `MINIMAX_API_KEY`

### Платежные системы

#### Tribute (РФ)
- Зарегистрироваться на https://tribute.tg
- Получить API ключ

#### Paddle (Global)
- Зарегистрироваться на https://paddle.com
- Настроить checkout и webhooks

## API Endpoints

### Аутентификация
- `POST /api/v1/auth/validate` - Валидация initData от Telegram WebApp

### Персонажи
- `GET /api/v1/characters` - Список персонажей
- `POST /api/v1/characters` - Создание персонажа

### Режимы
- `GET /api/v1/modes` - Список режимов поведения

### Пользователи
- `GET /api/v1/users/{id}` - Инфо о пользователе
- `POST /api/v1/users/{id}/select-character/{char_id}` - Выбор персонажа
- `POST /api/v1/users/{id}/select-mode/{mode_id}` - Выбор режима

### Подписки
- `GET /api/v1/subscription/plans` - Тарифные планы
- `POST /api/v1/subscription/create` - Создание подписки

### Админ
- `GET /api/v1/admin/stats` - Статистика
- `POST /api/v1/admin/users/{id}/grant-premium` - Выдача Premium

## Важные замечания

1. **BigInteger для Telegram ID**: В базе данных используется `BigInteger` (BIGINT) для хранения Telegram ID

2. **Раздельный деплой**: Backend и WebApp разворачиваются на разных хостингах

3. **Защита WebApp**: Все запросы валидируются через HMAC-SHA-256 подпись от Telegram

4. **Контекст беседы**: Хранится в БД в JSONB формате (последние 20 сообщений)

## Лицензия

MIT
