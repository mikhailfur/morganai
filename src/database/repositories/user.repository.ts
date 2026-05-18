import { eq } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { users, type User, type NewUser } from '../schema.js';

export class UserRepository {
  constructor(private db: Db) {}

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
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
}
