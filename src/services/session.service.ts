import type { SessionRepository } from '../database/repositories/session.repository.js';
import type { CharacterRepository } from '../database/repositories/character.repository.js';
import type { Chat, CharacterMode } from '../database/schema.js';
import { openrouterFetch } from '../providers/openrouter/client.js';
import { env } from '../config/index.js';

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private charRepo: CharacterRepository,
  ) {}

  async getOrCreate(userId: number, charId: number): Promise<Chat> {
    return this.sessionRepo.getOrCreate(userId, charId);
  }

  async listSessions(userId: number, charId: number): Promise<Chat[]> {
    return this.sessionRepo.listByUser(userId, charId);
  }

  async createNew(userId: number, charId: number): Promise<Chat> {
    return this.sessionRepo.create(userId, charId);
  }

  async switchSession(sessionId: number, userId: number, charId: number): Promise<void> {
    await this.sessionRepo.setActive(sessionId, userId, charId);
  }

  async deleteSession(sessionId: number): Promise<void> {
    await this.sessionRepo.delete(sessionId);
  }

  async updateMode(sessionId: number, modeId: number | null): Promise<void> {
    await this.sessionRepo.updateMode(sessionId, modeId);
  }

  async getAvailableModes(charId: number): Promise<CharacterMode[]> {
    return this.charRepo.findModesByChar(charId);
  }

  async nameSessionAsync(sessionId: number, firstMessage: string): Promise<void> {
    try {
      const response = (await openrouterFetch('/chat/completions', {
        model: env.OPENROUTER_NAMING_MODEL,
        max_tokens: 20,
        messages: [
          {
            role: 'system',
            content:
              'Generate a short 2-4 word title for a chat session based on the first user message. Reply with ONLY the title, no quotes, no punctuation at the end.',
          },
          { role: 'user', content: firstMessage.slice(0, 500) },
        ],
      })) as { choices: Array<{ message: { content: string } }> };

      const name = response.choices[0]?.message?.content?.trim();
      if (name && name.length > 0 && name.length <= 100) {
        await this.sessionRepo.updateName(sessionId, name);
      }
    } catch {
      // fire-and-forget, ignore errors
    }
  }
}
