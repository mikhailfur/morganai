import { eq, and, desc } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { chats, type Chat } from '../schema.js';

export class SessionRepository {
  constructor(private db: Db) {}

  async findActive(userId: number, charId: number): Promise<Chat | undefined> {
    const result = await this.db
      .select()
      .from(chats)
      .where(and(eq(chats.userId, userId), eq(chats.charId, charId), eq(chats.isActive, true)))
      .limit(1);
    return result[0];
  }

  async findById(id: number): Promise<Chat | undefined> {
    const result = await this.db.select().from(chats).where(eq(chats.id, id)).limit(1);
    return result[0];
  }

  async listByUser(userId: number, charId?: number): Promise<Chat[]> {
    const conditions = charId
      ? and(eq(chats.userId, userId), eq(chats.charId, charId))
      : eq(chats.userId, userId);

    return this.db
      .select()
      .from(chats)
      .where(conditions)
      .orderBy(desc(chats.updatedAt));
  }

  async create(userId: number, charId: number): Promise<Chat> {
    // Deactivate all other sessions for this user+char
    await this.db
      .update(chats)
      .set({ isActive: false })
      .where(and(eq(chats.userId, userId), eq(chats.charId, charId)));

    const result = await this.db
      .insert(chats)
      .values({ userId, charId, isActive: true, updatedAt: new Date() })
      .returning();
    return result[0];
  }

  async setActive(sessionId: number, userId: number, charId: number): Promise<void> {
    await this.db
      .update(chats)
      .set({ isActive: false })
      .where(and(eq(chats.userId, userId), eq(chats.charId, charId)));

    await this.db
      .update(chats)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(chats.id, sessionId));
  }

  async updateName(id: number, name: string): Promise<void> {
    await this.db.update(chats).set({ name, updatedAt: new Date() }).where(eq(chats.id, id));
  }

  async updateMode(id: number, modeId: number | null): Promise<void> {
    await this.db
      .update(chats)
      .set({ activeModeId: modeId, updatedAt: new Date() })
      .where(eq(chats.id, id));
  }

  async touchUpdatedAt(id: number): Promise<void> {
    await this.db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id));
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(chats).where(eq(chats.id, id));
  }

  async getOrCreate(userId: number, charId: number): Promise<Chat> {
    const existing = await this.findActive(userId, charId);
    if (existing) return existing;
    return this.create(userId, charId);
  }
}
