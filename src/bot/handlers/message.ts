import type { BotContext } from '../context.js';
import type { ChatService } from '../../services/chat.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import { NsfwBlockedError } from '../../services/nsfw.service.js';
import { handleNsfwBlock } from './nsfw-paywall.js';

// In-memory state for waiting-for-input flows
// userId → action
const pendingInputs = new Map<number, { action: string }>();

export function setPendingInput(userId: number, action: string): void {
  pendingInputs.set(userId, { action });
}

export function messageHandler(chatService: ChatService, referralService: ReferralService) {
  return async (ctx: BotContext): Promise<void> => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
    if (!text?.trim()) return;

    const user = ctx.dbUser;

    if (user.blocked) {
      await ctx.reply('Ваш аккаунт заблокирован. Обратитесь к администратору.');
      return;
    }

    // Handle pending input flows
    const pending = pendingInputs.get(user.id);
    if (pending) {
      pendingInputs.delete(user.id);

      if (pending.action === 'referral:create') {
        const name = text.trim().slice(0, 100);
        const link = await referralService.createLink(user.id, name);
        const url = referralService.getBotLink(link.code);
        await ctx.reply(
          `✅ Кампания создана!\n\nНазвание: *${name}*\nСсылка:\n\`${url}\``,
          { parse_mode: 'Markdown' },
        );
        return;
      }
    }

    await ctx.sendChatAction('typing');
    try {
      const reply = await chatService.processText(user, text);
      await ctx.reply(reply);
    } catch (err) {
      if (err instanceof NsfwBlockedError) {
        await handleNsfwBlock(ctx, err);
        return;
      }
      throw err;
    }
  };
}
