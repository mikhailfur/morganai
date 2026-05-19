import { eq, and } from 'drizzle-orm';
import type { Db } from './connection.js';
import { characters, characterModes } from './schema.js';
import characterDefinitions from '../characters/index.js';
import type { CharacterDefinition } from '../characters/index.js';
import type { Logger as PinoLogger } from 'pino';

export async function seedCharacters(db: Db, logger: PinoLogger): Promise<void> {
  logger.info(`Seeding ${characterDefinitions.length} character(s)…`);

  for (const def of characterDefinitions) {
    await syncCharacter(db, def, logger);
  }

  logger.info('Character seeding complete');
}

async function syncCharacter(db: Db, def: CharacterDefinition, logger: PinoLogger): Promise<void> {
  const [char] = await db
    .insert(characters)
    .values({
      slug: def.slug,
      name: def.name,
      description: def.description,
      systemPrompt: def.systemPrompt,
      avatarUrl: def.avatarUrl,
      isActive: def.isActive ?? true,
      nsfwCapable: def.nsfwCapable ?? false,
    })
    .onConflictDoUpdate({
      target: characters.slug,
      set: {
        name: def.name,
        description: def.description,
        systemPrompt: def.systemPrompt,
        avatarUrl: def.avatarUrl,
        isActive: def.isActive ?? true,
        nsfwCapable: def.nsfwCapable ?? false,
      },
    })
    .returning();

  logger.info({ slug: def.slug, id: char.id }, 'Character synced');

  if (!def.modes?.length) return;

  for (const [i, mode] of def.modes.entries()) {
    await db
      .insert(characterModes)
      .values({
        charId: char.id,
        slug: mode.slug,
        name: mode.name,
        promptAddon: mode.promptAddon,
        isNsfw: mode.isNsfw ?? false,
        isDefault: mode.isDefault ?? false,
        sortOrder: mode.sortOrder ?? i,
      })
      .onConflictDoUpdate({
        target: [characterModes.charId, characterModes.slug],
        set: {
          name: mode.name,
          promptAddon: mode.promptAddon,
          isNsfw: mode.isNsfw ?? false,
          isDefault: mode.isDefault ?? false,
          sortOrder: mode.sortOrder ?? i,
        },
      });
  }

  logger.info({ slug: def.slug, modes: def.modes.length }, 'Modes synced');
}
