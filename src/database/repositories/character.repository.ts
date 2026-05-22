import { eq, and } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { characters, characterModes, type Character, type CharacterMode } from '../schema.js';

export class CharacterRepository {
  constructor(private db: Db) {}

  async findById(id: number): Promise<Character | undefined> {
    const result = await this.db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);
    return result[0];
  }

  async findBySlug(slug: string): Promise<Character | undefined> {
    const result = await this.db
      .select()
      .from(characters)
      .where(eq(characters.slug, slug))
      .limit(1);
    return result[0];
  }

  async findAll(): Promise<Character[]> {
    return this.db.select().from(characters).where(eq(characters.isActive, true));
  }

  async findAllSfw(): Promise<Character[]> {
    return this.db
      .select()
      .from(characters)
      .where(and(eq(characters.isActive, true), eq(characters.nsfwCapable, false)));
  }

  async findAllNsfw(): Promise<Character[]> {
    return this.db
      .select()
      .from(characters)
      .where(and(eq(characters.isActive, true), eq(characters.nsfwCapable, true)));
  }

  async findModesByChar(charId: number): Promise<CharacterMode[]> {
    return this.db
      .select()
      .from(characterModes)
      .where(eq(characterModes.charId, charId))
      .orderBy(characterModes.sortOrder);
  }

  async findModeById(modeId: number): Promise<CharacterMode | undefined> {
    const result = await this.db
      .select()
      .from(characterModes)
      .where(eq(characterModes.id, modeId))
      .limit(1);
    return result[0];
  }

  async findDefaultMode(charId: number): Promise<CharacterMode | undefined> {
    const result = await this.db
      .select()
      .from(characterModes)
      .where(eq(characterModes.charId, charId))
      .orderBy(characterModes.isDefault)
      .limit(1);
    return result[0];
  }
}
