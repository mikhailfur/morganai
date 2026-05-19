import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { UserService } from '../../services/user.service.js';

export function characterCallbackHandler(
  characterService: CharacterService,
  userService: UserService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as any).data as string;

    if (data === 'menu:characters') {
      const characters = await characterService.listAll();

      if (characters.length === 0) {
        await ctx.editMessageText(
          'Персонажи пока не настроены.',
          Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
        );
        return;
      }

      const buttons = [
        ...characters.map((c) => [
          Markup.button.callback(
            `${c.nsfwCapable ? '🔞 ' : '🎭 '}${c.name}`,
            `char:${c.id}`,
          ),
        ]),
        [Markup.button.callback('◀️ Назад', 'menu:back')],
      ];

      await ctx.editMessageText(
        '🎭 *Выбери персонажа:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) },
      );
      return;
    }

    if (data.startsWith('char:')) {
      const charId = parseInt(data.replace('char:', ''), 10);
      const char = await characterService.listAll().then((list) =>
        list.find((c) => c.id === charId),
      );

      if (!char) {
        await ctx.answerCbQuery('Персонаж не найден');
        return;
      }

      await userService.setActiveCharacter(ctx.dbUser.id, charId);
      await ctx.editMessageText(
        `✅ Персонаж *${char.name}* выбран!\n\n${char.description ?? ''}\n\nНапиши что-нибудь, чтобы начать диалог.`,
        { parse_mode: 'Markdown' },
      );
    }
  };
}
