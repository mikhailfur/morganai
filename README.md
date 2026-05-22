<div align="center">

# Morgan AI

**Telegram-бот с AI-персонажами для ролевых чатов**

[![Dev branch](https://img.shields.io/badge/разработка-dev-8B2FC9?style=flat-square)](https://github.com/mikhailfur/morganai/tree/dev)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/mikhailfur/morganai/deploy.yml?branch=dev&style=flat-square&label=deploy)](https://github.com/mikhailfur/morganai/actions)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fmikhailfur%2Fmorganai-2496ED?style=flat-square&logo=docker)](https://github.com/mikhailfur/morganai/pkgs/container/morganai)

</div>

---

## Что это

Morgan AI — Telegram-бот, позволяющий пользователям общаться с AI-персонажами в режиме ролевого чата. Персонажи имеют уникальные системные промпты, аватары и режимы поведения (SFW / NSFW). Работает на базе OpenRouter с поддержкой tier-based моделей, голосовых сообщений и подписки через Tribute.

---

## Стек

| Компонент | Технология |
|-----------|-----------|
| Runtime | Node.js + TypeScript |
| Bot framework | Telegraf |
| AI провайдер | OpenRouter (chat + STT) |
| База данных | PostgreSQL + Drizzle ORM |
| Деплой | Docker → Dokploy |
| CI/CD | GitHub Actions → ghcr.io |

---

## Быстрый старт

### Локально (без Docker)

```bash
# 1. Зависимости
npm install

# 2. Переменные окружения
cp .env.example .env
# заполнить TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, DATABASE_URL

# 3. База данных (PostgreSQL через Docker)
docker-compose up postgres -d

# 4. Применить миграции
npm run db:migrate

# 5. Запустить бота с hot-reload
npm run dev
```

### С Docker Compose (бот + PostgreSQL)

```bash
docker-compose up
```

---

## Структура проекта

```
src/
├── bot/
│   ├── handlers/     # Telegraf-хендлеры (команды, callback, медиа)
│   ├── helpers/      # showScreen(), image-cache
│   └── middleware/   # auth, logger, error
├── services/         # Бизнес-логика
├── providers/        # OpenRouter (chat, STT)
├── memory/           # ContextManager, InMemoryStore
├── database/         # Drizzle schema + repositories
└── config/           # Zod-валидация .env
image/                # Картинки для меню бота
Docs/                 # Вся внутренняя документация
```

---

## Переменные окружения

| Переменная | Обязательная | Описание |
|------------|:---:|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен бота от @BotFather |
| `OPENROUTER_API_KEY` | ✅ | Ключ OpenRouter |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ADMIN_IDS` | — | Comma-separated Telegram ID администраторов |
| `TRIBUTE_CHANNEL_ID` | — | ID канала Tribute для проверки подписки |
| `TRIBUTE_LINK_1M/3M/6M/12M` | — | Ссылки на Tribute-подписки |
| `DIDIT_*` | — | Параметры KYC верификации |

---

## Команды разработки

```bash
npm run dev          # локальный запуск с hot-reload
npm run build        # компиляция TypeScript → dist/
npm run start        # запуск dist/index.js

npm run db:generate  # сгенерировать миграцию из schema.ts
npm run db:migrate   # применить миграции
npm run db:studio    # GUI для базы данных (Drizzle Studio)
```

---

## Документация

| Файл | Содержание |
|------|-----------|
| `Docs/image-system.md` | Система картинок меню |
| `Docs/tribute-setup.md` | Настройка Tribute-подписки |
| `Docs/sfw-nsfw-system.md` | SFW/NSFW доступ |
| `Docs/characters-module-guide.md` | Добавление персонажей |
| `Docs/dokploy-setup.md` | Первоначальная настройка деплоя |
| `Docs/changelog.md` | История изменений |
| `TODO.md` | Текущие задачи и бэклог |

---

## Деплой

- Docker образ публикуется в `ghcr.io/mikhailfur/morganai:latest` при пуше в `dev`
- Dokploy автоматически получает webhook и деплоит новую версию
- Подробнее: `Docs/dokploy-setup.md`
