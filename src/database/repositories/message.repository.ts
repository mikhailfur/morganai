import { eq, desc } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { messages, chats, type Message } from '../schema.js';

export class MessageRepository {
  constructor(private db: Db) {}

  async findOrCreateChat(userId: number, charId: number): Promise<number> {
    const existing = await this.db
      .select({ id: chats.id })
      .from(chats)
      .where(eq(chats.userId, userId))
      .limit(1);

    if (existing[0]) return existing[0].id;

    const created = await this.db
      .insert(chats)
      .values({ userId, charId })
      .onConflictDoUpdate({ target: [chats.userId, chats.charId], set: { userId } })
      .returning({ id: chats.id });

    return created[0].id;
  }

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
}
