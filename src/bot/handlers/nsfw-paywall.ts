import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { NsfwBlockedError } from '../../services/nsfw.service.js';

export async function handleNsfwBlock(ctx: BotContext, err: NsfwBlockedError): Promise<void> {
  if (err.reason === 'region') {
    await ctx.reply(
      '🚫 *Контент заблокирован*\n\nДоступ к 18+ материалам недоступен в твоём регионе.',
      { parse_mode: 'Markdown' },
    );
    return;
  }

  await ctx.reply(
    '🔞 *Контент для взрослых*\n\n' +
      'Для доступа к 18+ материалам нужно:\n\n' +
      '💎 Оформить *Premium* подписку\n' +
      '🪪 Пройти бесплатную *KYC*-верификацию\n\n' +
      '_Разблокируй доступ в пару кликов!_',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💎 Получить Premium', 'menu:premium')],
        [Markup.button.callback('🪪 Пройти KYC верификацию', 'kyc:start')],
      ]),
    },
  );
}
