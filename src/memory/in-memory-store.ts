export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export class InMemoryStore {
  private store = new Map<number, StoredMessage[]>();
  private maxPerChat: number;

  constructor(maxPerChat: number) {
    this.maxPerChat = maxPerChat;
  }

  get(chatId: number): StoredMessage[] {
    return this.store.get(chatId) ?? [];
  }

  push(chatId: number, message: StoredMessage): void {
    const msgs = this.store.get(chatId) ?? [];
    msgs.push(message);
    if (msgs.length > this.maxPerChat) {
      msgs.splice(0, msgs.length - this.maxPerChat);
    }
    this.store.set(chatId, msgs);
  }

  seed(chatId: number, messages: StoredMessage[]): void {
    this.store.set(chatId, messages.slice(-this.maxPerChat));
  }

  clear(chatId: number): void {
    this.store.delete(chatId);
  }
}
