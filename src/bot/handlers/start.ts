import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import type { TributeService } from '../../services/tribute.service.js';
import { buildMainKeyboard } from './menu.js';
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

    // Background Tribute re-validation (fire-and-forget, non-blocking)
    if (tributeService.isConfigured()) {
      tributeService.syncUserStatus(ctx.telegram, user).catch(() => {});
    }

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

    const keyboard = buildMainKeyboard(isPremium, isAdmin(user.id));

    if (env.BANNER_IMAGE_URL) {
      await ctx.replyWithPhoto(env.BANNER_IMAGE_URL, {
        caption: text,
        parse_mode: 'Markdown',
        ...keyboard,
      });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
  };
}
