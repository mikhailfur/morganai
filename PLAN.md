# Plan: Morgan AI — Feature Batch v2

## Context
Крупный итерационный апгрейд платформы Morgan AI. Текущее состояние: JWT в localStorage, лимиты не применяются, кнопки смены пароля и удаления аккаунта не работают, OAuth — заглушки, NSFW доступен без верификации, промпты без кэша, AdminPanel ограничена. Задача: реализовать весь блок надёжных основ + новые фичи.

---

## Phase 1: Foundation (не имеет зависимостей, реализуется первым)

### 1.1 httpOnly Cookie — миграция хранения токена

**Проблема:** JWT в localStorage уязвим к XSS. При F5 — `fetchUser` падает если токен уже истёк или сервер недоступен.

**Что изменить:**

1. `server/package.json` — добавить `cookie-parser`
2. `server/src/index.ts` — подключить `cookieParser()` middleware
3. `server/src/routes/auth.routes.ts`:
   - `POST /api/auth/register` — `res.cookie('morgan_token', token, { httpOnly: true, secure: process.env.NODE_ENV==='production', sameSite: 'lax', maxAge: 7*24*60*60*1000 })`
   - `POST /api/auth/login` — то же самое
   - `POST /api/auth/logout` — `res.clearCookie('morgan_token')`
4. `server/src/auth.ts` — `authMiddleware`: читать из `req.cookies.morgan_token` вместо `Authorization` header
5. `client/src/stores/auth.ts`:
   - Убрать `localStorage.setItem/getItem('morgan_token')`
   - Убрать `Authorization: Bearer` header из fetch
   - Добавить `credentials: 'include'` ко всем fetch/axios запросам
   - `fetchUser()` вызывать при init (не только в router guard)
6. `client/src/main.ts` или `App.vue` — добавить Cookie Consent Banner компонент

**Cookie Consent Banner** (новый компонент `client/src/components/CookieBanner.vue`):
- Дизайн в стиле `.dialogue-box` — снизу экрана, полупрозрачный
- Текст: "Мы используем cookie для авторизации (httpOnly, недоступны JS). Продолжая использование, вы соглашаетесь."
- Кнопка "Принять" → сохраняет `morgan_cookie_consent=true` в localStorage → баннер исчезает
- Показывается только если consent не получен

### 1.2 OpenRouter Prompt Caching

**Файл:** `server/src/openrouter.ts`

**Изменение:** В методах `generateResponse()` и `generateStreamResponse()` — изменить формат system сообщения:
```typescript
// Было:
{ role: 'system', content: systemPrompt }

// Стало:
{ role: 'system', content: [
  { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }
] }
```
Экономит ~50% токенов на системный промпт при повторных запросах (кэш живёт 5 минут).

### 1.3 Slide Overlay — эффект смены темы

**Файлы:** `client/src/stores/theme.ts`, `client/src/style.css`

**Реализация:**
- В `toggle()` — перед сменой класса создать `div.theme-overlay`, добавить в `document.body`
- Overlay: `position: fixed; inset: 0; z-index: 9999; background: var(--bg)` нужного цвета будущей темы
- CSS анимация: slide down (translateY: -100% → 0) 200ms, затем сменить тему, затем slide up (0 → 100%) 200ms → удалить overlay
- Добавить `.theme-overlay` класс в `style.css`

### 1.4 Mobile Bug Fixes

**Файлы:** `client/src/views/SettingsView.vue`, `client/src/views/LandingPage.vue`

**Баг 1 — Settings горизонтальный скролл выглядит странно:**
- Заменить горизонтальный topbar с режимами на аккордеон или полноэкранный dropdown-список на мобильном
- Либо переделать в вертикальный список с border-left accent под `@media (max-width: 768px)`

**Баг 2 — LandingPage feature blocks без левой линии:**
- Найти блок с фичами, добавить `border-left: var(--border)` для левого блока на мобильном

