import { Telegraf } from 'telegraf';
import type pino from 'pino';
import { env } from '../config/index.js';
import { db } from '../database/connection.js';
import { UserRepository } from '../database/repositories/user.repository.js';
import { CharacterRepository } from '../database/repositories/character.repository.js';
import { MessageRepository } from '../database/repositories/message.repository.js';
import { SessionRepository } from '../database/repositories/session.repository.js';
import { ReferralRepository } from '../database/repositories/referral.repository.js';
import { UserService } from '../services/user.service.js';
import { CharacterService } from '../services/character.service.js';
import { ChatService } from '../services/chat.service.js';
import { SessionService } from '../services/session.service.js';
import { NsfwService } from '../services/nsfw.service.js';
import { KycService } from '../services/kyc.service.js';
import { ReferralService } from '../services/referral.service.js';
import { AdminService } from '../services/admin.service.js';
import { TributeService } from '../services/tribute.service.js';
import { ContextManager } from '../memory/context-manager.js';
import { authMiddleware } from './middleware/auth.js';
import { loggerMiddleware } from './middleware/logger.js';
import { createErrorHandler } from './middleware/error.js';
import { startHandler } from './handlers/start.js';
import { messageHandler, setPendingInput } from './handlers/message.js';
import { photoHandler } from './handlers/photo.js';
import { voiceHandler } from './handlers/voice.js';
import { characterCallbackHandler } from './handlers/character.js';
import { sessionsCallbackHandler } from './handlers/sessions.js';
import { adminCallbackHandler, adminCommandHandler } from './handlers/admin.js';
import { kycCallbackHandler } from './handlers/kyc.js';
import { menuCallbackHandler } from './handlers/menu.js';
import type { BotContext } from './context.js';

export interface BotStartResult {
  bot: Telegraf<BotContext>;
  deps: {
    kycService: KycService;
    nsfwService: NsfwService;
  };
}

export async function startBot(logger: pino.Logger): Promise<BotStartResult> {
  const userRepo = new UserRepository(db);
  const charRepo = new CharacterRepository(db);
  const messageRepo = new MessageRepository(db);
  const sessionRepo = new SessionRepository(db);
  const referralRepo = new ReferralRepository(db);

  const userService = new UserService(userRepo);
  const characterService = new CharacterService(charRepo);
  const sessionService = new SessionService(sessionRepo, charRepo);
  const nsfwService = new NsfwService();
  const kycService = new KycService(userRepo);
  const referralService = new ReferralService(referralRepo, userRepo);
  const adminService = new AdminService(userRepo, messageRepo, referralRepo);
  const tributeService = new TributeService(userRepo);
  const contextManager = new ContextManager(messageRepo);

  const chatService = new ChatService(
    contextManager,
    messageRepo,
    sessionRepo,
    charRepo,
    characterService,
    sessionService,
    nsfwService,
    logger,
  );

  const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN);

  bot.use(loggerMiddleware(logger));
  bot.use(authMiddleware(userService));

  // Commands
  bot.start(startHandler(characterService, nsfwService, (id) => adminService.isAdmin(id), referralService, tributeService));
  bot.command('admin', adminCommandHandler(adminService));

  // Inline keyboard callbacks — order matters, most specific first
  const charCallback = characterCallbackHandler(characterService, userService, nsfwService);
  const sessionsCallback = sessionsCallbackHandler(sessionService, characterService, nsfwService);
  const adminCallback = adminCallbackHandler(adminService, referralService);
  const kycCallback = kycCallbackHandler(kycService);
  const menuCallback = menuCallbackHandler(characterService, nsfwService, referralService, tributeService);

  bot.action(/^(char:|menu:characters)/, charCallback);
  bot.action(/^sessions:/, sessionsCallback);
  bot.action('menu:sessions', sessionsCallback);
  bot.action(/^admin:/, adminCallback);
  bot.action(/^kyc:/, kycCallback);
  bot.action(/^(menu:|referral:)/, async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const data = (ctx.callbackQuery as { data: string }).data;

    if (data === 'referral:create') {
      await ctx.answerCbQuery();
      setPendingInput(ctx.from!.id, 'referral:create');
      await ctx.editMessageText(
        '📝 Введите название для новой кампании:\n(например: "ВКонтакте апрель", "Telegram канал")',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    await menuCallback(ctx);
  });

  // Message handlers
  bot.on('text', messageHandler(chatService, referralService));
  bot.on('photo', photoHandler(chatService));
  bot.on('voice', voiceHandler(chatService));

  bot.catch(createErrorHandler(logger));

  await bot.launch();
  logger.info('Bot is running');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return { bot, deps: { kycService, nsfwService } };
}
