import pino from 'pino';
import { db } from './connection.js';
import { seedCharacters } from './seeder.js';

const logger = pino({ name: 'seed', level: 'info' });

seedCharacters(db, logger)
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
