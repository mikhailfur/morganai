export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class MemoryManager {
  private readonly maxHistoryLength = 20;
  private readonly maxContextChars = 12000;

  formatChatHistory(history: { role: string; content: string }[]): HistoryMessage[] {
    if (!history || history.length === 0) return [];
    const recent = history.slice(-this.maxHistoryLength);
    const result: HistoryMessage[] = [];
    let totalLength = 0;
    for (const msg of recent) {
      if (!msg || !msg.content) continue;
      if (totalLength + msg.content.length > this.maxContextChars) break;
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      totalLength += msg.content.length;
    }
    return result;
  }

  buildMessages(history: { role: string; content: string }[], currentMessage: string): HistoryMessage[] {
    const formatted = this.formatChatHistory(history);
    formatted.push({ role: 'user', content: currentMessage.trim() });
    return formatted;
  }
}

export const memoryManager = new MemoryManager();