**Баг 3 — Кнопка темы меньше, выглядит в странной рамке:**
- В LandingPage и везде где используется `.theme-toggle` — выровнять размер с соседними кнопками
- Убрать лишний border/outline если есть, добавить `min-width` равный соседним кнопкам

---

## Phase 2: Core Features

### 2.1 Password Change & Account Deletion

**Backend:**

`server/src/routes/user.routes.ts`:
- `POST /api/user/change-password` (auth required):
  - Body: `{ currentPassword, newPassword }`
  - Verify current password через `comparePassword()`
  - Validate new password ≥ 8 chars
  - Hash + update в DB
- `DELETE /api/user/account` (auth required):
  - Body: `{ password }` — подтверждение пароля
  - DELETE из `chat_history`, `voice_messages`, `subscriptions`, `users`
  - Clear httpOnly cookie

**Frontend (`client/src/views/SettingsView.vue`):**
- Модальное окно для смены пароля: два поля (текущий / новый), кнопка Сохранить
- Модальное окно подтверждения удаления: ввод пароля + красная кнопка
- Оба модала в стиле `.dialogue-box` с дизайном Yume/Nocturne

### 2.2 База данных — расширение схемы

**Файл:** `server/src/database.ts`

**Новые/изменённые таблицы:**

```sql
-- Добавить в users:
ALTER TABLE users ADD COLUMN kyc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN subscription_expires_at BIGINT NULL;
ALTER TABLE users ADD COLUMN subscription_type ENUM('free', 'premium', 'premium_plus') DEFAULT 'free';
ALTER TABLE users ADD COLUMN daily_messages_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN daily_messages_reset BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN telegram_id BIGINT NULL;

-- Новая таблица лимитов тарифов:
CREATE TABLE IF NOT EXISTS plan_limits (
  plan_type ENUM('free', 'premium', 'premium_plus') PRIMARY KEY,
  daily_message_limit INT NOT NULL DEFAULT 50,
  context_messages INT NOT NULL DEFAULT 20,
  context_chars INT NOT NULL DEFAULT 12000,
  voice_limit INT NOT NULL DEFAULT 20,
  voice_window_hours INT NOT NULL DEFAULT 5,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- Лог событий администратора:
CREATE TABLE IF NOT EXISTS admin_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  target_user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON NULL,
  created_at BIGINT NOT NULL
);
```

### 2.3 Рабочие лимиты сообщений

**Логика проверки (server/src/routes/chat.routes.ts):**

```typescript
// Перед обработкой каждого сообщения:
1. Определить план пользователя: user.subscription_type
2. Загрузить план из plan_limits (кэшировать в памяти, обновлять раз в 5 мин)
3. Проверить daily_messages_reset vs начало текущего дня (UTC) → если старый, сбросить count
4. Проверить daily_messages_count >= daily_message_limit → вернуть 429 с сообщением о лимите
5. После успешного ответа: инкрементировать daily_messages_count
```

**Контекст в memory.ts:**
- `buildMessages()` принимает `planType` параметр
- Читает из plan_limits: `context_messages` и `context_chars`
- Free: 20 сообщений / 12к символов
- Premium: 50 / 50к (настраивается)
- Premium+: 100 / 100к (настраивается)

**Проверка подписки на expiry:**
- В `authMiddleware` или в начале chat routes: если `subscription_expires_at` < `Date.now()` → автоматически downgrade `subscription_type` → 'free'

### 2.4 NSFW / KYC система

**Правило:** NSFW доступен если `user.is_premium || user.kyc_verified`

**Backend:**
- `POST /api/user/kyc-verify` (auth required) — `UPDATE users SET kyc_verified = TRUE WHERE id = ?`
- В chat routes: проверить `user.kyc_verified || user.is_premium` для NSFW режима
- В SettingsView: NSFW доступен для kyc_verified или premium (убрать premium-only lock)

**Frontend:**
- В SettingsView: для non-premium пользователей показать кнопку "Подтвердить возраст (18+)" с диалогом-чекбоксом
- После подтверждения: режим NSFW разблокируется

