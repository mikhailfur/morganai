# SFW / NSFW система персонажей

## Концепция

Персонажи разделены на две категории через флаг `nsfw_capable` в таблице `characters`:

| Флаг              | Значение | Отображение |
|-------------------|----------|-------------|
| `nsfw_capable = false` | SFW-персонаж | Вкладка 📗 SFW, иконка 🎭 |
| `nsfw_capable = true`  | NSFW-персонаж | Вкладка 🔞 NSFW, иконка 🔞 |

## Доступ к NSFW-контенту

Пользователь получает доступ к NSFW, если выполнено хотя бы одно условие:

1. **Premium подписка** (`tier = 'premium'`) — через Tribute или выдана вручную администратором
2. **KYC-верификация** (`nsfw_unlocked = true`) — после прохождения верификации личности через Didit
3. **Ручная разблокировка** (`nsfw_unlocked = true`) — через админ-панель

Исключение: пользователи из заблокированных регионов (Южная Корея, `kycNationality = 'KOR'`) не получают доступ даже при Premium/KYC.

## Поведение вкладок

### Вкладка SFW (открыта для всех)
- Всегда доступна
- Показывает персонажей с `nsfw_capable = false`
- Картинка: `image/sfw.jpg`

### Вкладка NSFW

**Без доступа:**
- Кнопка `🔞 NSFW` видна (пользователь знает, что контент существует)
- При нажатии — экран-заглушка с предложением оформить Premium или пройти KYC
- Список персонажей не показывается

**С доступом:**
- Показывает персонажей с `nsfw_capable = true`
- Картинка: `image/nsfw.jpg`

## Режимы (modes) и их NSFW-флаг

Помимо самого персонажа, у каждого режима есть флаг `is_nsfw` в таблице `character_modes`. Это позволяет создавать смешанных персонажей: SFW по умолчанию, но с доступными NSFW-режимами для тех, у кого есть доступ.

При выборе режима в сессии бот проверяет доступ через `NsfwService.canUseMode()`. NSFW-режим у пользователя без доступа показывается с иконкой 🔒.

## Добавление нового персонажа

### SFW-персонаж
```sql
INSERT INTO characters (slug, name, description, system_prompt, nsfw_capable)
VALUES ('aria', 'Aria', 'Описание', 'System prompt...', false);
```

### NSFW-персонаж
```sql
INSERT INTO characters (slug, name, description, system_prompt, nsfw_capable)
VALUES ('lena', 'Lena', 'Описание', 'System prompt...', true);
```

После добавления — добавь картинку: `image/characters/{slug}.jpg`

## Файлы реализации

| Файл | Роль |
|------|------|
| `src/database/schema.ts` | Поля `nsfw_capable` (characters), `is_nsfw` (character_modes) |
| `src/services/nsfw.service.ts` | `hasNsfwAccess()`, `canUseMode()`, NSFW-заглушка |
| `src/database/repositories/character.repository.ts` | `findAllSfw()`, `findAllNsfw()` |
| `src/bot/handlers/character.ts` | Логика вкладок, карточки персонажей |
| `src/bot/handlers/sessions.ts` | Блокировка NSFW-режимов |
| `src/bot/handlers/nsfw-paywall.ts` | Экран-заглушка при попытке доступа к NSFW |
