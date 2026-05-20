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

  if (env.TELEGRAM_CHANNEL_URL) {
    rows.push([Markup.button.url('📢 Наш канал', env.TELEGRAM_CHANNEL_URL)]);
  }

  return Markup.inlineKeyboard(rows);
}

function buildPremiumKeyboard(isPremium: boolean) {
  const tributeConfigured = !!(env.TRIBUTE_LINK_1M || env.TRIBUTE_LINK_3M);

  if (isPremium) {
    return Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]);
  }

  const rows: (ReturnType<typeof Markup.button.callback> | ReturnType<typeof Markup.button.url>)[][] = [];

  if (tributeConfigured) {
    if (env.TRIBUTE_LINK_1M) rows.push([Markup.button.url('📅 1 месяц', env.TRIBUTE_LINK_1M)]);
    if (env.TRIBUTE_LINK_3M) rows.push([Markup.button.url('📅 3 месяца', env.TRIBUTE_LINK_3M)]);
    if (env.TRIBUTE_LINK_6M) rows.push([Markup.button.url('📅 6 месяцев', env.TRIBUTE_LINK_6M)]);
    if (env.TRIBUTE_LINK_12M) rows.push([Markup.button.url('📅 12 месяцев', env.TRIBUTE_LINK_12M)]);
    rows.push([Markup.button.callback('✅ Я подписался — проверить', 'menu:tribute_check')]);
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
        '💎 *Premium активен*\n\n' +
        '━━━━━━━━━━━━━━━\n' +
        'Ваши преимущества:\n' +
        '• 🤖 Мощные AI-модели\n' +
        '• 🔞 Доступ к NSFW-контенту\n' +
        '• ⚡ Приоритетная обработка';

      const freeTextTribute =
        '💎 *Premium подписка*\n\n' +
        '━━━━━━━━━━━━━━━\n' +
        'Открывает доступ к:\n' +
        '• 🤖 Мощным AI-моделям\n' +
        '• 🔞 NSFW-режимам (с KYC или без)\n' +
        '• ⚡ Приоритетной обработке\n\n' +
        '📋 Выберите план подписки:';

      const freeTextManual =
        '💎 *Premium подписка*\n\n' +
        '━━━━━━━━━━━━━━━\n' +
        'Открывает доступ к:\n' +
        '• 🤖 Мощным AI-моделям\n' +
        '• 🔞 NSFW-режимам (с KYC)\n' +
        '• ⚡ Приоритетной обработке\n\n' +
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
            '🎉 *Premium активирован!*\n\n' +
            '━━━━━━━━━━━━━━━\n' +
            'Добро пожаловать в Premium!\n\n' +
            '• 🤖 Мощные AI-модели — активны\n' +
            '• 🔞 NSFW-контент — доступен\n' +
            '• ⚡ Приоритетная обработка — активна',
          keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад в меню', 'menu:back')]]),
        });
      } else {
        await ctx.answerCbQuery(
          '❌ Подписка не найдена. Оформите её по ссылке выше и нажмите "Проверить" снова.',
          { show_alert: true },
        );
      }
      return;
    }

    // --- Settings screen ---
    if (action === 'menu:settings') {
      const kycStatus = user.kycVerified
        ? '✅ пройдена'
        : nsfwService.isConfigured()
          ? '❌ не пройдена'
          : '⚠️ недоступна';

      const nsfwStatus = nsfwService.hasNsfwAccess(user) ? '✅ доступен' : '🔒 заблокирован';

      const tierLabel = user.tier === 'premium'
        ? '💎 Premium' + (user.premiumSource === 'tribute' ? ' (Tribute)' : '')
        : '🆓 Free';

      const text =
        '⚙️ *Настройки аккаунта*\n\n' +
        '━━━━━━━━━━━━━━━\n' +
        `👤 Тариф: ${tierLabel}\n` +
        `🪪 Верификация: ${kycStatus}\n` +
        `🔞 NSFW-контент: ${nsfwStatus}\n` +
        '━━━━━━━━━━━━━━━\n\n' +
        '_Для выбора персонажа и смены режима → «Персонажи» и «Сессии»._';

      const keyboard: (ReturnType<typeof Markup.button.callback>)[] = [];
      if (!user.kycVerified) {
        keyboard.push(Markup.button.callback('🪪 Пройти KYC верификацию', 'kyc:start'));
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
        '🔗 *Реферальная программа*\n\n' +
        '━━━━━━━━━━━━━━━\n' +
        'Ваша ссылка:\n' +
        `\`${link}\`\n\n` +
        `👥 Переходов по ссылке: *${clicks}*\n`;

      if (userLinks.length > 0) {
        text += '\n📊 *Ваши кампании:*\n';
        for (const l of userLinks) {
          text += `• ${l.name}: *${l.clicks}* переходов\n`;
        }
      }

      await showScreen(ctx, {
        image: 'banner',
        text,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('➕ Создать кампанию', 'referral:create')],
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
        ? '💎 Premium активна'
        : user.kycVerified
          ? '🆓 Free · ✅ KYC'
          : '🆓 Free';

      const text =
        `👋 Привет, *${name}*!\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `${statusLine}\n` +
        `━━━━━━━━━━━━━━━\n\n` +
        `Выбери действие:`;

      await showScreen(ctx, {
        image: 'banner',
        text,
        keyboard: buildMainKeyboard(isPremium, false),
      });
    }
  };
}
