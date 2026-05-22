import { Router } from 'express';

// ---------------------------------------------------------------------------
// WebApp placeholder — будет реализован в будущем
// Точка входа для Telegram Mini App (TWA)
// ---------------------------------------------------------------------------

const router = Router();

router.get('/webapp', (_req, res) => {
  res.status(200).send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MorganAI WebApp</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: var(--tg-theme-bg-color, #1a1a2e);
      color: var(--tg-theme-text-color, #ffffff);
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    p { opacity: 0.7; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 MorganAI</h1>
    <p>WebApp coming soon</p>
  </div>
  <script>
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
    }
  </script>
</body>
</html>`);
});

// Future API routes for WebApp will go here:
// router.get('/webapp/api/profile', ...)
// router.get('/webapp/api/sessions', ...)
// router.get('/webapp/api/characters', ...)

export default router;