### 2.5 Персонажи как code modules + переменные промптов

**Новая структура:**
```
server/src/characters/
  index.ts          — экспортирует массив всех персонажей
  morgan.ts         — определение Морган
  types.ts          — интерфейс CharacterDefinition
```

**`types.ts`:**
```typescript
interface CharacterDefinition {
  slug: string
  name: string
  description: string
  systemPrompt: string  // может содержать {{variables}}
  greetingMessage: string
  isPremium: boolean
  isActive: boolean
  sortOrder: number
}
```

**Переменные промптов** (`server/src/prompt.ts`):
```typescript
function injectPromptVariables(prompt: string, context: {
  userName: string
  userLocalTime?: string  // передаётся с клиента в запросе
  currentDate: string
}): string
```

- Client: отправлять `clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone` в запросе
- Server: конвертировать в локальное время пользователя, подставлять в `{{user_time}}`, `{{user_name}}`, `{{current_date}}`

**DB seeding:** `database.ts` seed читает из `characters/index.ts`, не хардкодит

---

## Phase 3: Admin Panel Expansion

**Файл:** `client/src/views/AdminView.vue`

**Новая структура — Tabs:**
1. **Обзор** (текущий dashboard со статистикой)
2. **Пользователи** (текущая таблица + ban кнопка)
3. **Подписки** — выдача Premium с датой истечения
4. **Лимиты** — таблица plan_limits, редактируемая inline
5. **Лог событий** — хронологический лог admin_events

**Tab: Подписки:**
- Поиск пользователя по email
- Выбор: Premium / Premium+
- Срок: 1 / 3 / 6 / 12 месяцев / навсегда
- `PUT /api/admin/user/:id/subscription` → обновляет `subscription_type`, `subscription_expires_at`, `is_premium`

**Tab: Лимиты:**
- Таблица 3 строки (free/premium/premium_plus) × колонки
- Редактирование in-place + кнопка Сохранить
- `PUT /api/admin/plan-limits` → обновляет plan_limits

**Tab: Лог событий:**
- Таблица: когда, кто (admin), действие, цель (пользователь)
- `GET /api/admin/events?limit=50`

**Ban пользователя:**
- Кнопка в таблице Users
- `PUT /api/admin/user/:id/ban`
- authMiddleware проверяет `is_banned` → 403

---

## Phase 4: Google & Telegram OAuth

### Backend

**Новые зависимости сервера:** `google-auth-library` (Google), встроенный `crypto` (Telegram)

**`server/src/routes/auth.routes.ts`:**

**Google:**
- `POST /api/auth/google` — принимает `{ idToken }` от клиента
- Верифицирует через `OAuth2Client.verifyIdToken()`
- Находит/создаёт пользователя по `google_id` или `email`
- Устанавливает httpOnly cookie → возвращает user

**Telegram:**
- `POST /api/auth/telegram` — принимает объект от Telegram Login Widget
- Верифицирует HMAC-SHA256 hash: `hash = HMAC(SHA256(botToken), dataCheckString)`
- Находит/создаёт пользователя по `telegram_id`
- Устанавливает httpOnly cookie

**Новые env vars:**
```
GOOGLE_CLIENT_ID=
TELEGRAM_BOT_TOKEN=
```

### Frontend

**LoginView.vue / RegisterView.vue:**
- Кнопка Google: загружает Google Identity Services, вызывает `google.accounts.id.initialize()`, `google.accounts.id.prompt()`
- Кнопка Telegram: загружает виджет `<script src="https://telegram.org/js/telegram-widget.js">`, обрабатывает callback

**Гайды (Docs/):**
- `Docs/google-oauth-setup.md` — пошаговая настройка Google Cloud Console, получение Client ID
- `Docs/telegram-oauth-setup.md` — создание бота через BotFather, настройка domain

---

## Phase 5: Documentation (Docs/)

