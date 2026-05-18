import type { BotContext } from '../context.js';
import type { ChatService } from '../../services/chat.service.js';

export function messageHandler(chatService: ChatService) {
  return async (ctx: BotContext): Promise<void> => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text?.trim()) return;

    await ctx.sendChatAction('typing');
    const reply = await chatService.processText(ctx.dbUser, text);
    await ctx.reply(reply);
  };
}
