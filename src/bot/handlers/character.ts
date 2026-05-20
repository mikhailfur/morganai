import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { UserService } from '../../services/user.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import type { Character } from '../../database/schema.js';
import { showScreen } from '../helpers/screen.js';

function buildSfwKeyboard(chars: Character[]) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ SFW', 'char:tab:sfw'),
      Markup.button.callback('🔞 NSFW', 'char:tab:nsfw'),
    ],
    ...chars.map((c) => [Markup.button.callback(`🎭 ${c.name}`, `char:${c.id}`)]),
    [Markup.button.callback('◀️ Назад', 'menu:back')],
  ]);
}

function buildNsfwKeyboard(chars: Character[]) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📗 SFW', 'char:tab:sfw'),
      Markup.button.callback('✅ 🔞 NSFW', 'char:tab:nsfw'),
    ],
    ...chars.map((c) => [Markup.button.callback(`🔞 ${c.name}`, `char:${c.id}`)]),
    [Markup.button.callback('◀️ Назад', 'menu:back')],
  ]);
}

function buildNsfwLockedKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📗 SFW', 'char:tab:sfw'),
      Markup.button.callback('✅ 🔞 NSFW', 'char:tab:nsfw'),
    ],
    [Markup.button.callback('💎 Получить Premium', 'menu:premium')],
    [Markup.button.callback('🪪 Пройти KYC верификацию', 'kyc:start')],
    [Markup.button.callback('◀️ Назад', 'menu:back')],
  ]);
}

export function characterCallbackHandler(
  characterService: CharacterService,
  userService: UserService,
  nsfwService: NsfwService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as { data: string }).data;
    const user = ctx.dbUser;

    // --- SFW tab (default) ---
    if (data === 'menu:characters' || data === 'char:tab:sfw') {
      const chars = await characterService.listSfw();

      if (chars.length === 0) {
        await showScreen(ctx, {
          image: 'sfw',
          text: '🎭 *Персонажи*\n\nSFW-персонажи пока не настроены.',
          keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
        });
        return;
      }

      await showScreen(ctx, {
        image: 'sfw',
        text:
          '🎭 *Выбери персонажа*\n\n' +
          '━━━━━━━━━━━━━━━\n' +
          '📗 *SFW* — для всех пользователей\n' +
          '🔞 *NSFW* — требует Premium или KYC',
        keyboard: buildSfwKeyboard(chars),
      });
      return;
    }

    // --- NSFW tab ---
    if (data === 'char:tab:nsfw') {
      if (!nsfwService.hasNsfwAccess(user)) {
        await showScreen(ctx, {
          image: 'nsfw',
          text:
            '🔞 *NSFW персонажи*\n\n' +
            '━━━━━━━━━━━━━━━\n' +
            'Для доступа к 18+ контенту необходимо:\n\n' +
            '💎 Оформить *Premium подписку*\n' +
            '_или_\n' +
            '🪪 Пройти *KYC-верификацию* личности',
          keyboard: buildNsfwLockedKeyboard(),
        });
        return;
      }

      const chars = await characterService.listNsfw();

      if (chars.length === 0) {
        await showScreen(ctx, {
          image: 'nsfw',
          text: '🔞 *NSFW персонажи*\n\nNSFW-персонажи пока не добавлены.',
          keyboard: Markup.inlineKeyboard([
            [
              Markup.button.callback('📗 SFW', 'char:tab:sfw'),
              Markup.button.callback('✅ 🔞 NSFW', 'char:tab:nsfw'),
            ],
            [Markup.button.callback('◀️ Назад', 'menu:back')],
          ]),
        });
        return;
      }

      await showScreen(ctx, {
        image: 'nsfw',
        text:
          '🔞 *NSFW персонажи*\n\n' +
          '━━━━━━━━━━━━━━━\n' +
          'Выбери персонажа для 18+ контента:',
        keyboard: buildNsfwKeyboard(chars),
      });
      return;
    }

    // --- Character card ---
    if (data.startsWith('char:')) {
      const charId = parseInt(data.slice('char:'.length), 10);
      if (isNaN(charId)) return;

      const char = await characterService.listAll().then((list) => list.find((c) => c.id === charId));

      if (!char) {
        await ctx.answerCbQuery('Персонаж не найден');
        return;
      }

      await userService.setActiveCharacter(user.id, charId);

      const description = char.description ? `\n\n${char.description}\n\n` : '\n\n';

      const text =
        `✅ *${char.name}*\n` +
        `━━━━━━━━━━━━━━━` +
        description +
        `_Напиши что-нибудь, чтобы начать диалог._`;

      await showScreen(ctx, {
        image: `character:${char.slug}`,
        text,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('◀️ К списку персонажей', char.nsfwCapable ? 'char:tab:nsfw' : 'char:tab:sfw')],
        ]),
      });
    }
  };
}
