import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import type { TributeService } from '../../services/tribute.service.js';
import { buildMainKeyboard } from './menu.js';
import { getImage, cacheFileId, extractFileId } from '../helpers/image-cache.js';
import { env } from '../../config/index.js';

export function startHandler(
  characterService: CharacterService,
  nsfwService: NsfwService,
  isAdmin: (id: number) => boolean,
  referralService: ReferralService,
  tributeService: TributeService,
) {
  return async (ctx: BotContext): Promise<void> => {
    const user = ctx.dbUser;
    const name = ctx.from?.first_name ?? 'друг';
    const isPremium = user.tier === 'premium';

    const startPayload = (ctx as { startPayload?: string }).startPayload;
    if (startPayload?.startsWith('ref_')) {
      referralService.processStartParam(startPayload, user.id).catch(() => {});
    }

    // Background Tribute re-validation (fire-and-forget)
    if (tributeService.isConfigured()) {
      tributeService.syncUserStatus(ctx.telegram, user).catch(() => {});
    }

    const statusLine = isPremium
      ? '✨ Premium-подписчик'
      : user.kycVerified
        ? '🆓 Бесплатный · 🪪 KYC пройден'
        : '🆓 Бесплатный доступ';

    const text =
      `🌟 *Привет, ${name}!*\n\n` +
      `${statusLine}\n\n` +
      `Добро пожаловать в мир AI-компаньонов 🤖\n` +
      `С кем пообщаемся сегодня?`;

    const keyboard = buildMainKeyboard(isPremium, isAdmin(user.id));

    const bannerImg = getImage('banner');

    if (bannerImg) {
      const media = typeof bannerImg === 'string' ? bannerImg : (bannerImg.source as unknown as string);
      const result = await ctx.replyWithPhoto(media, {
        caption: text,
        parse_mode: 'Markdown',
        ...keyboard,
      });
      if (typeof bannerImg !== 'string') {
        const fileId = extractFileId(result);
        if (fileId) cacheFileId('banner', fileId);
      }
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  };
}
