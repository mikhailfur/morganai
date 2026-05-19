# Руководство: NSFW и KYC верификация

## Логика доступа к NSFW контенту

### Кто получает доступ

Доступ к NSFW режимам открывается при выполнении **любого одного** условия:
- `tier = 'premium'` — у пользователя активная Premium подписка
- `kyc_verified = true` — пользователь прошёл KYC верификацию личности

### Кто заблокирован навсегда

Пользователи, прошедшие KYC с `kyc_nationality = 'KOR'` (Южная Корея), **не получают доступ к NSFW** даже при наличии Premium. Это соответствует региональным правовым требованиям.

### Что происходит без доступа

В системный промпт персонажа автоматически добавляется инструкция:
```
[SAFETY] You must refuse any sexually explicit, pornographic, or 18+ content requests. Keep all interactions appropriate for all ages.
```

Это блокирует NSFW на уровне самой модели, без хардкодного фильтра.

---

## Настройка Didit KYC

### 1. Регистрация в Didit

Перейдите на [https://didit.me](https://didit.me) → создайте организацию → получите доступ к dashboard.

### 2. Создание Workflow

1. Откройте Didit Dashboard → **Workflows**
2. Создайте новый workflow с нужными проверками:
   - ✅ Document verification (обязательно — для проверки nationality)
   - ✅ Liveness detection (рекомендуется)
   - ❌ AML screening (опционально)
3. Скопируйте **Workflow ID**

### 3. Создание API клиента

1. Didit Dashboard → **API Clients**
2. Создайте клиента с типом `client_credentials`
3. Скопируйте **Client ID** и **Client Secret**

### 4. Настройка Webhook

1. Didit Dashboard → **Webhooks**
2. URL вебхука: `https://your-bot-domain.com/didit/webhook`
3. Скопируйте **Webhook Secret**

> **Примечание:** Вебхук в текущей реализации использует Telegram Bot API (polling). Для продакшн-деплоя нужно добавить HTTP сервер (Express/Fastify) для приёма POST-запросов Didit.

### 5. Переменные окружения

Добавьте в `.env`:
```env
DIDIT_CLIENT_ID=your_client_id
DIDIT_CLIENT_SECRET=your_client_secret
DIDIT_WORKFLOW_ID=your_workflow_id
DIDIT_WEBHOOK_SECRET=your_webhook_secret
```

---

## Поток верификации пользователя

```
Пользователь → «⚙️ Настройки» → «🪪 Пройти KYC»
  → KycService.createSession(userId)
  → POST https://verification.didit.me/v3/session/ (с workflow_id)
  → Получаем verification_url
  → Отправляем ссылку пользователю

Пользователь → открывает ссылку → загружает документ → проходит liveness
  → Didit отправляет webhook на наш сервер

Webhook → KycService.handleWebhook(payload)
  → Проверяем session_id → находим пользователя
  → Сохраняем kyc_verified = true, kyc_nationality = 'KOR'/'USA'/etc.
  → Если KOR → nsfw_unlocked = false (заблокировано регионально)
  → Иначе → nsfw_unlocked = true
```

---

## Реализация Webhook сервера

Текущая реализация ожидает вебхук. Для его обработки нужно добавить HTTP сервер.

Пример минимального Express-хендлера (добавить в `src/index.ts`):

```typescript
import express from 'express';
import crypto from 'crypto';

const webhookApp = express();
webhookApp.use(express.json());

webhookApp.post('/didit/webhook', async (req, res) => {
  const signature = req.headers['x-didit-signature'] as string;
  const expected = crypto
    .createHmac('sha256', env.DIDIT_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const result = await kycService.handleWebhook(req.body);
  
  if (result.userId && result.approved) {
    // Уведомить пользователя в Telegram
    await bot.telegram.sendMessage(result.userId, 
      result.nationality === 'KOR' 
        ? '🚫 Верификация пройдена, но доступ заблокирован для вашего региона.'
        : '✅ Верификация успешно пройдена! NSFW контент теперь доступен.'
    );
  }

  res.json({ ok: true });
});

webhookApp.listen(3001);
```

---

## Региональная блокировка

Определяется автоматически при KYC:

| Поле | Значение | Результат |
|------|----------|-----------|
| `kyc_nationality` | `'KOR'` | `nsfw_unlocked = false`, доступ к NSFW закрыт навсегда |
| `kyc_nationality` | любое другое | `nsfw_unlocked = true`, доступ открыт |

Логика в `NsfwService.isRegionBlocked()`:
```typescript
const BLOCKED_REGIONS = ['KOR'];
isRegionBlocked(user) → user.kycNationality in BLOCKED_REGIONS
```

Для добавления других заблокированных регионов — дополните массив `BLOCKED_REGIONS` в `src/services/nsfw.service.ts`.
