# MorganAI - Technical Draft & Foundation

## Архитектура системы

### БЛОК 1. UI/UX Дизайн (Frontend - Next.js 14+)

#### Структура страниц:

**1. Главная (Маркетплейс)** - `app/(main)/page.tsx`
- Сетка карточек персонажей (Grid/List view)
- Категории: Учёба, Работа, Психолог, NSFW + пользовательские теги
- Поиск по имени и тегам
- Сортировка: по популярности, новизне, имени
- Фильтрация по видимости и NSFW

**2. Интерфейс Чата** - `app/chat/[characterId]/page.tsx`
- Дизайн в стиле мессенджера (как Telegram)
- Поддержка Markdown (react-markdown)
- Кнопка микрофона для голосовых сообщений
- Кнопка загрузки изображений (для Gemini Vision)
- Индикатор "ИИ печатает..." (typing indicator)
- WebSocket для real-time сообщений

**3. Студия (Создание ИИ)** - `app/studio/create/page.tsx`
- Поля: Имя, Аватарка, Приветствие, Системный промпт, Видимость
- Tags input для категоризации
- Переключатель NSFW контента
- Предпросмотр персонажа

### БЛОК 2. Логика Backend (NestJS)

#### Голосовые сообщения (Pipeline):
```
User Record (Browser) → Blob → WebSocket → Server
  → Whisper API (транскрибация)
  → Gemini 2.5 (генерация ответа)
  → MiniMax TTS (озвучка)
  → Stream Audio back to Client
```

#### Создание ИИ-моделей:
- `Character` модель в БД хранит `systemPrompt`
- При создании чата backend подтягивает `systemPrompt` из БД
- История сообщений (последние 20) передается в контекст LLM
- Gemini 2.5 API интеграция с поддержкой изображений

#### Монетизация:
- **Роли**: FREE (лимит 100 сообщений/день) / PREMIUM
- **Ограничения FREE**: нет голоса, нет NSFW, базовые модели
- **Интеграция**: Stripe (запад), YooKassa (РФ), CryptoPay (крипта)
- **Subscription** модель отслеживает: план, лимиты, доступы

### БЛОК 3. Созданный фундамент

#### 1. Схема БД (schema.prisma)
Файл: `prisma/schema.prisma`

Модели:
- **User** - пользователи с ролями и лимитами
- **Character** - персонажи с промптами и настройками видимости
- **ChatSession** - сессии чата между пользователем и персонажем
- **Message** - сообщения (USER/ASSISTANT) с поддержкой аудио и изображений
- **Subscription** - подписки с доступами к функциям
- **Transaction** - история платежей

#### 2. Структура проекта
Монорепозиторий с разделением на `frontend/` и `backend/`

#### 3. React-компонент формы создания персонажа
Файл: `frontend/src/components/character/CharacterForm.tsx`

Особенности:
- Поддержка загрузки аватара
- Tags input с добавлением/удалением
- Выбор видимости (Public/Private/Unlisted)
- Поддержка NSFW контента
- Интеграция с API `/api/characters`

#### 4. WebSocket Gateway (NestJS)
Файл: `backend/src/chat/chat.gateway.ts`

Функционал:
- Аутентификация через JWT токен
- Присоединение к сессии чата
- Получение `system_prompt` персонажа из БД
- Интеграция с Gemini 2.5 API
- Поддержка голосовых сообщений (Whisper + MiniMax)
- Отправка индикатора "печатает..."
- Проверка лимитов подписки

#### 5. AI Service
Файл: `backend/src/ai/ai.service.ts`

Методы:
- `generateResponse()` - генерация ответа через Gemini 2.5
- `transcribeAudio()` - транскрибация аудио через Whisper
- `textToSpeech()` - озвучка текста через MiniMax TTS

## Переменные окружения (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/morganai"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"

# Backend
FRONTEND_URL="http://localhost:3000"
PORT=3001

# AI Services
GEMINI_API_KEY="your_gemini_key"
OPENAI_API_KEY="your_openai_key"  # для Whisper
MINIMAX_API_KEY="your_minimax_key"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
YOOKASSA_SHOP_ID="..."
YOOKASSA_SECRET_KEY="..."
```

## Следующие шаги

1. Установить зависимости:
   - Frontend: `cd frontend && npm install next react react-dom tailwindcss`
   - Backend: `cd backend && npm install @nestjs/cli @nestjs/websockets @nestjs/platform-socket.io @prisma/client`

2. Настроить базу данных:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

3. Создать API routes в Next.js для создания персонажей

4. Реализовать чат-интерфейс с поддержкой WebSocket

5. Настроить интеграцию с платежными системами
