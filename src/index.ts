import pino from 'pino';
import { env } from './config/index.js';
import { migrateDb } from './database/migrate.js';
import { db } from './database/connection.js';
import { seedCharacters } from './database/seeder.js';
import { startBot } from './bot/index.js';
import { startServer } from './server/index.js';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

async function main() {
  logger.info('Starting Morgan AI...');

  await migrateDb(logger);
  await seedCharacters(db, logger);

  // Bot and server are started together; server needs the bot instance for
  // Telegram notifications from webhook handlers.
  const { bot, deps } = await startBot(logger);

  await startServer({ ...deps, bot, logger });
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
