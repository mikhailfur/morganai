import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../config/index.js';
import type { Logger as PinoLogger } from 'pino';

export async function migrateDb(logger: PinoLogger) {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('Database migrations completed');
  } finally {
    await pool.end();
  }
}
