# Руководство: Персонажи как модули (code-first)

## Концепция

Каждый персонаж — отдельный TypeScript-файл в папке `src/characters/`.  
При старте бота (и через `npm run db:seed`) они автоматически синхронизируются с БД.

**Не нужно** заходить в БД или Drizzle Studio для добавления/редактирования персонажей.

---

## Структура папки

```
src/characters/
  _types.ts      ← типы (не трогать)
  index.ts       ← список всех персонажей (сюда добавлять импорты)
  morgan.ts      ← пример: персонаж Morgan
  aria.ts        ← твой новый персонаж
```

---

## Создать нового персонажа

### 1. Создать файл `src/characters/aria.ts`

```typescript
import type { CharacterDefinition } from './_types.js';

const aria: CharacterDefinition = {
  slug: 'aria',               // уникальный ID (менять нельзя после создания)
  name: 'Ария',               // имя в меню
  description: 'Загадочная AI с острым умом',  // подпись под именем
  systemPrompt: `
    Ты — Ария, интеллектуальный AI-компаньон.
    Ты говоришь точно, иногда с сухим юмором.
    Не многословна, но каждое слово весомо.
  `,
  isActive: true,
  nsfwCapable: false,   // true если у персонажа есть NSFW режимы

  modes: [
    {
      slug: 'default',
      name: '💬 Обычный',
      isDefault: true,
      sortOrder: 0,
    },
    {
      slug: 'analyst',
      name: '📊 Аналитик',
      promptAddon: 'В этом режиме ты разбираешь темы структурно: тезис → аргументы → вывод. Используй списки и цифры.',
      isDefault: false,
      sortOrder: 1,
    },
  ],
};

export default aria;
```

### 2. Зарегистрировать в `src/characters/index.ts`

```typescript
import aria from './aria.js';

const characters: CharacterDefinition[] = [
  morgan,
  aria,   // ← добавить
];
```

### 3. Синхронизировать с БД

```bash
npm run db:seed
```

Или просто перезапустить бот — seeder запускается автоматически при старте.

---

## Поля персонажа

| Поле | Тип | Описание |
|------|-----|----------|
| `slug` | string | Уникальный ключ. **Не менять** после создания — это PK для upsert |
| `name` | string | Имя в меню |
| `description` | string? | Короткое описание |
| `systemPrompt` | string | Основа личности. Многострочный шаблонный литерал удобен |
| `avatarUrl` | string? | URL аватара |
| `isActive` | bool? | `false` — скрыть от пользователей без удаления |
| `nsfwCapable` | bool? | `true` если у персонажа есть NSFW режимы |
| `modes` | array? | Список режимов (см. ниже) |

---

## Поля режима (mode)

| Поле | Тип | Описание |
|------|-----|----------|
| `slug` | string | Уникальный ключ режима внутри персонажа |
| `name` | string | Название в меню (эмодзи приветствуется) |
| `promptAddon` | string? | Текст, добавляемый к systemPrompt в этом режиме |
| `isNsfw` | bool? | Требует Premium или KYC |
| `isDefault` | bool? | Режим по умолчанию при создании сессии |
| `sortOrder` | number? | Порядок в меню (по возрастанию) |

### Как работает `promptAddon`

При обработке сообщения `ChatService` строит системный промпт так:

```
[character.systemPrompt]

[mode.promptAddon]       ← если режим выбран

[SAFETY инструкция]     ← если у пользователя нет NSFW доступа
```

---

## NSFW режимы

Чтобы добавить NSFW режим:

1. Установить `nsfwCapable: true` у персонажа
2. Добавить режим с `isNsfw: true`

```typescript
{
  slug: 'nsfw',
  name: '🔞 Взрослый',
  promptAddon: 'В этом режиме разрешён откровенный 18+ контент...',
  isNsfw: true,
  sortOrder: 99,
},
```

Пользователи без Premium и без KYC увидят кнопку заблокированной (🔒).  
Пользователи из Кореи (по KYC) не получат доступ даже с Premium.

---

## Отключить персонажа

Не удаляй из файла — просто поставь `isActive: false`:

```typescript
isActive: false,
```

Персонаж исчезнет из меню, но история чатов сохранится.

---

## Команды

```bash
npm run db:seed          # ручная синхронизация персонажей → БД
npm run dev              # запуск с авто-синхронизацией при старте
npm run db:studio        # GUI для просмотра результата
```
