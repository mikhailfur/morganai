import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import type { TributeService } from '../../services/tribute.service.js';
import { showScreen } from '../helpers/screen.js';
import { env } from '../../config/index.js';

export function buildMainKeyboard(isPremium: boolean, isAdmin: boolean) {
  const rows: (ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.url>)[][] = [
    [
      Markup.button.callback('🎭 Персонажи', 'menu:characters'),
      Markup.button.callback('💬 Сессии', 'menu:sessions'),
    ],
    [
      Markup.button.callback('👤 Профиль', 'menu:settings'),
      Markup.button.callback('🎁 Пригласить', 'menu:referrals'),
    ],
    [
      Markup.button.callback(
        isPremium ? '✨ Premium — Активен' : '💎 Получить Premium',
        'menu:premium',
      ),
    ],
  ];

  if (isAdmin) {
    rows.push([Markup.button.callback('🔐 Админ-панель', 'admin:panel')]);
  }

  if (env.TELEGRAM_CHANNEL_URL) {
    rows.push([Markup.button.url('📢 Наш канал', env.TELEGRAM_CHANNEL_URL)]);
  }

  return Markup.inlineKeyboard(rows);
}

function buildPremiumKeyboard(isPremium: boolean) {
  const tributeConfigured = !!(env.TRIBUTE_LINK_1M || env.TRIBUTE_LINK_3M);

  if (isPremium) {
    return Markup.inlineKeyboard([[Markup.button.callback('◀️ Вернуться', 'menu:back')]]);
  }

  const rows: (ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.url>)[][] = [];

  if (tributeConfigured) {
    if (env.TRIBUTE_LINK_1M) rows.push([Markup.button.url('🗓 1 месяц', env.TRIBUTE_LINK_1M)]);
    if (env.TRIBUTE_LINK_3M) rows.push([Markup.button.url('📆 3 месяца — выгода 10%', env.TRIBUTE_LINK_3M)]);
    if (env.TRIBUTE_LINK_6M) rows.push([Markup.button.url('🔥 6 месяцев — выгода 20%', env.TRIBUTE_LINK_6M)]);
    if (env.TRIBUTE_LINK_12M) rows.push([Markup.button.url('💰 12 месяцев — выгода 30%', env.TRIBUTE_LINK_12M)]);
    rows.push([Markup.button.callback('✅ Уже оплатил — активировать', 'menu:tribute_check')]);
  }

  rows.push([Markup.button.callback('◀️ Назад', 'menu:back')]);
  return Markup.inlineKeyboard(rows);
}

