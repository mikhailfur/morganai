import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { KycService } from '../../services/kyc.service.js';

export function kycCallbackHandler(kycService: KycService) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as any).data as string;
    const user = ctx.dbUser;

    if (data === 'kyc:start') {
      if (!kycService.isConfigured()) {
        await ctx.editMessageText(
          '⚠️ KYC верификация временно недоступна. Обратитесь к администратору.',
          Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
        );
        return;
      }

      if (user.kycVerified) {
        await ctx.editMessageText(
          '✅ *Вы уже верифицированы!*\n\nKYC верификация пройдена успешно.',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
          },
        );
        return;
      }

      try {
        const { verificationUrl } = await kycService.createSession(user.id);

        await ctx.editMessageText(
          `✅ *Верификация личности*\n\n` +
            `Для доступа к 18+ контенту необходимо пройти верификацию личности.\n\n` +
            `Нажмите кнопку ниже и следуйте инструкциям. После верификации доступ откроется автоматически.\n\n` +
            `⏱ Обычно занимает 2-5 минут.`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.url('🪪 Пройти верификацию', verificationUrl)],
              [Markup.button.callback('◀️ Назад', 'menu:back')],
            ]),
          },
        );
      } catch (err) {
        console.error('[KYC] createSession failed:', err);
        await ctx.editMessageText(
          '❌ Не удалось создать сессию верификации. Попробуйте позже.',
          Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
        );
      }
    }
  };
}
