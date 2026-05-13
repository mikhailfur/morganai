import { Router, Request, Response } from 'express';
import { database } from '../database';
import { hashPassword, comparePassword, generateToken } from '../auth';

const router = Router();

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

    res.status(201).json({
      token,
      user: { id: userId, email, username, is_premium: false, is_admin: false, behavior_mode: 'default', selected_character: 'morgan' },
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
    if (!user) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id, email: user.email, username: user.username,
        is_premium: Boolean(user.is_premium), is_admin: Boolean(user.is_admin),
        behavior_mode: user.behavior_mode, selected_character: user.selected_character,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Get current user
router.get('/me', async (req: any, res: Response) => {
  try {
    const user = await database.getUserById(req.user.userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }
    const isPremium = await database.checkSubscription(user.id);
    res.json({
      id: user.id, email: user.email, username: user.username,
      is_premium: isPremium, is_admin: Boolean(user.is_admin),
      behavior_mode: user.behavior_mode, selected_character: user.selected_character,
      avatar_url: user.avatar_url, total_messages: user.total_messages,
      created_at: user.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
