import type { BotContext } from '../context.js';

export async function startHandler(ctx: BotContext): Promise<void> {
  const name = ctx.from?.first_name ?? 'путник';
  await ctx.reply(
    `Привет, ${name}! 👋\n\nЯ Морган — твой AI-компаньон. Напиши мне что-нибудь, и я отвечу.\n\nКоманды:\n/character — выбрать персонажа`,
  );
}
