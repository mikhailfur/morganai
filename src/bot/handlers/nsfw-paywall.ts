import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { NsfwBlockedError } from '../../services/nsfw.service.js';

export async function handleNsfwBlock(ctx: BotContext, err: NsfwBlockedError): Promise<void> {
  if (err.reason === 'region') {
    await ctx.reply(
      '🚫 *Контент заблокирован*\n\nДоступ к материалам 18+ недоступен в вашем регионе.',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  await ctx.reply(
    '🔞 *Контент 18+*\n\n' +
      'Для доступа к материалам для взрослых необходимо:\n\n' +
      '💎 Оформить Premium подписку\n' +
      '_или_\n' +
      '🪪 Пройти бесплатную KYC-верификацию личности',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💎 Получить Premium', 'menu:premium')],
        [Markup.button.callback('🪪 Пройти KYC верификацию', 'kyc:start')],
      ]),
    },
  );
}
