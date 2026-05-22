import { eq, desc, sum, count, sql } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { messages, chats, type Message } from '../schema.js';

export class MessageRepository {
  constructor(private db: Db) {}

  async findLastN(chatId: number, limit: number): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async save(data: {
    chatId: number;
    role: 'user' | 'assistant';
    content: string;
    mediaType?: string;
    modelUsed?: string;
    tokensPrompt?: number;
    tokensCompletion?: number;
    tokensCacheRead?: number;
  }): Promise<void> {
    await this.db.insert(messages).values(data);
  }

  async countByChat(chatId: number): Promise<number> {
    const result = await this.db
      .select({ cnt: count() })
      .from(messages)
      .where(eq(messages.chatId, chatId));
    return Number(result[0]?.cnt ?? 0);
  }

  async getTokenStats(): Promise<{
    totalPrompt: number;
    totalCompletion: number;
    totalCacheRead: number;
  }> {
    const result = await this.db
      .select({
        totalPrompt: sum(messages.tokensPrompt),
        totalCompletion: sum(messages.tokensCompletion),
        totalCacheRead: sum(messages.tokensCacheRead),
      })
      .from(messages);
    const r = result[0];
    return {
      totalPrompt: Number(r.totalPrompt ?? 0),
      totalCompletion: Number(r.totalCompletion ?? 0),
      totalCacheRead: Number(r.totalCacheRead ?? 0),
    };
  }

  async getRecentLogs(limit: number): Promise<
    Array<{ id: number; role: string; content: string; modelUsed: string | null; createdAt: Date; userId: number }>
  > {
    const rows = await this.db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        modelUsed: messages.modelUsed,
        createdAt: messages.createdAt,
        userId: chats.userId,
      })
      .from(messages)
      .innerJoin(chats, eq(chats.id, messages.chatId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    return rows;
  }

  async getModelUsageStats(): Promise<Array<{ model: string; messageCount: number }>> {
    const rows = await this.db
      .select({
        model: messages.modelUsed,
        messageCount: sql<number>`count(*)`,
      })
      .from(messages)
      .where(sql`${messages.modelUsed} is not null`)
      .groupBy(messages.modelUsed);
    return rows.map((r) => ({
      model: r.model ?? 'unknown',
      messageCount: Number(r.messageCount),
    }));
  }
}
