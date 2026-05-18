import { Telegraf } from 'telegraf';
import type pino from 'pino';
import { env } from '../config/index.js';
import { db } from '../database/connection.js';
import { UserRepository } from '../database/repositories/user.repository.js';
import { CharacterRepository } from '../database/repositories/character.repository.js';
import { MessageRepository } from '../database/repositories/message.repository.js';
import { UserService } from '../services/user.service.js';
import { CharacterService } from '../services/character.service.js';
import { ChatService } from '../services/chat.service.js';
import { ContextManager } from '../memory/context-manager.js';
import { authMiddleware } from './middleware/auth.js';
import { loggerMiddleware } from './middleware/logger.js';
import { createErrorHandler } from './middleware/error.js';
import { startHandler } from './handlers/start.js';
import { messageHandler } from './handlers/message.js';
import { photoHandler } from './handlers/photo.js';
import { voiceHandler } from './handlers/voice.js';
import { characterHandler, characterCallbackHandler } from './handlers/character.js';
import type { BotContext } from './context.js';

export async function startBot(logger: pino.Logger): Promise<void> {
  const userRepo = new UserRepository(db);
  const charRepo = new CharacterRepository(db);
  const messageRepo = new MessageRepository(db);

  const userService = new UserService(userRepo);
  const characterService = new CharacterService(charRepo);
  const contextManager = new ContextManager(messageRepo);
  const chatService = new ChatService(contextManager, messageRepo, characterService, logger);

  const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN);

  bot.use(loggerMiddleware(logger));
  bot.use(authMiddleware(userService));

  bot.start(startHandler);
  bot.command('character', characterHandler(characterService, userService));
  bot.action(/^char:\d+$/, characterCallbackHandler(characterService, userService));
  bot.on('text', messageHandler(chatService));
  bot.on('photo', photoHandler(chatService));
  bot.on('voice', voiceHandler(chatService, logger));

  bot.catch(createErrorHandler(logger));

  await bot.launch();
  logger.info('Bot is running');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
