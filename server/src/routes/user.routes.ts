import { Router, Response } from 'express';
import { database } from '../database';
import { comparePassword, hashPassword, COOKIE_NAME } from '../auth';
import type { GeoBlockRequest } from '../middleware/geoblock';
import { characters } from '../characters/index';

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
      const validModes = ['default', 'nsfw'];
      if (!validModes.includes(behavior_mode)) { res.status(400).json({ error: 'Неверный режим' }); return; }
      if (behavior_mode === 'nsfw') {
        if ((req as GeoBlockRequest).nsfwGeoBlocked) {
          res.status(403).json({ error: 'NSFW недоступен в вашем регионе', geo_blocked: true });
          return;
        }
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

// Get canonical characters list (with modules, filtered for user's NSFW access)
router.get('/characters', async (req: any, res: Response) => {
  try {
    const dbChars = await database.getCharacters();
    const user = await database.getUserById(req.user.userId);
    const isPremium = await database.checkSubscription(req.user.userId);
    const canNsfw = isPremium || Boolean(user?.kyc_verified);

    res.json({ characters: dbChars.map((c: any) => {
      const tsChar = characters.find(ch => ch.slug === c.slug);
      const modules = tsChar?.modules
        ? (canNsfw ? tsChar.modules : tsChar.modules.filter(m => !m.isNsfw))
        : undefined;
      return {
        slug: c.slug, name: c.name, description: c.description,
        avatar_url: c.avatar_url, is_premium: Boolean(c.is_premium),
        modules,
      };
    })});
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /api/user/character-settings/:slug — get active module for character
router.get('/character-settings/:slug', async (req: any, res: Response) => {
  try {
    const { slug } = req.params;
    const moduleId = await database.getUserCharacterModule(req.user.userId, slug);
    res.json({ active_module_id: moduleId });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /api/user/character-settings/:slug — set active module
router.post('/character-settings/:slug', async (req: any, res: Response) => {
  try {
    const { slug } = req.params;
    const { module_id } = req.body;
    if (!module_id) { res.status(400).json({ error: 'module_id обязателен' }); return; }

    const tsChar = characters.find(ch => ch.slug === slug);
    if (!tsChar?.modules) { res.status(404).json({ error: 'Персонаж или модули не найдены' }); return; }

    const module = tsChar.modules.find(m => m.id === module_id);
    if (!module) { res.status(400).json({ error: 'Модуль не найден' }); return; }

    if (module.isNsfw) {
      if ((req as GeoBlockRequest).nsfwGeoBlocked) {
        res.status(403).json({ error: 'NSFW недоступен в вашем регионе' }); return;
      }
      const user = await database.getUserById(req.user.userId);
      const isPremium = await database.checkSubscription(req.user.userId);
      if (!isPremium && !user?.kyc_verified) {
        res.status(403).json({ error: 'NSFW доступен только с Premium или после подтверждения возраста' }); return;
      }
    }

    await database.setUserCharacterModule(req.user.userId, slug, module_id);
    res.json({ active_module_id: module_id });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// === User characters (пользовательские персонажи) ===

const formatUserChar = (c: any) => ({
  id: c.id, user_id: c.user_id, name: c.name, description: c.description,
  avatar_url: c.avatar_url, system_prompt: c.system_prompt,
  greeting_message: c.greeting_message, is_public: Boolean(c.is_public),
  is_nsfw: Boolean(c.is_nsfw), moderation_status: c.moderation_status,
  rejection_reason: c.rejection_reason || null,
  created_at: c.created_at, author_name: c.author_name,
});

// GET /api/user/characters/my — мои персонажи
router.get('/characters/my', async (req: any, res: Response) => {
  try {
    const chars = await database.getUserCharacters(req.user.userId);
    res.json({ characters: chars.map(formatUserChar) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /api/user/characters — создать персонажа
router.post('/characters', async (req: any, res: Response) => {
  try {
    const { name, description, system_prompt, greeting_message, avatar_url, is_public, is_nsfw } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: 'Имя обязательно' }); return; }
    if (!system_prompt?.trim()) { res.status(400).json({ error: 'Системный промпт обязателен' }); return; }
    const id = await database.createUserCharacter(req.user.userId, {
      name: name.trim(), description, system_prompt: system_prompt.trim(),
      greeting_message, avatar_url, is_public: Boolean(is_public), is_nsfw: Boolean(is_nsfw),
    });
    const char = await database.getUserCharacterById(id, req.user.userId);
    res.status(201).json({ character: formatUserChar(char) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// PUT /api/user/characters/:id — редактировать своего персонажа
router.put('/characters/:id', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const char = await database.getUserCharacterById(id, req.user.userId);
    if (!char) { res.status(404).json({ error: 'Не найден' }); return; }
    const { name, description, system_prompt, greeting_message, avatar_url, is_public } = req.body;
    await database.updateUserCharacter(id, req.user.userId, {
      name, description, system_prompt, greeting_message, avatar_url,
      is_public: is_public !== undefined ? Boolean(is_public) : undefined,
    });
    const updated = await database.getUserCharacterById(id, req.user.userId);
    res.json({ character: formatUserChar(updated) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// PATCH /api/user/characters/:id/publish — переключить публичность
router.patch('/characters/:id/publish', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const char = await database.getUserCharacterById(id, req.user.userId);
    if (!char) { res.status(404).json({ error: 'Не найден' }); return; }
    const newPublic = !Boolean(char.is_public);
    const updates: any = { is_public: newPublic };
    // При публикации — сбросить на pending для прохождения модерации
    if (newPublic) updates.moderation_status = 'pending';
    await database.updateUserCharacter(id, req.user.userId, updates);
    res.json({ is_public: newPublic, moderation_status: newPublic ? 'pending' : char.moderation_status });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// DELETE /api/user/characters/:id — удалить своего персонажа
router.delete('/characters/:id', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const char = await database.getUserCharacterById(id, req.user.userId);
    if (!char) { res.status(404).json({ error: 'Не найден' }); return; }
    await database.deleteUserCharacter(id, req.user.userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
