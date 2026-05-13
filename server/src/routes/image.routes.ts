import { Router, Response } from 'express';
import multer from 'multer';
import { openrouterClient } from '../openrouter';
import { database } from '../database';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.post('/upload', upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Файл не загружен' }); return; }
    const userId = req.user.userId;
    const user = await database.getUserById(userId);
    const isPremium = await database.checkSubscription(userId);
    if (!isPremium) { res.status(403).json({ error: 'Обработка изображений доступна только Premium' }); return; }

    const slug = req.body.characterSlug || user?.selected_character || 'morgan';
    const character = await database.getCharacterBySlug(slug);
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const userMessage = req.body.message || '';

    const systemPrompt = character?.system_prompt || 'Ты AI помощник.';
    const description = await openrouterClient.analyzeImage(systemPrompt, base64, mimeType, userMessage);

    await database.saveMessage(userId, slug, 'user', userMessage || '[Изображение]', false, true);
    await database.saveMessage(userId, slug, 'assistant', description);
    await database.updateUserActivity(userId);

    res.json({ response: description, characterName: character?.name || 'AI' });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Ошибка обработки изображения' });
  }
});

export default router;
