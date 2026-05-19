import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { SessionService } from '../../services/session.service.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';

export function sessionsCallbackHandler(
  sessionService: SessionService,
  characterService: CharacterService,
  nsfwService: NsfwService,
) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();

    const data = (ctx.callbackQuery as any).data as string;
    const user = ctx.dbUser;

    if (data === 'menu:sessions') {
      await showSessionsList(ctx, sessionService, characterService);
      return;
    }

    if (data.startsWith('sessions:list:')) {
      const charId = parseInt(data.replace('sessions:list:', ''), 10);
      await showSessionsForChar(ctx, sessionService, charId);
      return;
    }

    if (data.startsWith('sessions:new:')) {
      const charId = parseInt(data.replace('sessions:new:', ''), 10);
      const session = await sessionService.createNew(user.id, charId);
      await ctx.editMessageText(
        `✅ Новая сессия создана!\n\nСессия #${session.id} активна. Напишите что-нибудь персонажу.`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад к сессиям', `sessions:list:${charId}`)]]),
      );
      return;
    }

    if (data.startsWith('sessions:switch:')) {
      const parts = data.replace('sessions:switch:', '').split(':');
      const sessionId = parseInt(parts[0], 10);
      const charId = parseInt(parts[1], 10);
      await sessionService.switchSession(sessionId, user.id, charId);
      await ctx.editMessageText(
        `✅ Сессия переключена!`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад к сессиям', `sessions:list:${charId}`)]]),
      );
      return;
    }

    if (data.startsWith('sessions:delete:')) {
      const parts = data.replace('sessions:delete:', '').split(':');
      const sessionId = parseInt(parts[0], 10);
      const charId = parseInt(parts[1], 10);
      await sessionService.deleteSession(sessionId);
      await showSessionsForChar(ctx, sessionService, charId);
      return;
    }

    if (data.startsWith('sessions:mode:')) {
      const parts = data.replace('sessions:mode:', '').split(':');
      const sessionId = parseInt(parts[0], 10);
      const charId = parseInt(parts[1], 10);
      await showModeSelector(ctx, sessionService, nsfwService, sessionId, charId);
      return;
    }

    if (data.startsWith('sessions:setmode:')) {
      const parts = data.replace('sessions:setmode:', '').split(':');
      const sessionId = parseInt(parts[0], 10);
      const charId = parseInt(parts[1], 10);
      const modeId = parseInt(parts[2], 10);

      const modes = await sessionService.getAvailableModes(charId);
      const mode = modes.find((m) => m.id === modeId);

      if (!mode) {
        await ctx.answerCbQuery('Режим не найден');
        return;
      }

      if (mode.isNsfw && !nsfwService.hasNsfwAccess(user)) {
        const reason = nsfwService.getNsfwBlockReason(user);
        if (reason === 'region') {
          await ctx.editMessageText(
            '🚫 Доступ к NSFW режимам заблокирован для вашего региона.',
            Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]]),
          );
        } else {
          await ctx.editMessageText(
            '🔒 *NSFW режим требует Premium или KYC верификации*\n\nПолучите Premium или пройдите верификацию личности для доступа к 18+ контенту.',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Пройти KYC', 'kyc:start')],
                [Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)],
              ]),
            },
          );
        }
        return;
      }

      await sessionService.updateMode(sessionId, modeId);
      await ctx.editMessageText(
        `✅ Режим «${mode.name}» активирован!`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад к сессиям', `sessions:list:${charId}`)]]),
      );
    }
  };
}

async function showSessionsList(
  ctx: BotContext,
  sessionService: SessionService,
  characterService: CharacterService,
): Promise<void> {
  const characters = await characterService.listAll();
  if (characters.length === 0) {
    await ctx.editMessageText(
      'Персонажи пока не настроены.',
      Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
    );
    return;
  }

  const buttons = characters.map((c) => [
    Markup.button.callback(`🎭 ${c.name}`, `sessions:list:${c.id}`),
  ]);
  buttons.push([Markup.button.callback('◀️ Назад', 'menu:back')]);

  await ctx.editMessageText(
    '💬 *Сессии чатов*\n\nВыберите персонажа:',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) },
  );
}

async function showSessionsForChar(
  ctx: BotContext,
  sessionService: SessionService,
  charId: number,
): Promise<void> {
  const userId = ctx.dbUser.id;
  const sessions = await sessionService.listSessions(userId, charId);

  if (sessions.length === 0) {
    await ctx.editMessageText(
      'У вас нет сессий с этим персонажем.',
      Markup.inlineKeyboard([
        [Markup.button.callback('➕ Создать сессию', `sessions:new:${charId}`)],
        [Markup.button.callback('◀️ Назад', 'menu:sessions')],
      ]),
    );
    return;
  }

  let text = `💬 *Сессии*\n\n`;
  const keyboard = [];

  for (const s of sessions) {
    const name = s.name ?? `Сессия #${s.id}`;
    const activeIcon = s.isActive ? '🟢 ' : '';
    const date = s.updatedAt.toLocaleDateString('ru-RU');
    text += `${activeIcon}*${name}* (${date})\n`;

    const row = [
      Markup.button.callback(`${activeIcon}${name}`, `sessions:switch:${s.id}:${charId}`),
      Markup.button.callback('⚙️', `sessions:mode:${s.id}:${charId}`),
      Markup.button.callback('🗑', `sessions:delete:${s.id}:${charId}`),
    ];
    keyboard.push(row);
  }

  keyboard.push([Markup.button.callback('➕ Новая сессия', `sessions:new:${charId}`)]);
  keyboard.push([Markup.button.callback('◀️ Назад', 'menu:sessions')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard),
  });
}

async function showModeSelector(
  ctx: BotContext,
  sessionService: SessionService,
  nsfwService: NsfwService,
  sessionId: number,
  charId: number,
): Promise<void> {
  const user = ctx.dbUser;
  const modes = await sessionService.getAvailableModes(charId);

  if (modes.length === 0) {
    await ctx.editMessageText(
      'У этого персонажа нет настроенных режимов.',
      Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]]),
    );
    return;
  }

  const keyboard = modes.map((m) => {
    const locked = m.isNsfw && !nsfwService.hasNsfwAccess(user);
    const label = `${m.isNsfw ? '🔞 ' : ''}${m.name}${locked ? ' 🔒' : ''}`;
    return [Markup.button.callback(label, `sessions:setmode:${sessionId}:${charId}:${m.id}`)];
  });

  keyboard.push([Markup.button.callback('🚫 Без режима', `sessions:setmode:${sessionId}:${charId}:0`)]);
  keyboard.push([Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]);

  await ctx.editMessageText(
    '⚙️ *Выберите режим*\n\n🔒 — требует Premium или KYC\n🔞 — 18+ контент',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) },
  );
}
