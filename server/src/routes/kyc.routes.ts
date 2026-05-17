import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { database } from '../database';

// Получить access token Didit (client_credentials flow)
async function getDigitAccessToken(): Promise<string> {
  const resp = await fetch('https://apx.didit.me/auth/v2/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.diditClientId,
      client_secret: config.diditClientSecret,
    }).toString(),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Didit auth failed (${resp.status}): ${errBody}`);
  }
  const data = await resp.json() as { access_token: string };
  if (!data.access_token) throw new Error('Didit auth: no access_token in response');
  return data.access_token;
}

// Защищённый роутер — требует authMiddleware (регистрируется через /api/kyc)
export const kycProtectedRouter = Router();

// POST /api/kyc/session — создать сессию верификации
kycProtectedRouter.post('/session', async (req: any, res: Response) => {
  try {
    if (!config.diditClientId || !config.diditWorkflowId) {
      res.status(503).json({ error: 'KYC сервис не настроен (DIDIT_CLIENT_ID / DIDIT_WORKFLOW_ID не заданы)' });
      return;
    }
    if (!config.diditClientSecret) {
      res.status(503).json({ error: 'KYC сервис не настроен (DIDIT_CLIENT_SECRET не задан)' });
      return;
    }

    const userId = req.user.userId;
    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Не найден' }); return; }

    if (user.kyc_verified) {
      res.json({ already_verified: true });
      return;
    }

    const accessToken = await getDigitAccessToken();

    // Строим callback из реального хоста запроса как фолбэк
    const origin = config.clientUrl || `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${origin}/settings?kyc=done`;

    const sessionBody = {
      workflow_id: config.diditWorkflowId,
      vendor_data: String(userId),
      callback: callbackUrl,
    };

    const sessionResp = await fetch('https://apx.didit.me/v1/session/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionBody),
    });

    if (!sessionResp.ok) {
      const errText = await sessionResp.text();
      console.error('Didit session error:', sessionResp.status, errText);
      res.status(502).json({ error: `Ошибка Didit (${sessionResp.status}): ${errText}` });
      return;
    }

    const session = await sessionResp.json() as Record<string, any>;
    // Didit может возвращать url или session_url в зависимости от версии API
    const sessionUrl = session.url || session.session_url;
    const sessionId = session.session_id || session.id;

    if (!sessionUrl) {
      console.error('Didit session response missing url:', session);
      res.status(502).json({ error: 'Didit не вернул ссылку на верификацию' });
      return;
    }

    res.json({ session_url: sessionUrl, session_id: sessionId });
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
    // Верификация подписи webhook (если секрет задан)
    if (config.diditWebhookSecret) {
      const signature = req.headers['x-signature'] as string || '';
      const payload = JSON.stringify(req.body);
      const expected = crypto
        .createHmac('sha256', config.diditWebhookSecret)
        .update(payload)
        .digest('hex');
      if (signature !== expected) {
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

    // Didit отправляет status 'Approved' при успешной верификации
    if (status === 'Approved' || status === 'APPROVED') {
      await database.setUserKycVerified(userId);
      console.log(`KYC verified for user ${userId}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('KYC webhook error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});
