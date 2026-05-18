import type { BotContext } from '../context.js';
import type { ChatService } from '../../services/chat.service.js';

export function photoHandler(chatService: ChatService) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.message || !('photo' in ctx.message)) return;

    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];
    const caption = ctx.message.caption;

    await ctx.sendChatAction('typing');

    const fileLink = await ctx.telegram.getFileLink(largest.file_id);
    const response = await fetch(fileLink.href);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');

    const reply = await chatService.processPhoto(ctx.dbUser, base64, caption);
    await ctx.reply(reply);
  };
}
