# Гайд: Настройка Didit KYC

Didit — сервис верификации личности (KYC). Используется для подтверждения возраста 18+ пользователей Morgan AI.

---

## Как это работает

1. Пользователь нажимает «Подтвердить возраст 18+» → открывается модальное окно
2. Нажимает «Начать верификацию» → бэкенд создаёт сессию через Didit API
3. Открывается новая вкладка с формой Didit (загрузка документа/selfie)
4. Пользователь проходит верификацию
5. Didit отправляет webhook на наш сервер (`POST /api/kyc-webhook`)
6. Бэкенд устанавливает `kyc_verified = true` для пользователя
7. При возврате на страницу настроек (`?kyc=done`) — статус обновляется

---

## Регистрация и настройка в Didit

### Шаг 1 — Создай аккаунт

Зарегистрируйся на [didit.me](https://didit.me) как бизнес-клиент.

### Шаг 2 — Создай Application

В панели Didit → **Applications** → **New Application**:
- Название: `Morgan AI`
- Тип: `Web`
- Redirect URL: `https://твой-домен.com/settings?kyc=done`

Получишь **Client ID** и **Client Secret**.

### Шаг 3 — Создай Workflow (если ещё не создан)

В панели Didit → **Workflows** → **New Workflow**:
- Выбери нужные шаги (например: Document + Liveness)
- Сохрани → получишь **Workflow ID**

Если у тебя уже есть готовый Workflow — просто скопируй его ID.

### Шаг 4 — Настрой Webhook

В панели Didit → **Webhooks** → **Add Webhook**:
- URL: `https://твой-домен.com/api/kyc-webhook`
- Events: `session.approved`, `session.declined` (минимум `session.approved`)
- Signing Secret: придумай или сгенерируй — это будет `DIDIT_WEBHOOK_SECRET`

---

## Переменные окружения

Добавь в `.env` (или в переменные окружения Docker/Dokploy):

```env
# Didit KYC
DIDIT_CLIENT_ID=your_client_id_here
DIDIT_CLIENT_SECRET=your_client_secret_here
DIDIT_WORKFLOW_ID=your_workflow_id_here
DIDIT_WEBHOOK_SECRET=your_webhook_signing_secret_here
```

**Без этих переменных** KYC-кнопка вернёт ошибку «KYC сервис не настроен».

---

## API эндпоинты

| Метод | URL | Auth | Описание |
|-------|-----|------|---------|
| `POST` | `/api/kyc/session` | Требует JWT | Создаёт сессию верификации, возвращает `session_url` |
| `POST` | `/api/kyc-webhook` | Публичный (подпись) | Принимает webhook от Didit |

### Ответ `POST /api/kyc/session`

```json
{
  "session_url": "https://verify.didit.me/session/...",
  "session_id": "sess_..."
}
```

или, если уже верифицирован:
```json
{
  "already_verified": true
}
```

### Формат webhook от Didit

```json
{
  "status": "Approved",
  "vendor_data": "123",
  "session_id": "sess_...",
  "workflow_id": "wf_..."
}
```

`vendor_data` — это `userId` пользователя Morgan AI, переданный при создании сессии.

---

## Безопасность webhook

Бэкенд проверяет подпись запроса через HMAC-SHA256:
- Заголовок: `x-signature`
- Алгоритм: `HMAC-SHA256(DIDIT_WEBHOOK_SECRET, JSON.stringify(body))`

Если `DIDIT_WEBHOOK_SECRET` не задан — проверка отключена (только для локальной разработки!).

---

## Тестирование

### Локально (без реального Didit)

Для тестирования без реального прохождения верификации можно вручную вызвать webhook:

```bash
curl -X POST http://localhost:3001/api/kyc-webhook \
  -H "Content-Type: application/json" \
  -d '{"status":"Approved","vendor_data":"1"}'
```

Это установит `kyc_verified = true` для пользователя с ID=1.

### Проверить статус

```bash
# После входа (получить cookie)
curl http://localhost:3001/api/auth/me \
  -H "Cookie: morgan_token=..." | jq .kyc_verified
```

---

## Дополнительно

- Документация Didit API: https://docs.didit.me
- Статусы сессий: `Approved`, `Declined`, `Expired`, `Pending`
- Только `Approved` устанавливает `kyc_verified = true`
- Верификацию нельзя «отменить» через UI — только через прямое обновление БД (для тестов)
