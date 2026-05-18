# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Правила работы Claude

1. Язык: Все ответы — строго на русском языке. Технические термины и идентификаторы кода остаются на языке оригинала.
2. Playwright скриншоты: Все скриншоты и файлы Playwright сохранять строго в папку `PlayWrightPNG/` в корне проекта.
3. Документация: Все гайды, описания задач, технические документы и changelog хранить строго в папке `Docs/` в корне проекта.

---

## Правила Git и CI/CD

### Разрешено и рекомендуется (без дополнительного подтверждения)

- Коммиты и пуш в `dev` — после завершения задачи Claude самостоятельно делает коммит и пушит изменения в ветку dev. Ждать отдельной команды не нужно.
- Минимизация токенов на git-операции — для коммитов, пушей и проверки CI использовать модель claude-haiku-4-5 через флаг --model haiku или делегировать эти операции через Agent(subagent_type="claude", model="haiku"). Код пишется основной моделью, а рутинные операции (git add, commit, push, gh run list) — более дешёвой.
- Проверка CI/CD после каждого пуша — после пуша в dev обязательно проверить статус GitHub Actions: gh run list --branch dev --limit 3. Если сборка упала — изучить логи (gh run view <id> --log-failed) и исправить ошибку. Не сообщать пользователю об успехе до подтверждения зелёного CI.
- После успешного CI — тригерить редеплой через Dokploy MCP: `mcp__dokploy-mcp__application-redeploy` с applicationId `tjRfvc34UyEn45wy5z0mC`.
- ВАЖНО! Если проект запускается впервые - то необходимо создать Docker файлы и структуру чтобы проект собирался в Docker образ. Полезные файлы: .github/workflows/deploy.yml

### Запрещено категорически (без явной команды пользователя)

- Любые действия с веткой `main` — ни коммиты, ни пуши, ни мержи, ни rebase. Ветка main — только по прямой команде пользователя с явным подтверждением.
- Циклический фикс — если одна и та же ошибка повторяется более 2 раз подряд, остановиться и сообщить пользователю. Не пытаться "угадать" решение, тратя токены впустую.
- Бесполезные действия ради действий — не запускать linter/typecheck/build если задача их не затрагивает. Не читать файлы которые заведомо не нужны. Не делать повторные Read файлов которые уже были прочитаны в этой сессии.

---

## Экономия токенов и лимитов

Главный принцип: качество кода не снижается, но каждое действие должно быть оправдано.

- Перед любым действием — думать: нужно ли оно? Если файл уже был прочитан — не читать снова. Если тип ошибки ясен без запуска — не запускать.
- Не проверять то, что заведомо работает — если изменён только один CSS-класс, не нужно запускать полный typecheck TypeScript.
- Grep вместо чтения — для поиска конкретной строки/функции использовать grep/find, а не читать весь файл.
- Задавать вопросы до начала работы — если задача неоднозначна, сначала уточнить у пользователя, а не делать и переделывать. Лучше 2 вопроса до, чем 3 итерации после.
- Предлагать план при сложных задачах — для задач затрагивающих 3+ файла или требующих архитектурных решений — сначала изложить план в 3–5 пунктах и дождаться одобрения.
- Не дублировать контекст — не пересказывать пользователю то, что он только что написал. Сразу к делу.

---

## Справки и гайды (не правила, но практика)

- Гайды для пользователя — если для реализации фичи нужны действия пользователя (создать API ключ, зарегистрироваться в сервисе, настроить DNS и т.д.) — написать пошаговый гайд и сохранить его в Docs/. Не блокировать разработку ожиданием — реализовать заглушку/placeholder и указать где подставить ключ.
- Вопросы вместо предположений — если неясно как должна выглядеть фича или какой подход предпочесть — задать конкретный вопрос. Предложить 2–3 варианта с коротким описанием trade-off'ов. Не угадывать.

---

## Команды разработки

```bash
npm run dev          # локальный запуск с hot-reload (tsx watch)
npm run build        # компиляция TypeScript → dist/
npm run start        # запуск скомпилированного dist/index.js

npm run db:generate  # сгенерировать SQL-миграцию из schema.ts (drizzle-kit)
npm run db:migrate   # применить миграции к БД
npm run db:studio    # открыть Drizzle Studio (GUI для БД)

npx tsc --noEmit     # проверка TypeScript без компиляции (перед коммитом)
```

Локальная разработка с БД:
```bash
docker-compose up postgres   # только PostgreSQL без бота
docker-compose up            # бот + PostgreSQL
```

