<div align="center">

# Morgan AI

**Веб-платформа для ролевых игр с AI-компаньонами**

[![Dev branch](https://img.shields.io/badge/разработка-dev-8B2FC9?style=flat-square)](https://github.com/mikhailfur/morganai/tree/dev)
[![CI/CD](https://img.shields.io/github/actions/workflow/status/mikhailfur/morganai/deploy.yml?branch=dev&style=flat-square&label=deploy%20dev)](https://github.com/mikhailfur/morganai/actions)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fmikhailfur%2Fmorganai-2496ED?style=flat-square&logo=docker)](https://github.com/mikhailfur/morganai/pkgs/container/morganai)

</div>

> Активная разработка ведётся в ветке **[dev](https://github.com/mikhailfur/morganai/tree/dev)**.  
> Здесь представлены статус проекта и план предстоящих задач.  
> Полная документация — в [dev/README.md](https://github.com/mikhailfur/morganai/blob/dev/README.md).

---

## Статус разработки

### Реализовано

- [x] Стриминговый чат с AI через SSE (`POST /api/chat/stream`)
- [x] JWT-авторизация (регистрация, логин, logout)
- [x] Голосовые ответы AI — MiniMax TTS, тег `[VOICE: ...]`
- [x] Анализ изображений — отправка фото в чат (OpenRouter vision)
- [x] Режимы поведения — `default`, `study`, `work`, `psychologist`, `nsfw`
- [x] Dual-theme дизайн — Yume (светлая) и Nocturne (тёмная), manga/editorial стиль
- [x] Мобильная адаптация — mobile-first, `100dvh`, фиксированный sidebar
- [x] Страница тарифов — Free / Premium / Premium+
- [x] Правовые страницы — приватность, условия, оферта, возврат, cookie
- [x] Панель администратора — список пользователей, выдача premium, статистика
- [x] CI/CD — GitHub Actions → GHCR → Dokploy (триггер: push в `dev`)
- [x] Docker multi-stage build — клиент + сервер в одном контейнере
- [x] Форматирование сообщений — мысли `(...)`, действия `*...*`, голосовые теги
- [x] Рандомные приветствия на лендинге и в пустом чате

---

## To-Do — Запланированные задачи

### Phase 1 — Foundation

- [ ] **httpOnly Cookie** — миграция JWT из `localStorage` в cookie (защита от XSS)
  - Добавить `cookie-parser`, обновить `authMiddleware`, убрать `Authorization` header с клиента
  - Cookie Consent Banner (новый компонент `CookieBanner.vue`)
- [ ] **OpenRouter Prompt Caching** — добавить `cache_control: { type: 'ephemeral' }` на system prompt
  - Экономия ~50% токенов на системный промпт при повторных запросах
- [ ] **Анимация смены темы** — slide overlay эффект при переключении Yume ↔ Nocturne
- [ ] **Mobile bug fixes**
  - Settings: заменить горизонтальный topbar с режимами на вертикальный список
  - LandingPage: выровнять кнопку темы с соседними кнопками

### Phase 2 — Core Features

- [ ] **Смена пароля** — `POST /api/user/change-password` + модальное окно в Settings
- [ ] **Удаление аккаунта** — `DELETE /api/user/account` с подтверждением пароля
- [ ] **Расширение схемы БД**
  - Поля: `kyc_verified`, `is_banned`, `subscription_expires_at`, `subscription_type`, `daily_messages_count`
  - Новые таблицы: `plan_limits`, `admin_events`
- [ ] **Рабочие лимиты сообщений** — применять дневные лимиты на сервере, возврат 429
  - Free: 50 сообщений/день · Premium: 500 · Premium+: безлимит
  - Автоматический сброс счётчика в начале дня (UTC)
- [ ] **Динамический контекст по тарифу** — `memory.ts` читает лимиты из `plan_limits`
- [ ] **NSFW / KYC система**
  - `POST /api/user/kyc-verify` — подтверждение возраста 18+
  - NSFW доступен для `kyc_verified OR is_premium`
  - Кнопка "Подтвердить возраст (18+)" в SettingsView
- [ ] **Персонажи как code modules** — `server/src/characters/` с типом `CharacterDefinition`
  - Переменные промптов: `{{user_name}}`, `{{user_time}}`, `{{current_date}}`

### Phase 3 — Admin Panel Expansion

- [ ] **Tabs в AdminView** — Обзор · Пользователи · Подписки · Лимиты · Лог событий
- [ ] **Управление подписками** — выдача Premium/Premium+ с датой истечения
  - `PUT /api/admin/user/:id/subscription`
- [ ] **Редактирование лимитов** — inline таблица plan_limits
  - `PUT /api/admin/plan-limits`
- [ ] **Лог событий администратора** — `GET /api/admin/events`
- [ ] **Бан пользователей** — `PUT /api/admin/user/:id/ban`, проверка в `authMiddleware`

### Phase 4 — OAuth

- [ ] **Google OAuth** — `POST /api/auth/google`, верификация через `google-auth-library`
- [ ] **Telegram OAuth** — `POST /api/auth/telegram`, HMAC-SHA256 верификация виджета
- [ ] Кнопки Google / Telegram на LoginView и RegisterView

### Phase 5 — Missing Features

- [ ] **STT (Speech-to-Text)** — подключить `MediaRecorder` к кнопке записи голоса в UI
- [ ] **Rate limiting** — `express-rate-limit` на API-роутах
- [ ] **Пагинация истории чата** — сейчас загружаются последние 50 сообщений без скролла
- [ ] **Превью изображений в чате** — загруженные фото не отображаются в пузырях
- [ ] **Сброс пароля / верификация email** — не реализованы
- [ ] **Интеграция оплаты** — автоматическая выдача Premium после платежа

### Phase 6 — Documentation (Docs/)

- [ ] `Docs/art-placeholders-guide.md` — руководство по замене `.art-slot` на реальные арты
- [ ] `Docs/character-prompt-guide.md` — как создавать персонажей, формат промптов
- [ ] `Docs/google-oauth-setup.md` — настройка Google Cloud Console
- [ ] `Docs/telegram-oauth-setup.md` — создание бота через BotFather

---

## Быстрый старт

Полная инструкция по установке — в [dev/README.md](https://github.com/mikhailfur/morganai/blob/dev/README.md).

```bash
git clone -b dev https://github.com/mikhailfur/morganai.git
cd morganai
cp .env.example .env  # заполнить API-ключи
npm install && cd server && npm install && cd ../client && npm install && cd ..
npm run dev
```

---

<div align="center">

*Активная разработка ведётся в [`dev`](https://github.com/mikhailfur/morganai/tree/dev)*

</div>
