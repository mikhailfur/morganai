import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import { env } from '../../config/index.js';

export function buildMainKeyboard(isPremium: boolean, isAdmin: boolean) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [
    [
      Markup.button.callback('🎭 Персонажи', 'menu:characters'),
      Markup.button.callback('💬 Сессии', 'menu:sessions'),
    ],
    [
      Markup.button.callback('⚙️ Настройки', 'menu:settings'),
      Markup.button.callback('🔗 Мои ссылки', 'menu:referrals'),
    ],
    [
      Markup.button.callback(
        isPremium ? '💎 Premium активен' : '💎 Получить Premium',
        'menu:premium',
      ),
    ],
  ];

  if (isAdmin) {
    rows.push([Markup.button.callback('🔐 Админ-панель', 'admin:panel')]);
  }

  const extraRows: (ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.url>)[][] = [...rows];

  if (env.TELEGRAM_CHANNEL_URL) {
    extraRows.push([Markup.button.url('📢 Наш канал', env.TELEGRAM_CHANNEL_URL)]);
  }

  return Markup.inlineKeyboard(extraRows);
}

export function menuCallbackHandler(
  characterService: CharacterService,
  nsfwService: NsfwService,
  referralService: ReferralService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const action = (ctx.callbackQuery as any).data as string;
    const user = ctx.dbUser;

    if (action === 'menu:premium') {
      const text =
        user.tier === 'premium'
          ? '💎 *Premium активен*\n\nВы уже используете Premium.\n\nПреимущества:\n• Лучшие модели AI\n• Доступ к NSFW режимам (с KYC)\n• Приоритетная поддержка'
          : '💎 *Premium подписка*\n\nОткройте доступ к:\n• Более мощным моделям AI\n• NSFW режимам (с KYC)\n• Приоритетной поддержке\n\nДля получения Premium обратитесь к администратору.';

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
      });
      return;
    }

    if (action === 'menu:settings') {
      const kycStatus = user.kycVerified
        ? '✅ KYC пройден'
        : nsfwService.isConfigured()
          ? '❌ KYC не пройден'
          : '⚠️ KYC недоступен';

      const nsfwStatus = nsfwService.hasNsfwAccess(user)
        ? '✅ NSFW доступен'
        : '🔒 NSFW заблокирован';

      const text =
        `⚙️ *Настройки*\n\n` +
        `👤 Аккаунт: ${user.tier === 'premium' ? '💎 Premium' : '🆓 Free'}\n` +
        `🪪 Верификация: ${kycStatus}\n` +
        `🔞 Контент: ${nsfwStatus}\n\n` +
        `Для выбора персонажа и смены режима → «Персонажи» и «Сессии».`;

      const keyboard = [];
      if (!user.kycVerified) {
        keyboard.push([Markup.button.callback('🪪 Пройти KYC верификацию', 'kyc:start')]);
      }
      keyboard.push([Markup.button.callback('◀️ Назад', 'menu:back')]);

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard),
      });
      return;
    }

    if (action === 'menu:referrals') {
      const code = await referralService.ensureUserCode(user.id);
      const link = referralService.getBotLink(code);
      const clicks = await referralService.getUserClickCount(user.id);
      const userLinks = await referralService.listUserLinks(user.id);

      let text = `🔗 *Реферальная программа*\n\n`;
      text += `Ваша ссылка:\n\`${link}\`\n\n`;
      text += `👥 Перешли по ссылке: *${clicks}*\n\n`;

      if (userLinks.length > 0) {
        text += `📊 *Ваши кампании:*\n`;
        for (const l of userLinks) {
          text += `• ${l.name}: *${l.clicks}* переходов\n`;
        }
        text += '\n';
      }

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ Создать кампанию', 'referral:create')],
          [Markup.button.callback('◀️ Назад', 'menu:back')],
        ]),
      });
      return;
    }

    if (action === 'menu:back') {
      const isPremium = user.tier === 'premium';
      const name = ctx.from?.first_name ?? 'друг';
      const text = `👋 Привет, *${name}*!\n\nВыбери действие:`;
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...buildMainKeyboard(isPremium, false),
      });
    }
  };
}

