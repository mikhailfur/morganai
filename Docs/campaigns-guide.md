# Система кампаний Morgan AI

Кампании — игровые режимы с последовательными сценами для Premium-пользователей. Каждая сцена задаёт контекст (локацию, ситуацию) и дополнительный system prompt для AI.

---

## Структура таблиц

```
campaigns
  id, character_slug, title, description, cover_url, is_active, sort_order, created_at

campaign_scenes
  id, campaign_id, scene_order, title, location, situation, context_prompt

user_campaign_progress
  id, user_id, campaign_id, current_scene_id, is_completed, started_at, updated_at
```

---

## Как создать кампанию

### Через Admin UI

Admin → Кампании → «+ Создать» → заполнить поля → добавить сцены через SQL (пока нет UI для сцен).

### Через SQL

```sql
-- Создать кампанию
INSERT INTO campaigns (character_slug, title, description, cover_url, is_active, sort_order, created_at)
VALUES ('morgan', 'Ночь в библиотеке', 'Детективная история в старой библиотеке', NULL, 1, 0, NOW(3));

-- Добавить сцены
INSERT INTO campaign_scenes (campaign_id, scene_order, title, location, situation, context_prompt)
VALUES
  (1, 1, 'Вход', 'Старая городская библиотека, полночь',
   'Пользователь только что вошёл в закрытую библиотеку. Везде темно, слышны странные звуки.',
   'Ты встречаешь незваного гостя с холодным интересом. Ты знаешь каждый уголок этой библиотеки. Говори загадками.'),

  (1, 2, 'Тайный архив', 'Подвальный архив, свет фонарика',
   'Они нашли старый архив. Там документы, которые не должны существовать.',
   'Ты обнаружила тайну. Твоё отношение к гостю изменилось — теперь ты не уверена, друг он или враг.');
```

---

## Формат context_prompt

`context_prompt` добавляется в system prompt при каждом сообщении в рамках сцены:

```
## Кампания: {campaign.title}
## Локация: {scene.location}
## Ситуация: {scene.situation}

{scene.context_prompt}
```

**Рекомендации:**
- `location` — конкретное место (1-2 строки)
- `situation` — что происходит прямо сейчас (2-4 строки для пользователя, не для AI)
- `context_prompt` — инструкция для AI: как себя вести, что знает, что скрывает

---

## API-эндпоинты

```
GET  /api/campaigns               → список активных кампаний + прогресс текущего юзера
GET  /api/campaigns/:id           → кампания + сцены (требует Premium)
POST /api/campaigns/:id/progress  → начать кампанию → {current_scene: CampaignScene}
PATCH /api/campaigns/:id/progress → {current_scene_id, is_completed?} → обновить прогресс
```

Кампании требуют `authMiddleware`. `GET /:id` и progress — также `isPremium` проверку.

---

## Как работает прогресс

1. Пользователь нажимает «Начать» → `POST /api/campaigns/:id/progress` → создаёт запись в `user_campaign_progress` с первой сценой
2. В `chat.store` устанавливается `activeCampaignScene` — текущая сцена
3. При каждом сообщении в чате клиент посылает `campaignSceneId` в теле запроса
4. Сервер загружает сцену, инжектирует контекст в system prompt
5. Переход к следующей сцене: `PATCH /api/campaigns/:id/progress { current_scene_id: nextId }`
6. Завершение: `PATCH` с `is_completed: true`

---

## Ограничения

- Только **Premium**-пользователи могут открывать детали и прогресс кампании
- Только **каноничные персонажи** (`character_slug` должен совпадать с текущим активным персонажем)
- Управление кампаниями (создание, редактирование сцен) — только через Admin или SQL

---

## Управление через Admin

Admin → Кампании:
- Список кампаний с количеством сцен
- Создание новой кампании (character_slug, title, description, cover_url, sort_order)
- Удаление кампании (каскадно удаляет сцены и прогресс)

Сцены пока добавляются только через SQL (Admin UI для сцен — в планах).
