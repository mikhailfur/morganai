import { eq, count, sql } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { users, messages, chats, type User, type NewUser } from '../schema.js';

export class UserRepository {
  constructor(private db: Db) {}

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async upsert(data: NewUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: data.username,
          firstName: data.firstName,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  async updateTier(id: number, tier: 'free' | 'premium'): Promise<void> {
    await this.db
      .update(users)
      .set({ tier, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateActiveChar(id: number, charId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ activeCharId: charId, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateKyc(
    id: number,
    data: { kycVerified: boolean; kycNationality?: string; kycSessionId?: string },
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        kycVerified: data.kycVerified,
        kycNationality: data.kycNationality,
        kycSessionId: data.kycSessionId,
        nsfwUnlocked: data.kycVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async updateNsfwUnlocked(id: number, unlocked: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ nsfwUnlocked: unlocked, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateBlocked(id: number, blocked: boolean): Promise<void> {
    await this.db
      .update(users)
      .set({ blocked, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async setReferralCode(id: number, code: string): Promise<void> {
    await this.db
      .update(users)
      .set({ referralCode: code, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findByReferralCode(code: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    return result[0];
  }

  async getStats(): Promise<{
    total: number;
    premium: number;
    blocked: number;
    kycVerified: number;
  }> {
    const result = await this.db
      .select({
        total: count(),
        premium: sql<number>`count(*) filter (where ${users.tier} = 'premium')`,
        blocked: sql<number>`count(*) filter (where ${users.blocked} = true)`,
        kycVerified: sql<number>`count(*) filter (where ${users.kycVerified} = true)`,
      })
      .from(users);
    const r = result[0];
    return {
      total: Number(r.total),
      premium: Number(r.premium),
      blocked: Number(r.blocked),
      kycVerified: Number(r.kycVerified),
    };
  }

  async getMessageCount(userId: number): Promise<number> {
    const result = await this.db
      .select({ cnt: count() })
      .from(messages)
      .innerJoin(chats, eq(chats.id, messages.chatId))
      .where(eq(chats.userId, userId));
    return Number(result[0]?.cnt ?? 0);
  }
}
