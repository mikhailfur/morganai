export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class MemoryManager {
  formatChatHistory(
    history: { role: string; content: string }[],
    maxMessages: number = 20,
    maxChars: number = 12000
  ): HistoryMessage[] {
    if (!history || history.length === 0) return [];
    const recent = history.slice(-maxMessages);
    const result: HistoryMessage[] = [];
    let totalLength = 0;
    for (const msg of recent) {
      if (!msg || !msg.content) continue;
      if (totalLength + msg.content.length > maxChars) break;
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      totalLength += msg.content.length;
    }
    return result;
  }

  buildMessages(
    history: { role: string; content: string }[],
    currentMessage: string,
    maxMessages: number = 20,
    maxChars: number = 12000
  ): HistoryMessage[] {
    const formatted = this.formatChatHistory(history, maxMessages, maxChars);
    formatted.push({ role: 'user', content: currentMessage.trim() });
    return formatted;
  }
}

export const memoryManager = new MemoryManager();
