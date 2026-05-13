import { Router, Response } from 'express';
import { database } from '../database';

const router = Router();

router.get('/stats', async (_req: any, res: Response) => {
  try {
    const stats = await database.getUsersStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/users', async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const limit = 20;
    const users = await database.getAllUsers();
    const total = users.length;
    const paginated = users.slice(page * limit, (page + 1) * limit);
    res.json({ users: paginated, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.put('/user/:id/premium', async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_premium, months } = req.body;
    if (is_premium && months) {
      const expiresAt = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);
      await database.setUserPremium(userId, true, expiresAt);
    } else {
      await database.setUserPremium(userId, false);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
