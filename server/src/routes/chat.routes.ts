import { Router, Response } from 'express';
import { database } from '../database';
import { openrouterClient } from '../openrouter';
import { memoryManager } from '../memory';
import { getBehaviorPrompt } from '../prompt';
import { minimaxTTS } from '../voice';

const router = Router();

// Send message
router.post('/send', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Сообщение не может быть пустым' });
      return;
    }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await database.getCharacterBySlug(slug);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    // Check premium for premium characters
    const isPremium = await database.checkSubscription(userId);
    if (character.is_premium && !isPremium) {
      res.status(403).json({ error: 'Этот персонаж доступен только Premium пользователям' });
      return;
    }

    // Get chat history
    const history = await database.getChatHistory(userId, slug, 20);
    const voiceCount = await database.getVoiceMessageCount(userId);
    
    // Build system prompt
    const behaviorExtra = getBehaviorPrompt(user.behavior_mode || 'default', voiceCount);
    const systemPrompt = character.system_prompt + behaviorExtra;
    
    // Build messages
    const chatMessages = memoryManager.buildMessages(history, message.trim());

    // Save user message
    await database.saveMessage(userId, slug, 'user', message.trim());
    await database.updateUserActivity(userId);

    // Generate AI response
    const aiResponse = await openrouterClient.generateResponse(systemPrompt, chatMessages);

    // Check NSFW block
    if (aiResponse.includes('[NSFW_BLOCKED]')) {
      const blockMsg = user.behavior_mode === 'nsfw'
        ? 'Контент нарушает условия использования.'
        : isPremium
          ? 'Обнаружен NSFW контент. Включите режим NSFW в настройках.'
          : 'Обнаружен NSFW контент. Доступно только для Premium.';
      await database.saveMessage(userId, slug, 'assistant', blockMsg);
      res.json({ response: blockMsg, blocked: true });
      return;
    }

    // Parse voice tags
    const voiceMatch = aiResponse.match(/\[VOICE:\s*(.*?)\]/s);
    let voiceUrl: string | undefined;
    let textResponse = aiResponse;

    if (voiceMatch && isPremium) {
      const voiceText = voiceMatch[1].replace(/<#[\d.]+#>/g, ' ').trim();
      textResponse = aiResponse.replace(/\[VOICE:\s*.*?\]/s, '').trim();
      
      const audioBuffer = await minimaxTTS.generateSpeech(voiceText);
      if (audioBuffer) {
        // Store as base64 data URL for simplicity
        voiceUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
        await database.trackVoiceMessage(userId);
      }
    }

    // Save AI response
    await database.saveMessage(userId, slug, 'assistant', textResponse, !!voiceUrl);

    res.json({
      response: textResponse,
      voiceUrl,
      characterName: character.name,
    });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ error: 'Ошибка при генерации ответа' });
  }
});

// Stream message
router.post('/stream', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug } = req.body;
    if (!message || !message.trim()) { res.status(400).json({ error: 'Пустое сообщение' }); return; }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await database.getCharacterBySlug(slug);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    const isPremium = await database.checkSubscription(userId);
    const history = await database.getChatHistory(userId, slug, 20);
    const voiceCount = await database.getVoiceMessageCount(userId);
    const behaviorExtra = getBehaviorPrompt(user.behavior_mode || 'default', voiceCount);
    const systemPrompt = character.system_prompt + behaviorExtra;
    const chatMessages = memoryManager.buildMessages(history, message.trim());

    await database.saveMessage(userId, slug, 'user', message.trim());
    await database.updateUserActivity(userId);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const fullText = await openrouterClient.generateStreamResponse(
      systemPrompt,
      chatMessages,
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );

    // Save full response
    const cleanText = fullText.replace(/\[VOICE:\s*.*?\]/s, '').trim();
    await database.saveMessage(userId, slug, 'assistant', cleanText || fullText);

    // Handle voice if present
    const voiceMatch = fullText.match(/\[VOICE:\s*(.*?)\]/s);
    if (voiceMatch && isPremium) {
      const voiceText = voiceMatch[1].replace(/<#[\d.]+#>/g, ' ').trim();
      const audioBuffer = await minimaxTTS.generateSpeech(voiceText);
      if (audioBuffer) {
        const voiceUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
        res.write(`data: ${JSON.stringify({ voice: voiceUrl })}\n\n`);
        await database.trackVoiceMessage(userId);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Ошибка генерации' })}\n\n`);
    res.end();
  }
});

// Get chat history
router.get('/history', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const slug = (req.query.character as string) || 'morgan';
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await database.getChatHistory(userId, slug, limit);
    res.json({ messages: history });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// Clear chat history
router.delete('/clear', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const slug = (req.query.character as string) || 'morgan';
    await database.clearChatHistory(userId, slug);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
