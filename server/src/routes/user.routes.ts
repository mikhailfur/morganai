import { Router, Response } from 'express';
import { database } from '../database';
import { comparePassword, hashPassword, COOKIE_NAME } from '../auth';

const router = Router();

// Get user stats
router.get('/stats', async (req: any, res: Response) => {
  try {
    const stats = await database.getUserStats(req.user.userId);
    const user = await database.getUserById(req.user.userId);
    res.json({ ...stats, is_premium: Boolean(user?.is_premium), behavior_mode: user?.behavior_mode });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Update settings
router.put('/settings', async (req: any, res: Response) => {
  try {
    const { behavior_mode, selected_character } = req.body;
    const userId = req.user.userId;

    if (behavior_mode) {
      const validModes = ['default', 'study', 'work', 'psychologist', 'nsfw'];
      if (!validModes.includes(behavior_mode)) { res.status(400).json({ error: 'Неверный режим' }); return; }
      if (behavior_mode === 'nsfw') {
        const user = await database.getUserById(userId);
        const isPremium = await database.checkSubscription(userId);
        if (!isPremium && !user?.kyc_verified) {
          res.status(403).json({ error: 'NSFW доступен только с Premium или после подтверждения возраста' });
          return;
        }
      }
      await database.setUserBehaviorMode(userId, behavior_mode);
    }
    if (selected_character) {
      await database.setUserCharacter(userId, selected_character);
    }

    const user = await database.getUserById(userId);
    res.json({ behavior_mode: user.behavior_mode, selected_character: user.selected_character });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// KYC — подтверждение возраста 18+
router.post('/kyc-verify', async (req: any, res: Response) => {
  try {
    await database.setUserKycVerified(req.user.userId);
    res.json({ success: true, kyc_verified: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Change password
router.post('/change-password', async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Все поля обязательны' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'Новый пароль должен быть не менее 8 символов' });
      return;
    }

    const user = await database.getUserById(req.user.userId);
    if (!user || !user.password_hash) {
      res.status(400).json({ error: 'Смена пароля недоступна для OAuth аккаунтов' });
      return;
    }

    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Текущий пароль неверен' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await database.changeUserPassword(req.user.userId, newHash);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Delete account
router.delete('/account', async (req: any, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Введите пароль для подтверждения' });
      return;
    }

    const user = await database.getUserById(req.user.userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }

    if (user.password_hash) {
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: 'Неверный пароль' });
        return;
      }
    }

    await database.deleteUser(req.user.userId);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Get characters list
router.get('/characters', async (_req: any, res: Response) => {
  try {
    const characters = await database.getCharacters();
    res.json({ characters: characters.map((c: any) => ({
      slug: c.slug, name: c.name, description: c.description,
      avatar_url: c.avatar_url, is_premium: Boolean(c.is_premium),
    }))});
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
