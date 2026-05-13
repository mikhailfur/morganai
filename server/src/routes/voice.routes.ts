import { Router, Response } from 'express';
import multer from 'multer';
import { minimaxTTS } from '../voice';
import { database } from '../database';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

// Generate TTS from text
router.post('/generate', async (req: any, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) { res.status(400).json({ error: 'Текст обязателен' }); return; }
    const isPremium = await database.checkSubscription(req.user.userId);
    if (!isPremium) { res.status(403).json({ error: 'Голосовые сообщения доступны только Premium' }); return; }

    const audioBuffer = await minimaxTTS.generateSpeech(text);
    if (!audioBuffer) { res.status(500).json({ error: 'Не удалось сгенерировать аудио' }); return; }

    await database.trackVoiceMessage(req.user.userId);
    res.set({ 'Content-Type': 'audio/mp3', 'Content-Length': audioBuffer.length.toString() });
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка генерации голоса' });
  }
});

// Upload voice message (speech-to-text placeholder)
router.post('/upload', upload.single('audio'), async (req: any, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Аудио не загружено' }); return; }
    // For now, return a placeholder — real STT would require Whisper API
    res.json({ transcription: '[Голосовое сообщение получено]' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка обработки аудио' });
  }
});

export default router;
