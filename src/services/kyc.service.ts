import { env } from '../config/index.js';
import type { UserRepository } from '../database/repositories/user.repository.js';

interface DiditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface DiditSessionResponse {
  session_id: string;
  verification_url: string;
  status: string;
}

interface DiditSessionResult {
  session_id: string;
  status: string;
  kyc?: {
    document?: {
      nationality?: string;
      issuing_state?: string;
    };
  };
  decision?: {
    kyc?: {
      recommendation: string;
    };
  };
}

export class KycService {
  constructor(private userRepo: UserRepository) {}

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(
      `${env.DIDIT_CLIENT_ID}:${env.DIDIT_CLIENT_SECRET}`,
    ).toString('base64');

    const response = await fetch('https://auth.didit.me/auth/realms/didit/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Didit auth failed: ${response.status}`);
    }

    const data = (await response.json()) as DiditTokenResponse;
    return data.access_token;
  }

  async createSession(userId: number): Promise<{ sessionId: string; verificationUrl: string }> {
    const token = await this.getAccessToken();

    const response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: env.DIDIT_WORKFLOW_ID,
        callback: `tg://user?id=${userId}`,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Didit session creation failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as DiditSessionResponse;

    await this.userRepo.updateKyc(userId, {
      kycVerified: false,
      kycSessionId: data.session_id,
    });

    return {
      sessionId: data.session_id,
      verificationUrl: data.verification_url,
    };
  }

  async handleWebhook(payload: DiditSessionResult): Promise<{ userId: number | null; approved: boolean; nationality?: string }> {
    const sessionId = payload.session_id;

    if (!sessionId) return { userId: null, approved: false };

    const user = await this.userRepo.findAll().then((users) =>
      users.find((u) => u.kycSessionId === sessionId),
    );

    if (!user) return { userId: null, approved: false };

    const isApproved =
      payload.status === 'Approved' ||
      payload.decision?.kyc?.recommendation === 'Approved';

    const nationality =
      payload.kyc?.document?.nationality ??
      payload.kyc?.document?.issuing_state;

    await this.userRepo.updateKyc(user.id, {
      kycVerified: isApproved,
      kycNationality: nationality,
      kycSessionId: sessionId,
    });

    return { userId: user.id, approved: isApproved, nationality };
  }

  isConfigured(): boolean {
    return !!(env.DIDIT_CLIENT_ID && env.DIDIT_CLIENT_SECRET && env.DIDIT_WORKFLOW_ID);
  }
}
