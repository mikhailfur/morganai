import { Router, Request, Response } from 'express';
import { createHash, createHmac } from 'crypto';
import { database } from '../database';
import { hashPassword, comparePassword, generateToken, COOKIE_NAME, COOKIE_OPTIONS, authMiddleware } from '../auth';

const router = Router();

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
};

const formatUser = (user: any, isPremium?: boolean) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  is_premium: isPremium !== undefined ? isPremium : Boolean(user.is_premium),
  is_admin: Boolean(user.is_admin),
  behavior_mode: user.behavior_mode || 'default',
  selected_character: user.selected_character || 'morgan',
  avatar_url: user.avatar_url,
  kyc_verified: Boolean(user.kyc_verified),
  subscription_type: user.subscription_type || 'free',
  total_messages: user.total_messages,
  created_at: user.created_at,
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
      return;
    }

    const existing = await database.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email уже зарегистрирован' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = await database.createUser(email, username, passwordHash);
    const token = generateToken({ userId, email });
    setAuthCookie(res, token);

    res.status(201).json({
      user: formatUser({ id: userId, email, username, is_premium: false, is_admin: false, behavior_mode: 'default', selected_character: 'morgan' }),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email и пароль обязательны' });
      return;
    }

    const user = await database.getUserByEmail(email);
    if (!user || !user.password_hash) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    if (user.is_banned) {
      res.status(403).json({ error: 'Аккаунт заблокирован' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);
    const isPremium = await database.checkSubscription(user.id);

    res.json({ user: formatUser(user, isPremium) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

// Get current user
router.get('/me', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = await database.getUserById(req.user.userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }
    const isPremium = await database.checkSubscription(user.id);
    res.json(formatUser(user, isPremium));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Public app config (Google Client ID, Telegram Bot ID) — for runtime env injection
router.get('/config', (_req: Request, res: Response) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    telegramBotId: botToken ? botToken.split(':')[0] : null,
  });
});

// Google OAuth
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) { res.status(400).json({ error: 'Токен не передан' }); return; }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      res.status(503).json({ error: 'Google OAuth не настроен — см. Docs/google-oauth-setup.md' });
      return;
    }

    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub) { res.status(401).json({ error: 'Неверный Google токен' }); return; }

    const { sub: googleId, email, name } = payload;
    if (!email) { res.status(400).json({ error: 'Email недоступен' }); return; }

    let user = await database.getUserByGoogleId(googleId);
    if (!user) {
      user = await database.getUserByEmail(email);
      if (user) {
        await database.updateUserGoogleId(user.id, googleId);
      } else {
        const userId = await database.createUserOAuth(email, name || email.split('@')[0], googleId);
        user = await database.getUserById(userId);
      }
    }

    if (user.is_banned) { res.status(403).json({ error: 'Аккаунт заблокирован' }); return; }

    const token = generateToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);
    const isPremium = await database.checkSubscription(user.id);
    res.json({ user: formatUser(user, isPremium) });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Ошибка Google авторизации' });
  }
});

// Telegram OAuth (Login Widget)
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(503).json({ error: 'Telegram OAuth не настроен — см. Docs/telegram-oauth-setup.md' });
      return;
    }

    const { hash, ...data } = req.body;
    if (!hash) { res.status(400).json({ error: 'Данные Telegram не переданы' }); return; }

    // Verify hash
    const checkString = Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('\n');
    const secretKey = createHash('sha256').update(botToken).digest();
    const expectedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');

    if (expectedHash !== hash) { res.status(401).json({ error: 'Неверная подпись Telegram' }); return; }
    if (Date.now() / 1000 - data.auth_date > 86400) { res.status(401).json({ error: 'Токен устарел' }); return; }

    const telegramId = parseInt(data.id);
    let user = await database.getUserByTelegramId(telegramId);
    if (!user) {
      const email = `tg_${telegramId}@morgan.local`;
      const username = data.first_name || `user_${telegramId}`;
      const userId = await database.createUserOAuth(email, username, undefined, telegramId);
      user = await database.getUserById(userId);
    }

    if (user.is_banned) { res.status(403).json({ error: 'Аккаунт заблокирован' }); return; }

    const token = generateToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);
    const isPremium = await database.checkSubscription(user.id);
    res.json({ user: formatUser(user, isPremium) });
  } catch (error) {
    console.error('Telegram OAuth error:', error);
    res.status(500).json({ error: 'Ошибка Telegram авторизации' });
  }
});

// GET /api/auth/characters/public — публичные пользовательские персонажи (без auth)
router.get('/characters/public', async (_req, res: Response) => {
  try {
    const chars = await database.getPublicUserCharacters();
    res.json({ characters: chars.map((c: any) => ({
      id: c.id, name: c.name, description: c.description, avatar_url: c.avatar_url,
      greeting_message: c.greeting_message, is_public: true, author_name: c.author_name,
    })) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
