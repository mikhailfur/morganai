import type pino from 'pino';
import { AllModelsFailedError } from '../../providers/openrouter/chat.js';

export function createErrorHandler(logger: pino.Logger) {
  return async (err: unknown, ctx: { reply: (text: string) => Promise<unknown> }) => {
    logger.error({ err }, 'Unhandled bot error');

    let userMessage = 'Произошла ошибка. Попробуй позже.';
    if (err instanceof AllModelsFailedError) {
      userMessage = 'Все AI-модели временно недоступны. Попробуй через несколько минут.';
    }

    try {
      await ctx.reply(userMessage);
    } catch {
      // ignore reply errors
    }
  };
}