После изменения `src/database/schema.ts` обязательно:
1. `npm run db:generate` — создаёт SQL в `drizzle/`
2. Зарегистрировать новую миграцию в `drizzle/meta/_journal.json`

---

## Архитектура

### Слои (зависимости строго вниз)

```
bot/          ← Telegraf handlers + middleware. Знает о Telegram, не знает о БД напрямую.
services/     ← Бизнес-логика. Не знает о Telegram.
providers/    ← Внешние API (только OpenRouter).
memory/       ← Контекстное окно (in-memory + lazy-load из БД).
database/     ← Drizzle ORM: schema, repositories. Только SQL.
config/       ← Zod-валидация .env. Доступен всем слоям.
```

`bot/` → `services/` → `providers/` + `memory/` + `database/repositories/`

### Ключевые потоки

**Текстовое сообщение:**
`message.handler` → `ChatService.processText` → `ContextManager.buildContextMessages` → `chatCompletion` → сохранение в БД (fire-and-forget) → ответ

**Фото:**
`photo.handler` → скачать файл → base64 → `ChatService.processPhoto` → `chatCompletion` с vision-контентом

**Голосовое сообщение:**
`voice.handler` → скачать OGG → `ChatService.processVoice` → `transcribeAudio` (base64+JSON в OpenRouter) → обработать как текст

### OpenRouter — единственный AI-провайдер

Все обращения к AI идут **только** через OpenRouter. Никаких прямых интеграций с OpenAI, Anthropic и т.д.

**Chat completions** (`providers/openrouter/chat.ts`):
- Tier-based модели: `free` → [PRIMARY, FALLBACK], `premium` → [PREMIUM]
- Fallback: при любой ошибке кроме 401/402 — переходит к следующей модели
- `cache_control: { type: "ephemeral" }` на system prompt и последнее сообщение истории

**Speech-to-text** (`providers/openrouter/transcription.ts`):
- Эндпоинт: `POST /api/v1/audio/transcriptions`
- Формат: **JSON** (не multipart!): `{ model, input_audio: { data: base64, format: "ogg" } }`
- Ответ: `{ text: string, usage: { seconds, total_tokens } }`

**Retryable ошибки:** всё кроме 401 (неверный ключ) и 402 (нет кредитов).

### Память и контекст (`memory/`)

`ContextManager` — строит `messages[]` для каждого запроса:
1. System prompt с `cache_control`
2. История из `InMemoryStore` (холодный старт → подгрузка из БД)
3. `cache_control` на последнем сообщении истории
4. Новое сообщение пользователя

`InMemoryStore` — `Map<chatId, StoredMessage[]>` с FIFO eviction при превышении `CONTEXT_WINDOW_SIZE * 2`.

Запись в БД — **fire-and-forget** (`.catch(logger.error)`), не блокирует ответ пользователю.

### База данных

Схема в `src/database/schema.ts`. Таблицы:
- `characters` — персонажи (slug, name, system_prompt, is_active)
- `users` — пользователи Telegram (id = telegram user_id, tier: 'free'|'premium', active_char_id)
- `chats` — пара user+character, UNIQUE(user_id, char_id)
- `messages` — история с метриками (model_used, tokens_*, cache_read)

### Конфигурация

`src/config/env.ts` — Zod-схема всех переменных. При невалидных vars — `process.exit(1)` до старта бота.
Пример: `.env.example`. Обязательные: `TELEGRAM_BOT_TOKEN`, `OPENROUTER_API_KEY`, `DATABASE_URL`.

---

## Документация

- **OpenRouter API:** https://openrouter.ai/docs
- **OpenRouter Chat Completions:** https://openrouter.ai/docs/api-reference/chat-completions
- **OpenRouter STT (Speech-to-Text):** https://openrouter.ai/docs/guides/overview/multimodal/stt
- **OpenRouter STT модели:** https://openrouter.ai/collections/speech-to-text-models
- **OpenRouter Prompt Caching:** https://openrouter.ai/docs/features/prompt-caching
- **OpenRouter Provider Routing:** https://openrouter.ai/docs/features/provider-routing
- **Telegraf (Telegram bot framework):** https://telegraf.js.org
- **Drizzle ORM:** https://orm.drizzle.team/docs/overview
- **Dokploy (деплой):** https://dokploy.com/docs

### Деплой

- Docker образ: `ghcr.io/mikhailfur/morganai:latest`
- CI/CD: `.github/workflows/deploy.yml` — push в `dev` → build → push to ghcr.io → Dokploy webhook
- Dokploy applicationId: `tjRfvc34UyEn45wy5z0mC` (проект morgan-ai)
- Гайд по первоначальной настройке: `Docs/dokploy-setup.md`
