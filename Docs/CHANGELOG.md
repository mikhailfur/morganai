# Changelog — Morgan AI

## [2026-05] Design Overhaul + Mobile Fixes

### Дизайн-система
- **Полный редизайн**: старый стиль (glassmorphism + dark purple/pink градиенты) заменён на **manga/editorial dual-theme**
  - **Yume (светлая тема)**: кремовый фон `#f5ecdc`, бордовый `#5c1a1f`, терракота, жирные `2.5px solid` рамки, `box-shadow: 5px 5px 0` (flat shadow)
  - **Nocturne (тёмная тема)**: кофейный чёрный `#0e0807`, алый `#c63d2f`, тонкие полупрозрачные рамки, без теней
- **Шрифты**: `Fraunces` + `Noto Serif JP` для display; `Inter` для UI; system monospace для лейблов
- **Иероглифы**: декоративные японские символы в заголовках секций и карточках режимов
- **Washi tape**: декоративный элемент на лэндинге (только в светлой теме)
- **Переключатель темы**: `СВЕТ`/`НОЧЬ` текст вместо emoji (проблема с рендерингом гифа `☽`)

### Новые страницы
- **`PricingView.vue`**: страница тарифов с manga-grid карточками тарифов Free / Premium / Premium+
- **`LegalView.vue`**: страница правовых документов (5 документов: приватность, условия, оферта, возврат, cookie)

### Форматирование сообщений (ChatView.vue)
- **Исправлен баг**: `(--accent3); font-style: normal;` появлялся в сообщениях из-за inline CSS в generated HTML
  - Причина: regex `\(([^)]+)\)` матчил `(--accent3)` из `<em style="color: var(--accent3)...">`
  - Решение: (1) мысли заменяются **до** курсива, (2) используются CSS-классы вместо inline `var()`
- Добавлены CSS-классы: `.msg-action` (действия курсивом, цвет `--accent3`) и `.msg-thought` (мысли, прозрачный)

### Мобильная адаптация (Mobile-First)
- Все root-контейнеры: `height: 100dvh` (dynamic viewport height для адресной строки браузера)
- **Chat**: sidebar → `position: fixed` с backdrop overlay, hamburger-кнопка `☰`
- **Settings**: sidebar → горизонтальный скролируемый topbar; режимы в 1 колонку; панели стекуются
- **Landing**: manga-grid → 2-column `1fr 1fr`; art + hero на всю ширину; nav скрывает лишние кнопки
- **Кнопки**: `white-space: nowrap` предотвращает перенос текста
- Замена emoji-иконок (`📷`, `🎤`) на inline SVG с классом `.chat-icon-btn`

### TypeScript
- `client/src/types/index.ts`: добавлены `voice_count_today?: number` в `User` и `greeting_message?: string` в `Character`
- Удалена неиспользуемая константа `navItems` из `SettingsView.vue`
- `const isMobile = ref(window.innerWidth < 768)` вынесен в `<script setup>` (был в template — TS ошибка)

### Рандомные приветствия
- `LandingPage.vue`: 6 вариантов цитат Морган, выбирается случайно при загрузке страницы
- `ChatView.vue`: 8 вариантов приветствия в пустом состоянии чата

### Тарифы
- **Premium+** изменён: с единоразовой оплаты (4990₽ навсегда) на **ежемесячную подписку** (599₽/мес или 4790₽/год)
- Новые возможности Premium+: безлимит голоса, расширенный контекст 100к токенов, приоритетная генерация
- `LegalView.vue` § 4 обновлён: "Premium и Premium+: 30 дней с момента оплаты"

### CI/CD
- **GitHub Actions** → **GHCR** → **Dokploy**: полностью настроен `.github/workflows/deploy.yml`
- Триггер: push в ветку `dev`
- Docker image: `ghcr.io/mikhailfur/morganai:latest` (публичный пакет)
- Секрет `DOKPLOY_WEBHOOK_URL` из Dokploy panel