### 5.1 Art Placeholders Guide (`Docs/art-placeholders-guide.md`)
- Размеры: LoginView left panel (600×900px), LandingPage hero (800×1200px)
- Как заменить `.art-slot`: `<img>` внутри div или `background-image` в CSS
- Файлы: `client/public/characters/morgan-portrait.jpg` и т.д.
- Оптимизация: WebP, max 200KB

### 5.2 Character & Prompt Guide (`Docs/character-prompt-guide.md`)
- Как создать новый файл персонажа в `server/src/characters/`
- Формат `CharacterDefinition`
- Доступные переменные промпта: `{{user_name}}`, `{{user_time}}`, `{{current_date}}`
- Как запустить seed, как активировать/деактивировать персонажа
- Шаблон system prompt

### 5.3 Google & Telegram OAuth Setup (см. Phase 4)

---

## Critical Files Summary

| Файл | Изменения |
|------|-----------|
| `server/src/index.ts` | cookie-parser |
| `server/src/auth.ts` | cookie auth, ban check |
| `server/src/routes/auth.routes.ts` | cookie set/clear, Google/Telegram endpoints |
| `server/src/routes/user.routes.ts` | change-password, delete-account, kyc-verify |
| `server/src/routes/chat.routes.ts` | limit check, context per plan, prompt vars |
| `server/src/routes/admin.routes.ts` | subscription, plan-limits, events, ban |
| `server/src/database.ts` | новые таблицы, новые методы |
| `server/src/memory.ts` | динамический контекст по тарифу |
| `server/src/openrouter.ts` | cache_control на system prompt |
| `server/src/prompt.ts` | injectPromptVariables() |
| `server/src/characters/` | новая папка с модулями персонажей |
| `client/src/stores/auth.ts` | убрать localStorage, credentials: include |
| `client/src/views/SettingsView.vue` | password/delete modals, kyc button |
| `client/src/views/AdminView.vue` | tabs, subscriptions, limits, logs |
| `client/src/views/LandingPage.vue` | mobile bug fixes |
| `client/src/stores/theme.ts` | slide overlay effect |
| `client/src/style.css` | theme-overlay animation |
| `client/src/components/CookieBanner.vue` | новый компонент |

---

## Verification

1. **Сессия:** Войти → F5 → сессия сохранена. DevTools → Application → показывает cookie `morgan_token` (httpOnly, не видна в localStorage)
2. **Cookie banner:** Первый визит → баннер снизу → нажать Принять → исчезает → при повторном визите не показывается
3. **Смена пароля:** Settings → Сменить пароль → ввести текущий и новый → success
4. **Удаление аккаунта:** Settings → Удалить → ввести пароль → logout → аккаунт не существует
5. **Лимиты:** Free аккаунт → 50 сообщений → получить 429 с понятным сообщением → следующий день → лимит сбросился
6. **KYC/NSFW:** Non-premium → Settings → "Подтвердить 18+" → NSFW режим появляется в списке
7. **Промпт-кэш:** В логах OpenRouter → видеть `cache_read_input_tokens > 0` на повторных запросах
8. **Тема:** Нажать toggle → слайд-оверлей плавно съезжает → тема переключилась
9. **Admin подписки:** Admin → Подписки → найти юзера → выдать Premium на 3 мес → в базе `subscription_expires_at` установлен
10. **Admin лимиты:** Admin → Лимиты → изменить Free лимит на 10 → сохранить → non-premium юзер получает лимит в 10 сообщений
11. **OAuth Google:** Login → Google → авторизация через Google аккаунт → попадает в чат
12. **OAuth Telegram:** Login → Telegram → виджет → авторизация → попадает в чат

---

## Порядок реализации

1. DB schema migrations (основа для всего остального)
2. httpOnly cookie migration + cookie banner
3. Mobile bug fixes + theme slide overlay
4. Password change + account deletion
5. Message limits + plan_limits admin UI
6. Персонажи как code modules + prompt variables
7. NSFW/KYC система
8. Admin Panel expansion (tabs, subscriptions, logs, ban)
9. OpenRouter prompt caching
10. Google OAuth + Telegram OAuth
11. Документация (Docs/)
