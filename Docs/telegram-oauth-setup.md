# Настройка Telegram Login для Morgan AI

## Шаг 1. Создать бота через BotFather

1. Открой Telegram, найди [@BotFather](https://t.me/BotFather)
2. Отправь `/newbot`
3. Введи имя бота: `Morgan AI Bot`
4. Введи username: `morganai_bot` (или любой свободный, должен заканчиваться на `bot`)
5. Скопируй **Bot Token** (вид: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Шаг 2. Указать домен для Login Widget

1. Напиши BotFather: `/setdomain`
2. Выбери своего бота
3. Введи домен продакшна: `your-domain.com` (без https://)
4. Для локальной разработки: `localhost`

## Шаг 3. Добавить переменные окружения

### Локальная разработка (`.env` в корне):
```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### В Dokploy (продакшн):
- Зайди в панель Dokploy → твоё приложение → **Environment**
- Добавь: `TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

## Шаг 4. Добавить Telegram Login Widget (опционально)

Если хочешь виджет вместо кнопки — добавь в `LoginView.vue`:

```html
<!-- Telegram Login Widget -->
<script
  async
  src="https://telegram.org/js/telegram-widget.js?22"
  data-telegram-login="morganai_bot"
  data-size="large"
  data-onauth="onTelegramAuth(user)"
  data-request-access="write"
></script>
```

Callback `onTelegramAuth` уже реализован в `LoginView.vue`.

## Как работает верификация

Telegram виджет передаёт данные пользователя с HMAC-SHA256 подписью.  
Сервер проверяет подпись: `HMAC(SHA256(botToken), checkString)`.  
Это **безопасно** — данные нельзя подделать без знания Bot Token.

## Важные замечания

- Telegram создаёт аккаунт с email вида `tg_<id>@morgan.local` (синтетический, для внутренних нужд)
- Пользователь с Telegram не может сменить пароль (нет password_hash)
- Кнопка бана работает для Telegram-пользователей так же, как и для email-пользователей
