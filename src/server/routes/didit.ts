import { Router } from 'express';
import type { Context } from 'telegraf';
import type { KycService, DiditWebhookPayload } from '../../services/kyc.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type pino from 'pino';

interface TelegramSender {
  telegram: { sendMessage(chatId: number, text: string, extra?: object): Promise<unknown> };
}

export function createDiditRouter(
  kycService: KycService,
  nsfwService: NsfwService,
  bot: TelegramSender,
  logger: pino.Logger,
) {
  const router = Router();

  router.post('/webhooks/didit', async (req, res) => {
    // 1. Verify signature using raw body captured before JSON parsing
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    const isValid = kycService.verifySignature(rawBody, req.body, req.headers as Record<string, string | undefined>);

    if (!isValid) {
      logger.warn('Didit webhook: invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const payload = req.body as DiditWebhookPayload;

    // 2. Validate timestamp (±5 minutes)
    if (!kycService.validateTimestamp(payload)) {
      logger.warn({ timestamp: payload.timestamp }, 'Didit webhook: stale timestamp');
      res.status(400).json({ error: 'Stale request' });
      return;
    }

    // 3. Respond 200 immediately — Didit requires fast response
    res.json({ ok: true });

    // 4. Process asynchronously
    setImmediate(async () => {
      try {
        const result = await kycService.processWebhook(payload);

        logger.info(
          { sessionId: payload.session_id, userId: result.userId, approved: result.approved, nationality: result.nationality },
          'Didit webhook processed',
        );

        if (!result.userId) return;

        // 5. Notify user in Telegram
        if (result.approved && !result.regionBlocked) {
          await bot.telegram.sendMessage(
            result.userId,
            '✅ *Верификация пройдена!*\n\nТеперь у вас есть доступ к 18+ контенту.',
            { parse_mode: 'Markdown' },
          );
        } else if (result.regionBlocked) {
          await bot.telegram.sendMessage(
            result.userId,
            '🚫 Верификация пройдена, однако доступ к 18+ контенту недоступен в вашем регионе.',
          );
        } else if (!result.approved) {
          await bot.telegram.sendMessage(
            result.userId,
            `❌ *Верификация не пройдена*\n\nСтатус: ${payload.status}.\n\nПопробуйте снова через меню «⚙️ Настройки».`,
            { parse_mode: 'Markdown' },
          );
        }
      } catch (err) {
        logger.error({ err, sessionId: payload.session_id }, 'Error processing Didit webhook');
      }
    });
  });

  return router;
}
