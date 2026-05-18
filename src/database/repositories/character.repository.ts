import { eq } from 'drizzle-orm';
import type { Db } from '../connection.js';
import { characters, type Character } from '../schema.js';

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
}
