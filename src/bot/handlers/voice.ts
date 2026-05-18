import type { BotContext } from '../context.js';
import type { ChatService } from '../../services/chat.service.js';

export function voiceHandler(chatService: ChatService) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.message || !('voice' in ctx.message)) return;

    const voice = ctx.message.voice;
    await ctx.sendChatAction('typing');

    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const response = await fetch(fileLink.href);
    const buffer = Buffer.from(await response.arrayBuffer());

    const reply = await chatService.processVoice(ctx.dbUser, buffer);
    await ctx.reply(reply);
  };
}
