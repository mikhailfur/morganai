import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { ReferralService } from '../../services/referral.service.js';
import { buildMainKeyboard } from './menu.js';

export function startHandler(
  characterService: CharacterService,
  nsfwService: NsfwService,
  isAdmin: (id: number) => boolean,
  referralService: ReferralService,
) {
  return async (ctx: BotContext): Promise<void> => {
    const user = ctx.dbUser;
    const name = ctx.from?.first_name ?? 'друг';
    const isPremium = user.tier === 'premium';

    const startPayload = (ctx as any).startPayload as string | undefined;
    if (startPayload?.startsWith('ref_')) {
      referralService.processStartParam(startPayload, user.id).catch(() => {});
    }

    let statusLine = isPremium ? '💎 Premium подписка активна' : '🆓 Бесплатный аккаунт';
    if (user.kycVerified) statusLine += ' · ✅ KYC пройден';

    const text =
      `👋 Привет, *${name}*!\n\n` +
      `Я — МорганAI, твой AI-компаньон.\n` +
      `${statusLine}\n\n` +
      `Выбери действие:`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...buildMainKeyboard(isPremium, isAdmin(user.id)),
    });
  };
}
