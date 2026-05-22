import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import type { TributeService } from '../../services/tribute.service.js';
import { buildMainKeyboard } from './menu.js';
import { getImage, cacheFileId, extractFileId } from '../helpers/image-cache.js';
import { randomGreeting } from '../helpers/greetings.js';
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

    const text =
      `*${name}*, привет 👋\n\n` +
      `_«${randomGreeting()}»_`;

    const keyboard = buildMainKeyboard(isPremium, isAdmin(user.id));

    const bannerImg = getImage('banner');

    if (bannerImg) {
      const media = typeof bannerImg === 'string' ? bannerImg : { source: bannerImg.source };
      const result = await ctx.replyWithPhoto(media as string, {
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
