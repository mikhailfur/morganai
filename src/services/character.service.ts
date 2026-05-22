import type { CharacterRepository } from '../database/repositories/character.repository.js';
import type { Character } from '../database/schema.js';

const DEFAULT_CHAR_SLUG = 'morgan';

export class CharacterService {
  constructor(private charRepo: CharacterRepository) {}

  async getDefault(): Promise<Character> {
    const char = await this.charRepo.findBySlug(DEFAULT_CHAR_SLUG);
    if (!char) throw new Error(`Default character '${DEFAULT_CHAR_SLUG}' not found in DB`);
    return char;
  }

  async getForUser(activeCharId: number | null): Promise<Character> {
    if (activeCharId) {
      const char = await this.charRepo.findById(activeCharId);
      if (char) return char;
    }
    return this.getDefault();
  }

  async listAll(): Promise<Character[]> {
    return this.charRepo.findAll();
  }

  async listSfw(): Promise<Character[]> {
    return this.charRepo.findAllSfw();
  }

  async listNsfw(): Promise<Character[]> {
    return this.charRepo.findAllNsfw();
  }
}
