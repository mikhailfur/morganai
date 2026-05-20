import crypto from 'crypto';
import { env } from '../config/index.js';
import type { UserRepository } from '../database/repositories/user.repository.js';

// ---------------------------------------------------------------------------
// Didit API types
// ---------------------------------------------------------------------------

interface DiditSessionCreateResponse {
  session_id: string;
  verification_url: string;
  status: string;
}

interface DiditIdVerification {
  nationality?: string;
  issuing_state?: string;
  issuing_state_name?: string;
  document_type?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
}

interface DiditSessionFull {
  session_id: string;
  status: string;
  decision?: {
    id_verifications?: DiditIdVerification[];
    liveness_checks?: Array<{ status: string }>;
    face_matches?: Array<{ status: string }>;
  };
}

// Webhook envelope (V3 format)
export interface DiditWebhookPayload {
  event_id: string;
  webhook_type: string;
  timestamp: number;
  application_id: string;
  session_id: string;
  workflow_id?: string;
  status: string;
  vendor_data?: string;
  decision?: DiditSessionFull['decision'];
}

export interface WebhookProcessResult {
  userId: number | null;
  approved: boolean;
  nationality?: string;
  regionBlocked: boolean;
}

const BLOCKED_REGIONS = ['KOR'];
const DIDIT_API_BASE = 'https://verification.didit.me';

// ---------------------------------------------------------------------------
// Canonical JSON for X-Signature-V2 verification
// ---------------------------------------------------------------------------

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const sorted = Object.keys(value as object).sort();
  const pairs = sorted.map((k) => JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k]));
  return '{' + pairs.join(',') + '}';
}

// ---------------------------------------------------------------------------
// KycService
// ---------------------------------------------------------------------------

export class KycService {
  constructor(private userRepo: UserRepository) {}

  // ── Session creation ────────────────────────────────────────────────────

  async createSession(userId: number): Promise<{ sessionId: string; verificationUrl: string }> {
    const response = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
      method: 'POST',
      headers: {
        'x-api-key': env.DIDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: env.DIDIT_WORKFLOW_ID,
        vendor_data: String(userId),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Didit session creation failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as DiditSessionCreateResponse;

    await this.userRepo.updateKyc(userId, {
      kycVerified: false,
      kycSessionId: data.session_id,
    });

    return {
      sessionId: data.session_id,
      verificationUrl: data.verification_url,
    };
  }

  // ── Session retrieval (for nationality after approval) ──────────────────

  async retrieveSession(sessionId: string): Promise<DiditSessionFull | null> {
    try {
      const response = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/`, {
        headers: { 'x-api-key': env.DIDIT_API_KEY },
      });
      if (!response.ok) return null;
      return (await response.json()) as DiditSessionFull;
    } catch {
      return null;
    }
  }

  // ── Signature verification ──────────────────────────────────────────────

  verifySignature(
    rawBody: Buffer,
    parsedBody: unknown,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const secret = env.DIDIT_WEBHOOK_SECRET;
    if (!secret) return true; // not configured → skip in dev

    const sigV2 = (headers['x-signature-v2'] as string | undefined)?.toLowerCase();
    const sigRaw = (headers['x-signature'] as string | undefined)?.toLowerCase();

    if (sigV2) {
      const canonical = canonicalJson(parsedBody);
      const expected = crypto
        .createHmac('sha256', secret)
        .update(canonical, 'utf8')
        .digest('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigV2));
      } catch {
        return false;
      }
    }

    if (sigRaw) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigRaw));
      } catch {
        return false;
      }
    }

    // No signature header — reject if secret is configured
    return false;
  }

  validateTimestamp(payload: DiditWebhookPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return Math.abs(now - payload.timestamp) <= 300; // 5 minutes
  }

  // ── Webhook processing ──────────────────────────────────────────────────

  async processWebhook(payload: DiditWebhookPayload): Promise<WebhookProcessResult> {
    // Only handle session status updates
    if (!payload.session_id) return { userId: null, approved: false, regionBlocked: false };
    if (payload.webhook_type && !payload.webhook_type.includes('status')) {
      return { userId: null, approved: false, regionBlocked: false };
    }

    const isApproved = payload.status === 'Approved';

    // Resolve user: first by kyc_session_id, fallback to vendor_data (userId stored there)
    let user = await this.userRepo
      .findAll()
      .then((users) => users.find((u) => u.kycSessionId === payload.session_id));

    if (!user && payload.vendor_data) {
      const fallbackId = parseInt(payload.vendor_data, 10);
      if (!isNaN(fallbackId)) user = await this.userRepo.findById(fallbackId);
    }

    if (!user) return { userId: null, approved: false, regionBlocked: false };

    // Extract nationality: try webhook decision first, then retrieve full session
    let nationality: string | undefined;

    const idVerifs = payload.decision?.id_verifications;
    if (idVerifs?.[0]) {
      nationality = idVerifs[0].nationality ?? idVerifs[0].issuing_state;
    }

    if (isApproved && !nationality) {
      const full = await this.retrieveSession(payload.session_id);
      const idV = full?.decision?.id_verifications?.[0];
      if (idV) nationality = idV.nationality ?? idV.issuing_state;
    }

    await this.userRepo.updateKyc(user.id, {
      kycVerified: isApproved,
      kycNationality: nationality,
      kycSessionId: payload.session_id,
    });

    const regionBlocked = isApproved && !!nationality && BLOCKED_REGIONS.includes(nationality);

    return { userId: user.id, approved: isApproved, nationality, regionBlocked };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  isConfigured(): boolean {
    return !!(env.DIDIT_API_KEY && env.DIDIT_WORKFLOW_ID);
  }
}
