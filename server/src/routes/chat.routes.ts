import { Router, Response } from 'express';
import { database } from '../database';
import { openrouterClient } from '../openrouter';
import { memoryManager } from '../memory';
import { getBehaviorPrompt, getModulePrompt, injectPromptVariables } from '../prompt';
import { minimaxTTS } from '../voice';
import { characters as canonicalChars } from '../characters/index';
import type { GeoBlockRequest } from '../middleware/geoblock';

const router = Router();

async function resolveCharacter(slug: string, userId: number): Promise<any | null> {
  if (slug.startsWith('uc:')) {
    const id = parseInt(slug.slice(3), 10);
    if (!id) return null;
    const uc = await database.getUserCharacterById(id);
    if (!uc) return null;
    // Owner can use any status; public must be approved
    if (uc.user_id !== userId) {
      if (!uc.is_public || uc.moderation_status !== 'approved') return null;
    }
    return { ...uc, slug, is_premium: false };
  }
  return database.getCharacterBySlug(slug);
}

async function buildBehaviorExtra(
  user: any,
  slug: string,
  voiceCount: number,
  isPremium: boolean,
): Promise<string> {
  const tsChar = canonicalChars.find(c => c.slug === slug);
  const nsfwEnabled = user.behavior_mode === 'nsfw';
  const canNsfw = isPremium || Boolean(user.kyc_verified);

  if (tsChar?.modules) {
    const activeModuleId = await database.getUserCharacterModule(user.id, slug);
    return getModulePrompt(tsChar.modules, activeModuleId, voiceCount, canNsfw, nsfwEnabled);
  }
  // User character or canonical without modules — only NSFW filter
  const effectiveMode = (nsfwEnabled && canNsfw) ? 'nsfw' : 'default';
  return getBehaviorPrompt(effectiveMode, voiceCount);
}

// Stream message
router.post('/stream', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug, clientTimezone, campaignSceneId } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'Пустое сообщение' }); return; }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }

    const nsfwEnabled = user.behavior_mode === 'nsfw';
    if (nsfwEnabled && (req as GeoBlockRequest).nsfwGeoBlocked) {
      res.status(403).json({ error: 'NSFW недоступен в вашем регионе', geo_blocked: true });
      return;
    }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await resolveCharacter(slug, userId);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    const isPremium = await database.checkSubscription(userId);
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

    const voiceCount = await database.getVoiceMessageCount(userId, plan.voice_window_hours);
    const behaviorExtra = await buildBehaviorExtra(user, slug, voiceCount, isPremium);

    // Campaign scene context injection
    let campaignExtra = '';
    if (campaignSceneId && isPremium) {
      const scene = await database.getCampaignSceneById(parseInt(campaignSceneId, 10));
      if (scene && scene.character_slug === (slug.startsWith('uc:') ? null : slug)) {
        const parts = [];
        if (scene.campaign_title) parts.push(`## Кампания: ${scene.campaign_title}`);
        if (scene.location) parts.push(`## Локация: ${scene.location}`);
        if (scene.situation) parts.push(`## Ситуация: ${scene.situation}`);
        if (scene.context_prompt) parts.push(scene.context_prompt);
        campaignExtra = '\n\n' + parts.join('\n');
      }
    }

    const systemPrompt = injectPromptVariables(character.system_prompt, { userName: user.username, userTime })
      + behaviorExtra + campaignExtra;

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

    // NSFW blocked — signal client to remove message and show popup
    if (fullText.includes('[NSFW_BLOCKED]')) {
      res.write(`data: ${JSON.stringify({ nsfw_blocked: true })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }

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

// Send message (non-streaming)
router.post('/send', async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { message, characterSlug, clientTimezone } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'Сообщение не может быть пустым' }); return; }

    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    const nsfwEnabled = user.behavior_mode === 'nsfw';
    if (nsfwEnabled && (req as GeoBlockRequest).nsfwGeoBlocked) {
      res.status(403).json({ error: 'NSFW недоступен в вашем регионе', geo_blocked: true });
      return;
    }

    const slug = characterSlug || user.selected_character || 'morgan';
    const character = await resolveCharacter(slug, userId);
    if (!character) { res.status(404).json({ error: 'Персонаж не найден' }); return; }

    const isPremium = await database.checkSubscription(userId);
    if (character.is_premium && !isPremium) {
      res.status(403).json({ error: 'Этот персонаж доступен только Premium пользователям' });
      return;
    }

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

    const voiceCount = await database.getVoiceMessageCount(userId);
    const behaviorExtra = await buildBehaviorExtra(user, slug, voiceCount, isPremium);
    const systemPrompt = injectPromptVariables(character.system_prompt, { userName: user.username, userTime }) + behaviorExtra;

    const history = await database.getChatHistory(userId, slug, plan.context_messages);
    const chatMessages = memoryManager.buildMessages(history, message.trim(), plan.context_messages, plan.context_chars);

    await database.saveMessage(userId, slug, 'user', message.trim());
    await database.updateUserActivity(userId);

    const aiResponse = await openrouterClient.generateResponse(systemPrompt, chatMessages);

    if (aiResponse.includes('[NSFW_BLOCKED]')) {
      const blockMsg = 'Обнаружен NSFW контент. Включите NSFW-модуль в настройках персонажа (доступен с Premium или после подтверждения возраста 18+).';
      res.json({ response: blockMsg, nsfw_blocked: true });
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
