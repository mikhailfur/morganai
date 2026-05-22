import type { Telegram } from 'telegraf';
import { env } from '../config/index.js';
import type { UserRepository } from '../database/repositories/user.repository.js';
import type { User } from '../database/schema.js';

const RECHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const ACTIVE_STATUSES = new Set(['member', 'administrator', 'creator']);

export class TributeService {
  constructor(private userRepo: UserRepository) {}

  isConfigured(): boolean {
    return !!env.TRIBUTE_CHANNEL_ID;
  }

  async checkMembership(telegram: Telegram, userId: number): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const member = await telegram.getChatMember(env.TRIBUTE_CHANNEL_ID, userId);
      return ACTIVE_STATUSES.has(member.status);
    } catch {
      return false;
    }
  }

  async syncUserStatus(telegram: Telegram, dbUser: User): Promise<boolean> {
    if (!this.isConfigured()) return dbUser.tributeVerified;

    // Skip re-check if last check was recent enough
    if (dbUser.tributeCheckedAt) {
      const elapsed = Date.now() - dbUser.tributeCheckedAt.getTime();
      if (elapsed < RECHECK_INTERVAL_MS) return dbUser.tributeVerified;
    }

    const isMember = await this.checkMembership(telegram, dbUser.id);
    const now = new Date();

    if (isMember !== dbUser.tributeVerified) {
      await this.userRepo.updateTribute(dbUser.id, isMember, now);

      if (!isMember && dbUser.premiumSource === 'tribute') {
        await this.userRepo.updateTier(dbUser.id, 'free');
        await this.userRepo.updatePremiumSource(dbUser.id, null);
      }
    } else {
      // Just refresh the checked timestamp
      await this.userRepo.updateTribute(dbUser.id, isMember, now);
    }

    return isMember;
  }

  async grantPremium(telegram: Telegram, dbUser: User): Promise<'granted' | 'not_member' | 'not_configured'> {
    if (!this.isConfigured()) return 'not_configured';

    const isMember = await this.checkMembership(telegram, dbUser.id);
    const now = new Date();

    await this.userRepo.updateTribute(dbUser.id, isMember, now);

    if (!isMember) return 'not_member';

    await this.userRepo.updateTier(dbUser.id, 'premium');
    await this.userRepo.updatePremiumSource(dbUser.id, 'tribute');
    return 'granted';
  }
}
