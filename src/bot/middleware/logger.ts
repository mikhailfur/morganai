import type { MiddlewareFn } from 'telegraf';
import type pino from 'pino';
import type { BotContext } from '../context.js';

export function loggerMiddleware(logger: pino.Logger): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    logger.info(
      {
        updateType: ctx.updateType,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        ms: Date.now() - start,
      },
      'Update processed',
    );
  };
}
