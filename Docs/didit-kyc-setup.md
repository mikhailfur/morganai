# Гайд: Настройка Didit KYC

Didit — сервис верификации личности (KYC). Используется для подтверждения возраста 18+ пользователей Morgan AI.

**Документация Didit:** https://docs.didit.me

---

## Как это работает

1. Пользователь нажимает «Подтвердить возраст 18+» → открывается модальное окно
2. Нажимает «Начать верификацию» → бэкенд создаёт сессию через Didit API
3. Открывается новая вкладка с формой Didit (загрузка документа / selfie)
4. Пользователь проходит верификацию
5. Didit отправляет webhook на `POST /api/kyc-webhook`
6. Бэкенд устанавливает `kyc_verified = true` для пользователя
7. При возврате на страницу настроек (`?kyc=done`) — статус обновляется

---

## Настройка в Didit Business Console

### Шаг 1 — Создай аккаунт

Зарегистрируйся на [business.didit.me](https://business.didit.me).

### Шаг 2 — Получи API Key

В Didit Business Console:
1. Выбери своё Application из dropdown
2. Перейди в **API & Webhooks** в сайдбаре
3. Скопируй **API Key** — это значение `DIDIT_API_KEY`

> **Важно:** API Key — это секрет. Храни только на сервере, никогда во фронтенде.

### Шаг 3 — Создай или найди Workflow

В Didit → **Workflows** → **New Workflow**:
- Добавь нужные шаги (например: Document Verification + Liveness Check)
- Сохрани → скопируй **Workflow ID** — это значение `DIDIT_WORKFLOW_ID`

### Шаг 4 — Настрой Webhook

В Didit → **API & Webhooks** → **Add Webhook Destination**:
- **URL:** `https://твой-домен.com/api/kyc-webhook`
- **Events:** `status.updated` (минимум)
- Скопируй **Webhook Secret** — это значение `DIDIT_WEBHOOK_SECRET`

---

## Переменные окружения

Добавь в переменные окружения Docker/Dokploy (или `.env` локально):

```env
# Didit KYC
DIDIT_API_KEY=your_api_key_here
DIDIT_WORKFLOW_ID=your_workflow_id_here
DIDIT_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

Без `DIDIT_API_KEY` и `DIDIT_WORKFLOW_ID` — кнопка вернёт «KYC не настроен».  
`DIDIT_WEBHOOK_SECRET` опционален, но настоятельно рекомендуется в продакшне.

---

## API эндпоинты

| Метод | URL | Auth | Описание |
|-------|-----|------|---------|
| `POST` | `/api/kyc/session` | JWT (httpOnly cookie) | Создаёт сессию, возвращает `session_url` |
| `POST` | `/api/kyc-webhook` | Публичный (проверка подписи) | Принимает webhook от Didit |

### Ответ `POST /api/kyc/session`

```json
{ "session_url": "https://verification.didit.me/session/...", "session_id": "uuid" }
```

или, если пользователь уже верифицирован:

```json
{ "already_verified": true }
```

### Payload webhook от Didit

```json
{
  "session_id": "uuid",
  "status": "Approved",
  "webhook_type": "status.updated",
  "timestamp": 1627680000,
  "vendor_data": "123"
}
```

`vendor_data` — это `userId` пользователя Morgan AI (передаётся при создании сессии).

Возможные статусы: `Approved`, `Declined`, `In Review`, `In Progress`, `Not Started`, `Abandoned`.  
Только `Approved` устанавливает `kyc_verified = true`.

---

## Безопасность webhook

Бэкенд проверяет подпись через метод **X-Signature-Simple** (рекомендован Didit для Express):

- Заголовок подписи: `X-Signature-Simple`
- Заголовок времени: `X-Timestamp`
- Подписываемые данные: `"{timestamp}:{session_id}:{status}:{webhook_type}"`
- Алгоритм: `HMAC-SHA256(DIDIT_WEBHOOK_SECRET, signedData)`

Если `DIDIT_WEBHOOK_SECRET` не задан — проверка отключена (только для локальной разработки!).

---

## Тестирование локально

### Эмулировать webhook вручную (без реального Didit)

```bash
curl -X POST http://localhost:3001/api/kyc-webhook \
  -H "Content-Type: application/json" \
  -d '{"status":"Approved","vendor_data":"1","session_id":"test","webhook_type":"status.updated"}'
```

Это установит `kyc_verified = true` для пользователя с `id = 1`.

### Проверить статус

```bash
curl http://localhost:3001/api/auth/me \
  -H "Cookie: morgan_token=..." | jq .kyc_verified
```

---

## Troubleshooting

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `KYC не настроен: DIDIT_API_KEY не задан` | Переменная не задана | Добавь `DIDIT_API_KEY` в env |
| `Ошибка Didit (401)` | Неверный API Key | Проверь ключ в Didit Console |
| `Ошибка Didit (403)` | API Key не имеет доступа к ресурсу | Проверь права ключа |
| `Ошибка Didit (404)` | Неверный Workflow ID | Проверь `DIDIT_WORKFLOW_ID` |
| `Invalid signature` в webhook | Неверный webhook secret | Сверь `DIDIT_WEBHOOK_SECRET` с Console |
