import pino from 'pino';
import { env } from './config/index.js';
import { migrateDb } from './database/migrate.js';
import { startBot } from './bot/index.js';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});

async function main() {
  logger.info('Starting Morgan AI...');

  await migrateDb(logger);
  logger.info('Database migrations applied');

  await startBot(logger);
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
