import type pino from 'pino';
import type { BotContext } from '../context.js';
import type { ChatService } from '../../services/chat.service.js';

export function voiceHandler(chatService: ChatService, logger: pino.Logger) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.message || !('voice' in ctx.message)) return;

    const voice = ctx.message.voice;
    await ctx.sendChatAction('typing');

    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const response = await fetch(fileLink.href);
    const buffer = Buffer.from(await response.arrayBuffer());

    try {
      const reply = await chatService.processVoice(ctx.dbUser, buffer);
      await ctx.reply(reply);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, userId: ctx.dbUser.id }, 'Voice transcription failed');

      if (message.includes('500') || message.includes('Internal Server Error')) {
        await ctx.reply(
          'Голосовые сообщения временно не работают — сервис транскрипции недоступен. Напиши текстом.',
        );
      } else {
        await ctx.reply('Не удалось обработать голосовое. Попробуй позже или напиши текстом.');
      }
    }
  };
}
