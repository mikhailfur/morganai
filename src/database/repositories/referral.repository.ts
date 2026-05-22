import { eq, count } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { referralLinks, referralClicks, users, type ReferralLink } from '../schema.js';

export class ReferralRepository {
  constructor(private db: Db) {}

  async findLinkByCode(code: string): Promise<ReferralLink | undefined> {
    const result = await this.db
      .select()
      .from(referralLinks)
      .where(eq(referralLinks.code, code))
      .limit(1);
    return result[0];
  }

  async findLinkById(id: number): Promise<ReferralLink | undefined> {
    const result = await this.db
      .select()
      .from(referralLinks)
      .where(eq(referralLinks.id, id))
      .limit(1);
    return result[0];
  }

  async listByUser(createdBy: number): Promise<ReferralLink[]> {
    return this.db
      .select()
      .from(referralLinks)
      .where(eq(referralLinks.createdBy, createdBy));
  }

  async listAll(): Promise<ReferralLink[]> {
    return this.db.select().from(referralLinks);
  }

  async create(code: string, name: string, createdBy: number): Promise<ReferralLink> {
    const result = await this.db
      .insert(referralLinks)
      .values({ code, name, createdBy })
      .returning();
    return result[0];
  }

  async toggleActive(id: number, isActive: boolean): Promise<void> {
    await this.db.update(referralLinks).set({ isActive }).where(eq(referralLinks.id, id));
  }

  async trackClick(linkId: number, userId: number): Promise<void> {
    await this.db.insert(referralClicks).values({ linkId, userId }).onConflictDoNothing();
  }

  async getClickCount(linkId: number): Promise<number> {
    const result = await this.db
      .select({ cnt: count() })
      .from(referralClicks)
      .where(eq(referralClicks.linkId, linkId));
    return Number(result[0]?.cnt ?? 0);
  }

  async getClicksWithUsers(linkId: number): Promise<
    Array<{ userId: number; username: string | null; firstName: string | null; messageCount: number; joinedAt: Date }>
  > {
    const rows = await this.db
      .select({
        userId: referralClicks.userId,
        username: users.username,
        firstName: users.firstName,
        joinedAt: referralClicks.createdAt,
      })
      .from(referralClicks)
      .innerJoin(users, eq(users.id, referralClicks.userId))
      .where(eq(referralClicks.linkId, linkId));

    return rows.map((r) => ({ ...r, messageCount: 0 }));
  }
}
