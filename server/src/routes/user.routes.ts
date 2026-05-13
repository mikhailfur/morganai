import { Router, Response } from 'express';
import { database } from '../database';

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
        const isPremium = await database.checkSubscription(userId);
        if (!isPremium) { res.status(403).json({ error: 'NSFW доступен только Premium' }); return; }
      }
      await database.setUserBehaviorMode(userId, behavior_mode);
    }
    if (selected_character) {
      await database.setUserCharacter(userId, selected_character);
    }

    const user = await database.getUserById(userId);
    res.json({
      behavior_mode: user.behavior_mode,
      selected_character: user.selected_character,
    });
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
