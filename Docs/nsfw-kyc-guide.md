# Руководство: NSFW и KYC верификация

## Архитектура

```
Бот (Telegraf polling) + HTTP сервер (Express) запускаются вместе.

Эндпоинты:
  GET  /health           → healthcheck для Dokploy/Docker
  GET  /webapp           → заглушка под будущий Telegram Mini App
  POST /webhooks/didit   → Didit KYC webhook
```

---

## Логика доступа к NSFW контенту

Доступ открывается при выполнении **любого одного** условия:
- `tier = 'premium'` — Premium подписка
- `kyc_verified = true` — пройдена KYC верификация

Пользователи с `kyc_nationality = 'KOR'` (Южная Корея) **заблокированы навсегда** — даже при Premium.

### Что происходит без доступа

Инструкция в системный промпт:
```
Если сообщение содержит 18+ контент → ответить ТОЛЬКО: __NSFW_BLOCKED__
```
Бот перехватывает sentinel, не сохраняет ответ в БД и показывает paywall с кнопками.

---

## Настройка Didit KYC

### 1. Создать организацию

[https://business.didit.me](https://business.didit.me) → Sign Up → создать организацию.

### 2. Создать Workflow

Dashboard → **Workflows** → New Workflow:
- ✅ Document verification (обязательно)
- ✅ Passive Liveness (рекомендуется)

Скопировать **Workflow ID**.

### 3. Создать API Client

Dashboard → **API Clients** → New Client:
- Type: `client_credentials`

Скопировать **Client ID** и **Client Secret**.

### 4. Создать Webhook Destination

Dashboard → **Webhooks** → New Destination:
- URL: `https://your-domain.com/webhooks/didit`
- Events: `status.updated` (минимум)

Скопировать **Secret** (показывается только один раз).

### 5. Переменные окружения

```env
DIDIT_CLIENT_ID=your_client_id
DIDIT_CLIENT_SECRET=your_client_secret
DIDIT_WORKFLOW_ID=your_workflow_id
DIDIT_WEBHOOK_SECRET=your_webhook_secret

PORT=3000
SERVER_URL=https://your-domain.com
```

---

## Поток верификации

```
1. Пользователь → «⚙️ Настройки» → «🪪 Пройти KYC»

2. KycService.createSession(userId):
   a. OAuth2 client_credentials → access_token (кэшируется до истечения)
   b. POST /v3/session/ { workflow_id, vendor_data: userId }
   c. Сохранить kyc_session_id в users таблицу
   d. Вернуть verification_url → отправить пользователю

3. Пользователь открывает ссылку → загружает документ → liveness → готово

4. Didit → POST /webhooks/didit (JSON payload)

5. Сервер:
   a. Верификация подписи: X-Signature-V2 (canonical JSON) → HMAC-SHA256
      Fallback: X-Signature (raw body)
   b. Проверка timestamp (±5 минут)
   c. Ответить 200 немедленно (Didit требует ответ < 5 сек)
   d. Обработка асинхронно:
      - Найти пользователя по kyc_session_id или vendor_data
      - Если status=Approved: retrieveSession() → nationality из id_verifications[0]
      - Обновить users: kyc_verified, kyc_nationality, nsfw_unlocked
      - Telegram уведомление пользователю
```

---

## Верификация подписи (детально)

Didit присылает три заголовка (использовать в порядке приоритета):

| Заголовок | Что подписывается | Алгоритм |
|-----------|------------------|----------|
| `X-Signature-V2` | Canonical JSON (sorted keys) | HMAC-SHA256 |
| `X-Signature` | Raw request bytes | HMAC-SHA256 |
| `X-Signature-Simple` | `"{ts}:{session_id}:{status}:{type}"` | HMAC-SHA256 |

Реализация в `KycService.verifySignature()`:
```typescript
// X-Signature-V2: canonical JSON с отсортированными ключами
const canonical = canonicalJson(parsedBody);
const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigV2));
```

Raw body захватывается в Express middleware **до** JSON-парсинга.

---

## Статусы Didit

| Статус | Значение |
|--------|----------|
| `Approved` | Верификация пройдена |
| `Declined` | Отклонено |
| `In Review` | На ручной проверке |
| `Abandoned` | Пользователь бросил |
| `Expired` | Истёк срок сессии |
| `Resubmitted` | Повторная попытка |

---

## Региональная блокировка

Nationality приходит в `id_verifications[0].nationality` — ISO 3166-1 alpha-3 (напр. `KOR`, `USA`, `DEU`).

Если nationality входит в `BLOCKED_REGIONS = ['KOR']` — `nsfw_unlocked` остаётся `false` навсегда.

Для добавления регионов: `src/services/nsfw.service.ts` → `const BLOCKED_REGIONS`.

---

## Настройка SERVER_URL в Dokploy

1. Dokploy → приложение → Domains → добавить домен
2. Добавить в `.env` переменную `SERVER_URL=https://your-domain.com`
3. Порт `3000` уже прописан в Dockerfile (`EXPOSE 3000`) и docker-compose

Убедиться, что Dokploy проксирует порт 3000 через Traefik.

---

## WebApp (будущее)

Заглушка доступна по `GET /webapp` — показывает «coming soon» с подключённым Telegram Web App SDK.

Будущие API-роуты под WebApp будут добавлены в `src/server/routes/webapp.ts`.
