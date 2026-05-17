import { Router, Response } from 'express';
import { database } from '../database';

const router = Router();

// GET /api/campaigns — list active campaigns with user progress
router.get('/', async (req: any, res: Response) => {
  try {
    const { character } = req.query;
    const campaigns = await database.getCampaigns(req.user.userId, character as string | undefined);
    res.json({ campaigns });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /api/campaigns/:id — campaign detail + scenes (Premium only)
router.get('/:id', async (req: any, res: Response) => {
  try {
    const user = await database.getUserById(req.user.userId);
    const isPremium = await database.checkSubscription(req.user.userId);
    if (!isPremium && !user?.is_admin) {
      res.status(403).json({ error: 'Кампании доступны только для Premium' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const campaign = await database.getCampaignById(id);
    if (!campaign || !campaign.is_active) { res.status(404).json({ error: 'Кампания не найдена' }); return; }

    const progress = await database.getUserCampaignProgress(req.user.userId, id);
    res.json({ campaign, progress });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /api/campaigns/:id/progress — user progress
router.get('/:id/progress', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const progress = await database.getUserCampaignProgress(req.user.userId, id);
    res.json({ progress });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /api/campaigns/:id/progress — start campaign
router.post('/:id/progress', async (req: any, res: Response) => {
  try {
    const isPremium = await database.checkSubscription(req.user.userId);
    if (!isPremium) {
      res.status(403).json({ error: 'Кампании доступны только для Premium' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const campaign = await database.getCampaignById(id);
    if (!campaign || !campaign.is_active) { res.status(404).json({ error: 'Кампания не найдена' }); return; }
    if (!campaign.scenes?.length) { res.status(400).json({ error: 'У кампании нет сцен' }); return; }

    const firstScene = campaign.scenes[0];
    await database.startCampaign(req.user.userId, id, firstScene.id);
    res.json({ current_scene: firstScene });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// PATCH /api/campaigns/:id/progress — advance scene
router.patch('/:id/progress', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { current_scene_id, is_completed } = req.body;
    if (!current_scene_id) { res.status(400).json({ error: 'current_scene_id обязателен' }); return; }

    const progress = await database.getUserCampaignProgress(req.user.userId, id);
    if (!progress) { res.status(404).json({ error: 'Прогресс не найден. Сначала начните кампанию.' }); return; }

    await database.updateCampaignProgress(req.user.userId, id, current_scene_id, Boolean(is_completed));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
