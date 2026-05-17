import { Router, Response } from 'express';
import { database } from '../database';
import { config } from '../config';

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

// Grant/revoke subscription
router.put('/user/:id/subscription', async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { type, months } = req.body; // type: 'free'|'premium'|'premium_plus', months: number|null (null = forever)
    const validTypes = ['free', 'premium', 'premium_plus'];
    if (!validTypes.includes(type)) { res.status(400).json({ error: 'Неверный тип подписки' }); return; }

    let expiresAt: number | null = null;
    if (type !== 'free' && months) {
      expiresAt = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
    }

    await database.setUserSubscription(userId, type, expiresAt);
    await database.logAdminEvent(req.user.userId, 'subscription_change', userId, { type, months: months || 'forever' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Legacy premium toggle (backward compat)
router.put('/user/:id/premium', async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_premium, months } = req.body;
    if (is_premium && months) {
      const expiresAt = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
      await database.setUserSubscription(userId, 'premium', expiresAt);
    } else {
      await database.setUserSubscription(userId, is_premium ? 'premium' : 'free');
    }
    await database.logAdminEvent(req.user.userId, 'premium_toggle', userId, { is_premium, months });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Ban/unban user
router.put('/user/:id/ban', async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { is_banned } = req.body;
    await database.setUserBanned(userId, Boolean(is_banned));
    await database.logAdminEvent(req.user.userId, is_banned ? 'user_banned' : 'user_unbanned', userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Get plan limits
router.get('/plan-limits', async (_req: any, res: Response) => {
  try {
    const limits = await database.getPlanLimits();
    res.json({ limits });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Update plan limits
router.put('/plan-limits', async (req: any, res: Response) => {
  try {
    const { plan_type, ...limits } = req.body;
    const validTypes = ['free', 'premium', 'premium_plus'];
    if (!validTypes.includes(plan_type)) { res.status(400).json({ error: 'Неверный тип тарифа' }); return; }
    await database.updatePlanLimits(plan_type, limits);
    await database.logAdminEvent(req.user.userId, 'plan_limits_update', undefined, { plan_type, ...limits });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Event log
router.get('/events', async (req: any, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = await database.getAdminEvents(limit);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Finance — OpenRouter balance + platform stats
router.get('/finance', async (_req: any, res: Response) => {
  try {
    const [orResp, stats] = await Promise.all([
      fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${config.openrouterApiKey}` },
      }),
      database.getUsersStats(),
    ]);

    let openrouter: Record<string, any> | null = null;
    if (orResp.ok) {
      const orData = await orResp.json() as { data: Record<string, any> };
      openrouter = orData.data;
    } else {
      const errText = await orResp.text();
      openrouter = { error: `OpenRouter ${orResp.status}: ${errText}` };
    }

    res.json({
      openrouter,
      model: config.openrouterModel,
      platform: stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Ошибка' });
  }
});

export default router;
