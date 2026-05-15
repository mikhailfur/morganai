# Настройка Google OAuth для Morgan AI

## Шаг 1. Создать проект в Google Cloud Console

1. Открой [console.cloud.google.com](https://console.cloud.google.com)
2. Создай новый проект (или выбери существующий)
3. В левом меню → **APIs & Services** → **Credentials**

## Шаг 2. Настроить OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. User Type: **External**
3. Заполни поля:
   - App name: `Morgan AI`
   - User support email: твой email
   - Developer contact: твой email
4. Scopes: добавь `email` и `profile`
5. Сохрани

## Шаг 3. Создать OAuth Client ID

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth Client ID**
2. Application type: **Web application**
3. Authorised JavaScript origins:
   - `http://localhost:5173` (для разработки)
   - `https://your-domain.com` (для продакшна)
4. Нажми **Create**
5. Скопируй **Client ID** (вид: `123456789-xxx.apps.googleusercontent.com`)

## Шаг 4. Добавить переменные окружения

### Локальная разработка (`.env` в корне):
```
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
```

### В Dokploy (продакшн):
- Зайди в панель Dokploy → твоё приложение → **Environment**
- Добавь: `GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com`

### Для клиента Vite (`.env` в `client/`):
```
VITE_GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
```

## Шаг 5. Проверить работу

1. Запусти `npm run dev`
2. Открой `/login`
3. Нажми кнопку Google — должен открыться popup авторизации

## Важные замечания

- Google показывает предупреждение "not verified" в тестовом режиме — это нормально во время разработки
- Для продакшна нужно пройти верификацию Google (если планируешь >100 пользователей)
- httpOnly cookie устанавливается после успешной авторизации — токен не доступен JS
