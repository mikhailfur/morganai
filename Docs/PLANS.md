# Архитектурные решения Morgan AI

Этот документ фиксирует ключевые дизайн-решения и их мотивацию.

---

## Модули поведения персонажа (per-character)

**Решение:** Модули (`BehaviorModule[]`) определяются в TS-файлах каноничных персонажей (`server/src/characters/*.ts`), а не хранятся в БД.

**Почему так:**
- Позволяет использовать prompt caching OpenRouter (~5 мин TTL): system prompt стабилен между сообщениями одного сеанса
- Устраняет N+1 запросов к БД при каждом сообщении
- Изменения модулей — через деплой, не через SQL

**Почему NSFW остаётся глобальным (`users.behavior_mode`):**
- Геоблок применяется на уровне пользователя (страна, верификация возраста)
- Premium/KYC проверка единая для всей платформы
- NSFW может быть и как global toggle, и как отдельный модуль персонажа (Morgan: модуль `nsfw`, isNsfw=true)

---

## Система тикетов — отдельная страница

**Решение:** `/support` — отдельный маршрут, не модал в чате.

**Почему так:**
- История переписки с поддержкой должна быть доступна вне чата
- Мобильная ориентация — в чате места нет
- Тикеты живут дольше одной сессии чата

---

## Модерация публичных user characters

**Решение:** При `is_public=true` — `moderation_status='pending'`, не показываются в `getPublicUserCharacters()` до approve.

**Почему так:**
- Предотвращает паблик-спам и неприемлемый контент
- Саппорт (`is_support`) может модерировать без полного доступа к Admin
- При отклонении: `is_public=false` + сохраняется `rejection_reason` для пользователя

---

## Кампании: Premium-gate + canonical-only

**Решение:** Кампании только для Premium-пользователей, только с каноничными персонажами.

**Почему так:**
- Premium-дифференциация: кампании — сложный контент, требующий модерации сцен
- User characters не имеют гарантированного контекста — сцена предполагает конкретного персонажа
- Сцены создаются через Admin UI или SQL, а не самими пользователями

---

## campaignSceneId передаётся с клиента

**Решение:** Клиент посылает `campaignSceneId` в теле POST `/api/chat/stream`. Сервер загружает сцену по этому ID.

**Почему так:**
- Сервер остаётся stateless — нет серверной сессии кампании
- Клиент контролирует переход сцен (кнопка «Следующая сцена»)
- Прогресс сохраняется в `user_campaign_progress` через отдельный PATCH-запрос

---

## is_support — флаг в БД, не список SUPPORT_EMAILS

**Решение:** `users.is_support` BOOLEAN, назначается через Admin.

**Почему так:**
- Саппортеры могут меняться без перезапуска сервера
- `is_admin` остаётся через `ADMIN_EMAILS` в env (первичный bootstrapping)
- `supportMiddleware` проверяет `is_support || is_admin` — админ всегда имеет доступ к тикетам

---

## behavior_mode упрощён до 'default' | 'nsfw'

**Решение:** Убраны глобальные значения `study`, `work`, `psychologist`. Остались только `'default'` и `'nsfw'`.

**Почему так:**
- study/work/psychologist теперь реализованы как модули персонажа Morgan
- Глобальный режим — только NSFW-тогл (связан с верификацией возраста)
- Старые значения в БД не мигрировались — обрабатываются как fallback на `default`

---

## Таблицы БД (Feature Batch v3)

| Таблица | Назначение |
|---------|-----------|
| `support_tickets` | Тикеты поддержки: subject, status, user_id |
| `ticket_messages` | Сообщения в тикете: sender_role ('user'/'support') |
| `user_character_settings` | Per-(user_id, character_slug) активный модуль |
| `campaigns` | Кампании: character_slug, title, cover_url |
| `campaign_scenes` | Сцены кампании: location, situation, context_prompt |
| `user_campaign_progress` | Прогресс пользователя по кампании |

Новые колонки в существующих таблицах:
- `users.is_support` BOOLEAN
- `user_characters.moderation_status` ENUM('pending','approved','rejected')
- `user_characters.is_nsfw` BOOLEAN
- `user_characters.rejection_reason` TEXT NULL
