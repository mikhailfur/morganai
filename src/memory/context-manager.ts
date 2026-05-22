import { env } from '../config/index.js';
import { InMemoryStore } from './in-memory-store.js';
import type { OpenRouterMessage } from '../providers/openrouter/types.js';
import type { Character } from '../database/schema.js';
import type { MessageRepository } from '../database/repositories/message.repository.js';

export class ContextManager {
  private store: InMemoryStore;

  constructor(private messageRepo: MessageRepository) {
    const windowSize = env.CONTEXT_WINDOW_SIZE;
    this.store = new InMemoryStore(windowSize * 2);
  }

  async buildContextMessages(
    chatId: number,
    newUserContent: OpenRouterMessage['content'],
    character: Character,
  ): Promise<OpenRouterMessage[]> {
    let history = this.store.get(chatId);

    if (history.length === 0) {
      const dbMessages = await this.messageRepo.findLastN(chatId, env.CONTEXT_WINDOW_SIZE);
      const seeded = dbMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        createdAt: m.createdAt,
      }));
      this.store.seed(chatId, seeded);
      history = seeded;
    }

    const messages: OpenRouterMessage[] = [];

    messages.push({
      role: 'system',
      content: character.systemPrompt,
      cache_control: { type: 'ephemeral' },
    });

    for (let i = 0; i < history.length; i++) {
      const msg: OpenRouterMessage = { role: history[i].role, content: history[i].content };
      if (i === history.length - 1) {
        msg.cache_control = { type: 'ephemeral' };
      }
      messages.push(msg);
    }

    messages.push({ role: 'user', content: newUserContent });

    return messages;
  }

  addUserMessage(chatId: number, content: string): void {
    this.store.push(chatId, { role: 'user', content, createdAt: new Date() });
  }

  addAssistantMessage(chatId: number, content: string): void {
    this.store.push(chatId, { role: 'assistant', content, createdAt: new Date() });
  }
}
