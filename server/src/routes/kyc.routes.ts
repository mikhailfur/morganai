import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { database } from '../database';

const DIDIT_API_BASE = 'https://verification.didit.me/v3';

// Защищённый роутер — требует authMiddleware (регистрируется через /api/kyc)
export const kycProtectedRouter = Router();

// POST /api/kyc/session — создать сессию верификации
kycProtectedRouter.post('/session', async (req: any, res: Response) => {
  try {
    if (!config.diditApiKey) {
      res.status(503).json({ error: 'KYC не настроен: DIDIT_API_KEY не задан' });
      return;
    }
    if (!config.diditWorkflowId) {
      res.status(503).json({ error: 'KYC не настроен: DIDIT_WORKFLOW_ID не задан' });
      return;
    }

    const userId = req.user.userId;
    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    if (user.kyc_verified) {
      res.json({ already_verified: true });
      return;
    }

    const origin = config.clientUrl || `${req.protocol}://${req.get('host')}`;

    const sessionResp = await fetch(`${DIDIT_API_BASE}/session/`, {
      method: 'POST',
      headers: {
        'x-api-key': config.diditApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: config.diditWorkflowId,
        vendor_data: String(userId),
        callback: `${origin}/settings?kyc=done`,
      }),
    });

    if (!sessionResp.ok) {
      const errText = await sessionResp.text();
      console.error('Didit session error:', sessionResp.status, errText);
      res.status(502).json({ error: `Ошибка Didit (${sessionResp.status}): ${errText}` });
      return;
    }

    const session = await sessionResp.json() as Record<string, any>;
    const sessionUrl: string = session.url;
    const sessionId: string = session.session_id;

    if (!sessionUrl) {
      console.error('Didit: no url in response:', session);
      res.status(502).json({ error: 'Didit не вернул ссылку на верификацию' });
      return;
    }

    res.status(201).json({ session_url: sessionUrl, session_id: sessionId });
  } catch (error: any) {
    console.error('KYC session error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Внутренняя ошибка KYC' });
  }
});

// Публичный роутер — без authMiddleware (регистрируется через /api/kyc-webhook)
export const kycWebhookRouter = Router();

// POST /api/kyc-webhook — принимает уведомления от Didit
kycWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Верификация подписи через X-Signature-Simple (рекомендуется Didit для Express)
    // Подпись: HMAC-SHA256("{timestamp}:{session_id}:{status}:{webhook_type}")
    if (config.diditWebhookSecret) {
      const timestamp = req.headers['x-timestamp'] as string || '';
      const sigSimple = req.headers['x-signature-simple'] as string || '';

      const { session_id, status, webhook_type } = req.body;
      const signedData = `${timestamp}:${session_id}:${status}:${webhook_type}`;
      const expected = crypto
        .createHmac('sha256', config.diditWebhookSecret)
        .update(signedData)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(sigSimple), Buffer.from(expected))) {
        console.warn('KYC webhook: invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { status, vendor_data } = req.body;

    // vendor_data = userId, переданный при создании сессии
    const userId = parseInt(vendor_data, 10);
    if (!userId || isNaN(userId)) {
      res.status(400).json({ error: 'Invalid vendor_data' });
      return;
    }

    if (status === 'Approved') {
      await database.setUserKycVerified(userId);
      console.log(`KYC verified for user ${userId}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('KYC webhook error:', error?.message || error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});
