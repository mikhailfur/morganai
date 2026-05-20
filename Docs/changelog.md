# Changelog

## 2026-05-21 — SFW/NSFW вкладки + Tribute подписка + UX redesign

### Новые фичи

#### 1. SFW / NSFW вкладки персонажей
- Список персонажей разделён на две вкладки: `✅ SFW` и `🔞 NSFW`
- NSFW-вкладка закрыта для пользователей без KYC/Premium — показывается paywall
- Вкладки визуально переключаются, активная отмечена `✅`
- Документация: `Docs/sfw-nsfw-system.md`

#### 2. Tribute подписка
- Premium можно оформить через приватный Telegram-канал Tribute
- На экране Premium — кнопки покупки на 1/3/6/12 месяцев + кнопка «Проверить подписку»
- Бот проверяет членство в канале через `getChatMember`
- Автоматическая проверка при `/start` раз в час; при уходе из канала Premium отзывается
- Поле `premium_source` в БД: `'tribute'` или `'manual'` (ручная выдача не отзывается)
- Документация: `Docs/tribute-setup.md`

#### 3. Локальная система изображений
- Папка `image/` для картинок меню (banner, sfw, nsfw, premium, characters/)
- После первой загрузки в Telegram кешируется `file_id` — навигация мгновенная
- Поддерживаются `.jpg`, `.jpeg`, `.png`, `.webp`
- Если файла нет — меню показывается как текст (без ошибок)
- Документация: `Docs/image-system.md`

#### 4. UX / визуальный редизайн
- Все экраны: разделители `━━━━━━━━━━━━━━━`, структурированные заголовки
- Статусная строка в `/start` и главном меню: `💎 Premium активна` / `🆓 Free · ✅ KYC`
- Карточка персонажа: показывает аватар + описание + кнопка «Назад к списку»
- Настройки: показывает источник Premium (`Tribute` vs обычный)
- Premium-экран: разные тексты в зависимости от наличия Tribute-ссылок

### Изменения в БД (миграция 0005)

Добавлены поля в таблицу `users`:

| Поле                  | Тип               | Описание                              |
|-----------------------|-------------------|---------------------------------------|
| `tribute_verified`    | `boolean NOT NULL`| Пользователь в Tribute-канале         |
| `tribute_checked_at`  | `timestamp`       | Время последней проверки              |
| `premium_source`      | `varchar(20)`     | `'manual'` / `'tribute'` / `null`     |

### Новые env-переменные

```
TRIBUTE_CHANNEL_ID    # ID приватного Tribute-канала (-100xxxxxxxxx)
TRIBUTE_LINK_1M       # Ссылка покупки на 1 месяц
TRIBUTE_LINK_3M       # Ссылка покупки на 3 месяца
TRIBUTE_LINK_6M       # Ссылка покупки на 6 месяцев
TRIBUTE_LINK_12M      # Ссылка покупки на 12 месяцев
```

Переменные опциональны. Если `TRIBUTE_CHANNEL_ID` не задан — Tribute-кнопки не показываются.

### Новые файлы

| Файл | Описание |
|------|----------|
| `image/` | Папка для картинок меню |
| `image/characters/` | Папка для аватаров персонажей |
| `src/bot/helpers/image-cache.ts` | Загрузка локальных файлов + кеш file_id |
| `src/bot/helpers/screen.ts` | Универсальный показ экрана (фото/текст) |
| `src/services/tribute.service.ts` | Проверка членства в Tribute-канале |
| `drizzle/0005_foamy_namorita.sql` | SQL-миграция новых полей users |

### Изменённые файлы

| Файл | Что изменилось |
|------|----------------|
| `src/database/schema.ts` | + 3 поля в users |
| `src/database/repositories/user.repository.ts` | + `updateTribute()`, `updatePremiumSource()` |
| `src/database/repositories/character.repository.ts` | + `findAllSfw()`, `findAllNsfw()` |
| `src/services/character.service.ts` | + `listSfw()`, `listNsfw()` |
| `src/services/admin.service.ts` | `setUserTier()` теперь пишет `premiumSource = 'manual'` |
| `src/services/nsfw.service.ts` | Без изменений (Tribute → Premium tier → доступ через существующую логику) |
| `src/config/env.ts` | + TRIBUTE_* переменные |
| `src/bot/index.ts` | + TributeService, обновлены сигнатуры хендлеров |
| `src/bot/handlers/start.ts` | Фото-баннер, фоновая ревалидация Tribute |
| `src/bot/handlers/menu.ts` | Premium-экран с Tribute, улучшенное форматирование |
| `src/bot/handlers/character.ts` | SFW/NSFW вкладки, карточки с аватарами |
| `Dockerfile` | + `COPY image/ ./image/` |

---

## Более ранние записи

*Предыдущие изменения не задокументированы в этом файле. История доступна через `git log`.*
