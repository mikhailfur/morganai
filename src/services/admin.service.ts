import type { UserRepository } from '../database/repositories/user.repository.js';
import type { MessageRepository } from '../database/repositories/message.repository.js';
import type { ReferralRepository } from '../database/repositories/referral.repository.js';
import { getAccountCredits, getSpendingSummary } from '../providers/openrouter/activity.js';
import { env } from '../config/index.js';

export class AdminService {
  constructor(
    private userRepo: UserRepository,
    private messageRepo: MessageRepository,
    private referralRepo: ReferralRepository,
  ) {}

  isAdmin(userId: number): boolean {
    return env.adminIds.includes(userId);
  }

  async getStats(): Promise<{
    users: { total: number; premium: number; blocked: number; kycVerified: number };
    tokens: { totalPrompt: number; totalCompletion: number; totalCacheRead: number };
  }> {
    const [users, tokens] = await Promise.all([
      this.userRepo.getStats(),
      this.messageRepo.getTokenStats(),
    ]);
    return { users, tokens };
  }

  async getSpending(): Promise<{
    totalUsd: number;
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    byModel: Array<{ model: string; usd: number; requests: number }>;
    credits?: { totalCredits: number; totalUsage: number; remaining: number };
  }> {
    const [spending, credits] = await Promise.allSettled([
      getSpendingSummary(30),
      getAccountCredits(),
    ]);

    return {
      ...(spending.status === 'fulfilled' ? spending.value : { totalUsd: 0, totalRequests: 0, totalPromptTokens: 0, totalCompletionTokens: 0, byModel: [] }),
      credits: credits.status === 'fulfilled' ? credits.value : undefined,
    };
  }

  async getLogs(limit = 20): Promise<Array<{
    id: number;
    role: string;
    content: string;
    modelUsed: string | null;
    createdAt: Date;
    userId: number;
  }>> {
    return this.messageRepo.getRecentLogs(limit);
  }

  async getAllUsers(): Promise<Array<{
    id: number;
    username: string | null;
    firstName: string | null;
    tier: string;
    kycVerified: boolean;
    blocked: boolean;
    referralSource: string | null;
    messageCount: number;
  }>> {
    const users = await this.userRepo.findAll();
    return Promise.all(
      users.map(async (u) => ({
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        tier: u.tier,
        kycVerified: u.kycVerified,
        blocked: u.blocked,
        referralSource: u.referralSource,
        messageCount: await this.userRepo.getMessageCount(u.id),
      })),
    );
  }

  async setUserTier(userId: number, tier: 'free' | 'premium'): Promise<void> {
    await this.userRepo.updateTier(userId, tier);
  }

  async setUserBlocked(userId: number, blocked: boolean): Promise<void> {
    await this.userRepo.updateBlocked(userId, blocked);
  }

  async getModelStats(): Promise<Array<{ model: string; messageCount: number }>> {
    return this.messageRepo.getModelUsageStats();
  }
}
