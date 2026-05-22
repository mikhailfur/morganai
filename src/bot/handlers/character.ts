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
      Markup.button.callback('✅ SFW — для всех', 'char:tab:sfw'),
      Markup.button.callback('🔞 NSFW', 'char:tab:nsfw'),
    ],
    ...chars.map((c) => [Markup.button.callback(`💬 ${c.name}`, `char:${c.id}`)]),
    [Markup.button.callback('◀️ Назад', 'menu:back')],
  ]);
}

function buildNsfwKeyboard(chars: Character[]) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📗 SFW', 'char:tab:sfw'),
      Markup.button.callback('✅ 🔞 NSFW', 'char:tab:nsfw'),
    ],
    ...chars.map((c) => [Markup.button.callback(`🔥 ${c.name}`, `char:${c.id}`)]),
    [Markup.button.callback('◀️ Назад', 'menu:back')],
  ]);
}

function buildNsfwLockedKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📗 SFW', 'char:tab:sfw'),
      Markup.button.callback('🔞 NSFW', 'char:tab:nsfw'),
    ],
    [Markup.button.callback('💎 Получить Premium', 'menu:premium')],
    [Markup.button.callback('🪪 Пройти верификацию (KYC)', 'kyc:start')],
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
          '📗 *SFW* — доступно всем\n' +
          '🔞 *NSFW* — Premium или KYC\n\n' +
          'С кем пообщаемся сегодня? 👇',
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
            'Эксклюзивный 18+ контент\n' +
            'доступен для:\n\n' +
            '💎 *Premium*-подписчиков\n' +
            '🪪 Прошедших *KYC*-верификацию\n\n' +
            'Разблокируй доступ уже сейчас 👇',
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
          '🔥 *NSFW персонажи*\n\n' +
          'Добро пожаловать в 18+ раздел!\n\n' +
          'Выбери персонажа для общения 👇',
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
        `✨ *${char.name}* — выбран!\n` +
        description +
        `💬 _Напиши что-нибудь, чтобы начать диалог_`;

      await showScreen(ctx, {
        image: `character:${char.slug}`,
        text,
        keyboard: Markup.inlineKeyboard([
          [Markup.button.callback('◀️ К персонажам', char.nsfwCapable ? 'char:tab:nsfw' : 'char:tab:sfw')],
          [Markup.button.callback('🏠 Главное меню', 'menu:back')],
        ]),
      });
    }
  };
}