export function menuCallbackHandler(
  characterService: CharacterService,
  nsfwService: NsfwService,
  referralService: ReferralService,
  tributeService: TributeService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const action = (ctx.callbackQuery as { data: string }).data;
    const user = ctx.dbUser;

    // --- Premium screen ---
    if (action === 'menu:premium') {
      const isPremium = user.tier === 'premium';
      const tributeConfigured = !!(env.TRIBUTE_LINK_1M || env.TRIBUTE_LINK_3M);

      const activeText =
        '✨ *Premium активен!*\n\n' +
        'Ты в элите — твои привилегии:\n\n' +
        '🤖 Топовые AI-модели — *активны*\n' +
        '🔞 NSFW-контент — *доступен*\n' +
        '⚡ Приоритетная обработка — *включена*\n' +
        '🎭 Все режимы персонажей — *открыты*\n\n' +
        '_Спасибо, что ты с нами!_ 🙏';

      const freeTextTribute =
        '💎 *Premium подписка*\n\n' +
        'Разблокируй весь потенциал:\n\n' +
        '🤖 Мощнейшие AI-модели\n' +
        '🔞 Эксклюзивный NSFW-контент\n' +
        '⚡ Приоритетная обработка\n' +
        '🎭 Уникальные режимы персонажей\n\n' +
        '👇 Выбери удобный план:';

      const freeTextManual =
        '💎 *Premium подписка*\n\n' +
        'Разблокируй весь потенциал:\n\n' +
        '🤖 Мощнейшие AI-модели\n' +
        '🔞 NSFW-контент (с KYC)\n' +
        '⚡ Приоритетная обработка\n' +
        '🎭 Уникальные режимы персонажей\n\n' +
        '_Для получения Premium обратитесь к администратору._';

      const text = isPremium
        ? activeText
        : tributeConfigured
          ? freeTextTribute
          : freeTextManual;

      await showScreen(ctx, {
        image: 'premium',
        text,
        keyboard: buildPremiumKeyboard(isPremium),
      });
      return;
    }

    // --- Tribute check ---
    if (action === 'menu:tribute_check') {
      if (!tributeService.isConfigured()) {
        await ctx.answerCbQuery('Подписка через канал не настроена', { show_alert: true });
        return;
      }

      const result = await tributeService.grantPremium(ctx.telegram, user);

      if (result === 'granted') {
        await showScreen(ctx, {
          image: 'premium',
          text:
            '🎉 *Добро пожаловать в Premium!*\n\n' +
            'Подписка успешно активирована 🚀\n\n' +
            '🤖 Топовые AI-модели — *активны*\n' +
            '🔞 NSFW-контент — *доступен*\n' +
            '⚡ Приоритет — *включён*\n' +
            '🎭 Все режимы — *открыты*\n\n' +
            '_Наслаждайся общением!_ ✨',
          keyboard: Markup.inlineKeyboard([[Markup.button.callback('🏠 В главное меню', 'menu:back')]]),
        });
      } else {
        await ctx.answerCbQuery(
          '❌ Подписка не найдена. Оформи её по ссылке выше и нажми «Уже оплатил» снова.',
          { show_alert: true },
        );
      }
      return;
    }

    // --- Settings screen ---
    if (action === 'menu:settings') {
      const kycStatus = user.kycVerified
        ? '✅ Пройдена'
        : nsfwService.isConfigured()
          ? '❌ Не пройдена'
          : '⚠️ Недоступна';

      const nsfwStatus = nsfwService.hasNsfwAccess(user) ? '✅ Открыт' : '🔒 Заблокирован';

      const tierLabel = user.tier === 'premium'
        ? '✨ Premium' + (user.premiumSource === 'tribute' ? ' via Tribute' : '')
        : '🆓 Бесплатный';

      const text =
        '👤 *Твой профиль*\n\n' +
        `├ 💎 Тариф: *${tierLabel}*\n` +
        `├ 🪪 Верификация: ${kycStatus}\n` +
        `└ 🔞 NSFW-контент: ${nsfwStatus}\n\n` +
        '_Меняй персонажей и режимы в разделе «Персонажи»_';

      const keyboard: (ReturnType<typeof Markup.button.callback>)[] = [];
      if (!user.kycVerified && nsfwService.isConfigured()) {
        keyboard.push(Markup.button.callback('🪪 Пройти верификацию (KYC)', 'kyc:start'));
      }

      await showScreen(ctx, {
        image: 'banner',
        text,
        keyboard: Markup.inlineKeyboard([
          ...(keyboard.length ? [keyboard] : []),
          [Markup.button.callback('◀️ Назад', 'menu:back')],
        ]),
      });
      return;
    }

    // --- Referrals screen ---
    if (action === 'menu:referrals') {
      const code = await referralService.ensureUserCode(user.id);
      const link = referralService.getBotLink(code);
      const clicks = await referralService.getUserClickCount(user.id);
      const userLinks = await referralService.listUserLinks(user.id);

      let text =
        '🎁 *Реферальная программа*\n\n' +
        'Зови друзей — расти вместе!\n\n' +
        '🔗 Твоя ссылка:\n' +
        `\`${link}\`\n\n` +
        `👥 Друзей привлечено: *${clicks}*\n`;

      if (userLinks.length > 0) {
        text += '\n📊 *Мои кампании:*\n';
        for (const l of userLinks) {
          text += `• ${l.name}: *${l.clicks}* переходов\n`;
        }
      }

      await showScreen(ctx, {
        image: 'banner',
        text,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('➕ Создать новую кампанию', 'referral:create')],
          [Markup.button.callback('◀️ Назад', 'menu:back')],
        ]),
      });
      return;
    }

    // --- Back to main menu ---
    if (action === 'menu:back') {
      const isPremium = user.tier === 'premium';
      const name = ctx.from?.first_name ?? 'друг';

      const statusLine = isPremium
        ? '✨ Premium-подписчик'
        : user.kycVerified
          ? '🆓 Бесплатный · 🪪 KYC пройден'
          : '🆓 Бесплатный доступ';

      const text =
        `🌟 *Привет, ${name}!*\n\n` +
        `${statusLine}\n\n` +
        `Твои AI-компаньоны ждут тебя 🤖\n` +
        `С кем пообщаемся сегодня?`;

      await showScreen(ctx, {
        image: 'banner',
        text,
        keyboard: buildMainKeyboard(isPremium, false),
      });
    }
  };
}
