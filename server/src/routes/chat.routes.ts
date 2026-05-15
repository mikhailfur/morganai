import { Router, Response } from 'express';
import { database } from '../database';
import { openrouterClient } from '../openrouter';
import { memoryManager } from '../memory';
import { getBehaviorPrompt, injectPromptVariables } from '../prompt';
import { minimaxTTS } from '../voice';

const router = Router();

const buildContext = async (userId: number, slug: string, clientTimezone?: string) => {
  const user = await database.getUserById(userId);
  if (!user) return null;

  const character = await database.getCharacterBySlug(slug || user.selected_character || 'morgan');
  if (!character) return null;

  const isPremium = await database.checkSubscription(userId);
  const planType = database.getUserPlanType(user);
  const planLimits = await database.getPlanLimits();
  const plan = planLimits[planType] || planLimits['free'];

  // Get user's local time
  let userTime: string | undefined;
  if (clientTimezone) {
    try {
      userTime = new Date().toLocaleTimeString('ru-RU', { timeZone: clientTimezone, hour: '2-digit', minute: '2-digit' });
    } catch { /* ignore invalid timezone */ }
  }

  const rawPrompt = character.system_prompt;
  const systemPromptWithVars = injectPromptVariables(rawPrompt, {
    userName: user.username,
    userTime,
  });

  const history = await database.getChatHistory(userId, character.slug, plan.context_messages);
  const voiceCount = await database.getVoiceMessageCount(userId, plan.voice_window_hours);
  const behaviorExtra = getBehaviorPrompt(user.behavior_mode || 'default', voiceCount);
  const systemPrompt = systemPromptWithVars + behaviorExtra;
  const chatMessages = memoryManager.buildMessages(history, '', plan.context_messages, plan.context_chars);

  return { user, character, isPremium, planType, plan, systemPrompt, history, voiceCount, chatMessages };
};

// Send message (non-streaming)
router.post('/send', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug, clientTimezone } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'Сообщение не может быть пустым' }); return; }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await database.getCharacterBySlug(slug);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    const isPremium = await database.checkSubscription(userId);
    if (character.is_premium && !isPremium) {
      res.status(403).json({ error: 'Этот персонаж доступен только Premium пользователям' });
      return;
    }

    // Check daily message limit
    const planType = database.getUserPlanType(user);
    const limitCheck = await database.checkAndIncrementDailyMessages(userId, planType);
    if (!limitCheck.allowed) {
      res.status(429).json({ error: 'Дневной лимит сообщений исчерпан. Обновится в полночь UTC.', limit_exceeded: true });
      return;
    }

    const planLimits = await database.getPlanLimits();
    const plan = planLimits[planType] || planLimits['free'];

    let userTime: string | undefined;
    if (clientTimezone) {
      try { userTime = new Date().toLocaleTimeString('ru-RU', { timeZone: clientTimezone, hour: '2-digit', minute: '2-digit' }); } catch {}
    }

    const systemPrompt = injectPromptVariables(character.system_prompt, { userName: user.username, userTime })
      + getBehaviorPrompt(user.behavior_mode || 'default', await database.getVoiceMessageCount(userId));

    const history = await database.getChatHistory(userId, slug, plan.context_messages);
    const chatMessages = memoryManager.buildMessages(history, message.trim(), plan.context_messages, plan.context_chars);

    await database.saveMessage(userId, slug, 'user', message.trim());
    await database.updateUserActivity(userId);

    const aiResponse = await openrouterClient.generateResponse(systemPrompt, chatMessages);

    if (aiResponse.includes('[NSFW_BLOCKED]')) {
      const blockMsg = 'Обнаружен NSFW контент. Включите режим NSFW в настройках (доступен с Premium или после подтверждения возраста 18+).';
      await database.saveMessage(userId, slug, 'assistant', blockMsg);
      res.json({ response: blockMsg, blocked: true });
      return;
    }

    const voiceMatch = aiResponse.match(/\[VOICE:\s*(.*?)\]/s);
    let voiceUrl: string | undefined;
    let textResponse = aiResponse;

    if (voiceMatch && isPremium) {
      const voiceText = voiceMatch[1].replace(/<#[\d.]+#>/g, ' ').trim();
      textResponse = aiResponse.replace(/\[VOICE:\s*.*?\]/s, '').trim();
      const audioBuffer = await minimaxTTS.generateSpeech(voiceText);
      if (audioBuffer) {
        voiceUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;
        await database.trackVoiceMessage(userId);
      }
    }

    await database.saveMessage(userId, slug, 'assistant', textResponse, !!voiceUrl);
    res.json({ response: textResponse, voiceUrl, characterName: character.name, remaining: limitCheck.remaining });
  } catch (error) {
    console.error('Chat send error:', error);
    res.status(500).json({ error: 'Ошибка при генерации ответа' });
  }
});

// Stream message
router.post('/stream', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug, clientTimezone } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'Пустое сообщение' }); return; }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await database.getCharacterBySlug(slug);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    const isPremium = await database.checkSubscription(userId);
    const planType = database.getUserPlanType(user);

    // Check daily limit before streaming
    const limitCheck = await database.checkAndIncrementDailyMessages(userId, planType);
    if (!limitCheck.allowed) {
      res.status(429).json({ error: 'Дневной лимит сообщений исчерпан. Обновится в полночь UTC.', limit_exceeded: true });
      return;
    }

    const planLimits = await database.getPlanLimits();
    const plan = planLimits[planType] || planLimits['free'];

    let userTime: string | undefined;
    if (clientTimezone) {
      try { userTime = new Date().toLocaleTimeString('ru-RU', { timeZone: clientTimezone, hour: '2-digit', minute: '2-digit' }); } catch {}
    }

    const systemPrompt = injectPromptVariables(character.system_prompt, { userName: user.username, userTime })
      + getBehaviorPrompt(user.behavior_mode || 'default', await database.getVoiceMessageCount(userId, plan.voice_window_hours));

    const history = await database.getChatHistory(userId, slug, plan.context_messages);
    const chatMessages = memoryManager.buildMessages(history, message.trim(), plan.context_messages, plan.context_chars);

    await database.saveMessage(userId, slug, 'user', message.trim());
    await database.updateUserActivity(userId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const fullText = await openrouterClient.generateStreamResponse(
      systemPrompt,
      chatMessages,
      (chunk: string) => { res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`); }
    );

    const cleanText = fullText.replace(/\[VOICE:\s*.*?\]/s, '').trim();
    await database.saveMessage(userId, slug, 'assistant', cleanText || fullText);

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
