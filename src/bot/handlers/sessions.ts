import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { SessionService } from '../../services/session.service.js';
import type { CharacterService } from '../../services/character.service.js';
import type { NsfwService } from '../../services/nsfw.service.js';
import { showScreen } from '../helpers/screen.js';

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
      await showScreen(ctx, {
        image: 'banner',
        text:
          `✅ *Новая сессия создана!*\n\n` +
          `Сессия #${session.id} активна 🟢\n\n` +
          `_Напиши что-нибудь, чтобы начать разговор_`,
        keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ К сессиям', `sessions:list:${charId}`)]]),
      });
      return;
    }

    if (data.startsWith('sessions:switch:')) {
      const parts = data.replace('sessions:switch:', '').split(':');
      const sessionId = parseInt(parts[0], 10);
      const charId = parseInt(parts[1], 10);
      await sessionService.switchSession(sessionId, user.id, charId);
      await showScreen(ctx, {
        image: 'banner',
        text: `✅ *Сессия переключена!*\n\n_Можешь продолжать разговор_`,
        keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ К сессиям', `sessions:list:${charId}`)]]),
      });
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
          await showScreen(ctx, {
            image: 'banner',
            text: '🚫 *Доступ заблокирован*\n\nNSFW-режимы недоступны в твоём регионе.',
            keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]]),
          });
        } else {
          await showScreen(ctx, {
            image: 'nsfw',
            text:
              '🔒 *NSFW режим заблокирован*\n\n' +
              'Для доступа к 18+ режимам нужно:\n\n' +
              '💎 Оформить *Premium* подписку\n' +
              '🪪 Пройти *KYC*-верификацию',
            keyboard: Markup.inlineKeyboard([
              [Markup.button.callback('💎 Получить Premium', 'menu:premium')],
              [Markup.button.callback('🪪 Пройти KYC', 'kyc:start')],
              [Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)],
            ]),
          });
        }
        return;
      }

      await sessionService.updateMode(sessionId, modeId);
      await showScreen(ctx, {
        image: 'banner',
        text: `✅ *Режим «${mode.name}» активирован!*\n\n_Персонаж переключился в новый режим_`,
        keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ К сессиям', `sessions:list:${charId}`)]]),
      });
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
    await showScreen(ctx, {
      image: 'banner',
      text: '💬 *Сессии чатов*\n\nПерсонажи пока не настроены.\nЗайди позже!',
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'menu:back')]]),
    });
    return;
  }

  const buttons = characters.map((c) => [
    Markup.button.callback(`💬 ${c.name}`, `sessions:list:${c.id}`),
  ]);
  buttons.push([Markup.button.callback('◀️ Назад', 'menu:back')]);

  await showScreen(ctx, {
    image: 'banner',
    text:
      '💬 *Твои сессии*\n\n' +
      'Здесь хранится история всех твоих разговоров.\n' +
      'Выбери персонажа 👇',
    keyboard: Markup.inlineKeyboard(buttons),
  });
}

async function showSessionsForChar(
  ctx: BotContext,
  sessionService: SessionService,
  charId: number,
): Promise<void> {
  const userId = ctx.dbUser.id;
  const sessions = await sessionService.listSessions(userId, charId);

  if (sessions.length === 0) {
    await showScreen(ctx, {
      image: 'banner',
      text:
        '💬 *Сессии*\n\n' +
        'У тебя ещё нет сессий с этим персонажем.\n' +
        'Создай первую! 🚀',
      keyboard: Markup.inlineKeyboard([
        [Markup.button.callback('➕ Создать сессию', `sessions:new:${charId}`)],
        [Markup.button.callback('◀️ Назад', 'menu:sessions')],
      ]),
    });
    return;
  }

  let text = `💬 *Твои сессии*\n\n🟢 — активная  ·  ⚙️ — режим  ·  🗑 — удалить\n\n`;
  const keyboard = [];

  for (const s of sessions) {
    const name = s.name ?? `Сессия #${s.id}`;
    const activeIcon = s.isActive ? '🟢 ' : '⚪️ ';
    const date = s.updatedAt.toLocaleDateString('ru-RU');
    text += `${activeIcon}*${name}* · ${date}\n`;

    const row = [
      Markup.button.callback(`${s.isActive ? '🟢' : '▶️'} ${name}`, `sessions:switch:${s.id}:${charId}`),
      Markup.button.callback('⚙️ Режим', `sessions:mode:${s.id}:${charId}`),
      Markup.button.callback('🗑', `sessions:delete:${s.id}:${charId}`),
    ];
    keyboard.push(row);
  }

  keyboard.push([Markup.button.callback('➕ Новая сессия', `sessions:new:${charId}`)]);
  keyboard.push([Markup.button.callback('◀️ Назад', 'menu:sessions')]);

  await showScreen(ctx, {
    image: 'banner',
    text,
    keyboard: Markup.inlineKeyboard(keyboard),
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
    await showScreen(ctx, {
      image: 'banner',
      text: '⚙️ *Режимы*\n\nУ этого персонажа нет настроенных режимов.',
      keyboard: Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]]),
    });
    return;
  }

  const keyboard = modes.map((m) => {
    const locked = m.isNsfw && !nsfwService.hasNsfwAccess(user);
    const icon = locked ? '🔒' : m.isNsfw ? '🔥' : '✨';
    const label = `${icon} ${m.name}${locked ? ' — заблокирован' : ''}`;
    return [Markup.button.callback(label, `sessions:setmode:${sessionId}:${charId}:${m.id}`)];
  });

  keyboard.push([Markup.button.callback('🚫 Без режима', `sessions:setmode:${sessionId}:${charId}:0`)]);
  keyboard.push([Markup.button.callback('◀️ Назад', `sessions:list:${charId}`)]);

  await showScreen(ctx, {
    image: 'banner',
    text:
      '⚙️ *Выбери режим персонажа*\n\n' +
      '✨ — стандартный  ·  🔥 — NSFW  ·  🔒 — нужен Premium/KYC',
    keyboard: Markup.inlineKeyboard(keyboard),
  });
}
