import type { ReferralRepository } from '../database/repositories/referral.repository.js';
import type { UserRepository } from '../database/repositories/user.repository.js';
import type { ReferralLink } from '../database/schema.js';
import { env } from '../config/index.js';

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export class ReferralService {
  constructor(
    private referralRepo: ReferralRepository,
    private userRepo: UserRepository,
  ) {}

  async ensureUserCode(userId: number): Promise<string> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    if (user.referralCode) return user.referralCode;

    let code: string;
    let attempts = 0;
    do {
      code = generateCode(8);
      const existing = await this.referralRepo.findLinkByCode(code);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    await this.userRepo.setReferralCode(userId, code!);
    return code!;
  }

  getBotLink(code: string): string {
    const botLink = env.BOT_LINK.replace('https://t.me/', '');
    return `https://t.me/${botLink}?start=ref_${code}`;
  }

  async createLink(userId: number, name: string): Promise<ReferralLink> {
    let code: string;
    let attempts = 0;
    do {
      code = generateCode(10);
      const existing = await this.referralRepo.findLinkByCode(code);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    return this.referralRepo.create(code!, name, userId);
  }

  async listUserLinks(userId: number): Promise<Array<ReferralLink & { clicks: number }>> {
    const links = await this.referralRepo.listByUser(userId);
    return Promise.all(
      links.map(async (link) => ({
        ...link,
        clicks: await this.referralRepo.getClickCount(link.id),
      })),
    );
  }

  async getUserClickCount(userId: number): Promise<number> {
    const code = await this.ensureUserCode(userId);
    const link = await this.referralRepo.findLinkByCode(code);
    if (!link) return 0;
    return this.referralRepo.getClickCount(link.id);
  }

  async processStartParam(startParam: string, newUserId: number): Promise<void> {
    if (!startParam.startsWith('ref_')) return;

    const code = startParam.replace('ref_', '');
    const link = await this.referralRepo.findLinkByCode(code);

    if (link && link.isActive && link.createdBy !== newUserId) {
      await this.referralRepo.trackClick(link.id, newUserId);
      await this.userRepo.upsert({
        id: newUserId,
        referralSource: code,
      } as any);
      return;
    }

    const referrer = await this.userRepo.findByReferralCode(code);
    if (referrer && referrer.id !== newUserId) {
      await this.userRepo.upsert({
        id: newUserId,
        referralSource: code,
      } as any);
    }
  }

  async getAdminLinkStats(linkId: number): Promise<
    Array<{ userId: number; username: string | null; firstName: string | null; messageCount: number; joinedAt: Date }>
  > {
    return this.referralRepo.getClicksWithUsers(linkId);
  }

  async listAllLinks(): Promise<Array<ReferralLink & { clicks: number; creatorName: string | null }>> {
    const links = await this.referralRepo.listAll();
    return Promise.all(
      links.map(async (link) => {
        const creator = await this.userRepo.findById(link.createdBy);
        return {
          ...link,
          clicks: await this.referralRepo.getClickCount(link.id),
          creatorName: creator?.username ?? creator?.firstName ?? String(link.createdBy),
        };
      }),
    );
  }
}
