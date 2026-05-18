import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { CharacterService } from '../../services/character.service.js';
import type { UserService } from '../../services/user.service.js';

export function characterHandler(
  characterService: CharacterService,
  userService: UserService,
) {
  return async (ctx: BotContext): Promise<void> => {
    const characters = await characterService.listAll();

    if (characters.length === 0) {
      await ctx.reply('Персонажи пока не настроены.');
      return;
    }

    const buttons = characters.map((c) =>
      Markup.button.callback(c.name, `char:${c.id}`),
    );

    await ctx.reply(
      'Выбери персонажа для общения:',
      Markup.inlineKeyboard(buttons, { columns: 2 }),
    );
  };
}

export function characterCallbackHandler(
  characterService: CharacterService,
  userService: UserService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;
    if (!data.startsWith('char:')) return;

    const charId = parseInt(data.replace('char:', ''), 10);
    const char = await characterService.listAll().then((list) =>
      list.find((c) => c.id === charId),
    );

    if (!char) {
      await ctx.answerCbQuery('Персонаж не найден');
      return;
    }

    await userService.setActiveCharacter(ctx.dbUser.id, charId);
    await ctx.answerCbQuery(`Выбран: ${char.name}`);
    await ctx.editMessageText(`Теперь ты общаешься с ${char.name}. Напиши что-нибудь!`);
  };
}
