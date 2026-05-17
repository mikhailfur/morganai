import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { database } from '../database';

const DIDIT_API_BASE = 'https://verification.didit.me/v3';

// Страны, для которых NSFW заблокирован на уровне аккаунта (ISO alpha-2 и alpha-3)
const KYC_BLOCKED_COUNTRIES = new Set(['KR', 'KOR']);

// Проверяет решение Didit по session_id, возвращает { approved, geoBlocked, status, nationality }
async function fetchSessionDecision(sessionId: string) {
  const resp = await fetch(`${DIDIT_API_BASE}/session/${sessionId}/decision/`, {
    headers: { 'x-api-key': config.diditApiKey, 'Accept': 'application/json' },
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Didit decision API failed (${resp.status}): ${errText}`);
  }
  const data = await resp.json() as Record<string, any>;
  const nationality: string = data.nationality || '';
  const issuingState: string = data.issuing_state || '';
  const geoBlocked = KYC_BLOCKED_COUNTRIES.has(nationality) || KYC_BLOCKED_COUNTRIES.has(issuingState);
  return { approved: data.status === 'Approved', geoBlocked, status: data.status as string, nationality };
}

// ─── Защищённый роутер (/api/kyc/*) ─────────────────────────────────────────
export const kycProtectedRouter = Router();

// POST /api/kyc/session — создать сессию верификации, вернуть session_url
kycProtectedRouter.post('/session', async (req: any, res: Response) => {
  try {
    if (!config.diditApiKey)     { res.status(503).json({ error: 'KYC не настроен: DIDIT_API_KEY не задан' }); return; }
    if (!config.diditWorkflowId) { res.status(503).json({ error: 'KYC не настроен: DIDIT_WORKFLOW_ID не задан' }); return; }

    const userId = req.user.userId;
    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }
    if (user.kyc_verified) { res.json({ already_verified: true }); return; }

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
        // Didit добавит ?verificationSessionId=...&status=... к этому URL
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
    if (!session.url) {
      console.error('Didit: no url in response:', session);
      res.status(502).json({ error: 'Didit не вернул ссылку на верификацию' });
      return;
    }

    res.status(201).json({ session_url: session.url, session_id: session.session_id });
  } catch (error: any) {
    console.error('KYC session error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Внутренняя ошибка KYC' });
  }
});

// POST /api/kyc/verify-return — вызывается фронтендом при возврате из Didit
// Берёт verificationSessionId из callback URL, проверяет решение через Didit API,
// при одобрении сразу обновляет kyc_verified (без ожидания webhook)
kycProtectedRouter.post('/verify-return', async (req: any, res: Response) => {
  try {
    const { session_id } = req.body;
    if (!session_id) { res.status(400).json({ error: 'session_id обязателен' }); return; }
    if (!config.diditApiKey) { res.status(503).json({ error: 'KYC не настроен' }); return; }

    const userId = req.user.userId;
    const user = await database.getUserById(userId);
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

    // Уже верифицирован
    if (user.kyc_verified) { res.json({ verified: true }); return; }

    const decision = await fetchSessionDecision(session_id);

    // Гео-блокировка по стране документа
    if (decision.geoBlocked) {
      database.logSystemEvent('kyc_geo_blocked', userId, { nationality: decision.nationality, method: 'callback' }).catch(() => {});
      res.status(403).json({
        error: 'KYC верификация недоступна в вашем регионе',
        geo_blocked: true,
        nationality: decision.nationality,
      });
      return;
    }

    if (!decision.approved) {
      res.json({ verified: false, status: decision.status });
      return;
    }

    await database.setUserKycVerified(userId);
    database.logSystemEvent('kyc_verified', userId, { method: 'callback', nationality: decision.nationality }).catch(() => {});
    res.json({ verified: true });
  } catch (error: any) {
    console.error('KYC verify-return error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Ошибка верификации' });
  }
});

// ─── Публичный роутер (/api/kyc-webhook) ─────────────────────────────────────
export const kycWebhookRouter = Router();

// POST /api/kyc-webhook — резервный путь: webhook от Didit когда пользователь не вернулся на сайт
kycWebhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Верификация подписи через X-Signature-Simple
    if (config.diditWebhookSecret) {
      const timestamp  = req.headers['x-timestamp'] as string || '';
      const sigSimple  = req.headers['x-signature-simple'] as string || '';
      const { session_id, status, webhook_type } = req.body;
      const signedData = `${timestamp}:${session_id}:${status}:${webhook_type}`;
      const expected   = crypto.createHmac('sha256', config.diditWebhookSecret).update(signedData).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(sigSimple), Buffer.from(expected))) {
        console.warn('KYC webhook: invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { status, vendor_data, session_id } = req.body;
    if (status !== 'Approved') { res.json({ received: true }); return; }

    const userId = parseInt(vendor_data, 10);
    if (!userId || isNaN(userId)) { res.status(400).json({ error: 'Invalid vendor_data' }); return; }

    // Проверяем страну документа перед выдачей kyc_verified
    if (config.diditApiKey && session_id) {
      try {
        const decision = await fetchSessionDecision(session_id);
        if (decision.geoBlocked) {
          console.log(`KYC webhook: user ${userId} geo-blocked (${decision.nationality}), skipping kyc_verified`);
          database.logSystemEvent('kyc_geo_blocked', userId, { nationality: decision.nationality, method: 'webhook' }).catch(() => {});
          res.json({ received: true });
          return;
        }
      } catch (e: any) {
        console.warn('KYC webhook: could not fetch decision, proceeding anyway:', e?.message);
      }
    }

    await database.setUserKycVerified(userId);
    database.logSystemEvent('kyc_verified', userId, { method: 'webhook' }).catch(() => {});
    console.log(`KYC verified for user ${userId} via webhook`);
    res.json({ received: true });
  } catch (error: any) {
    console.error('KYC webhook error:', error?.message || error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});
