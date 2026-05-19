import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import type { AdminService } from '../../services/admin.service.js';
import type { ReferralService } from '../../services/referral.service.js';

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[*_`[\]()~]/g, (c) => `\\${c}`);
}

function formatUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function adminCallbackHandler(adminService: AdminService, referralService: ReferralService) {
  return async (ctx: BotContext): Promise<void> => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const data = (ctx.callbackQuery as any).data as string;
    const userId = ctx.from?.id ?? 0;

    if (!adminService.isAdmin(userId)) {
      await ctx.answerCbQuery('Нет доступа', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    if (data === 'admin:panel') {
      await showAdminPanel(ctx, adminService);
      return;
    }

    if (data === 'admin:stats') {
      await showStats(ctx, adminService);
      return;
    }

    if (data === 'admin:spending') {
      await showSpending(ctx, adminService);
      return;
    }

    if (data === 'admin:logs') {
      await showLogs(ctx, adminService);
      return;
    }

    if (data === 'admin:users') {
      await showUsers(ctx, adminService, 0);
      return;
    }

    if (data.startsWith('admin:users:page:')) {
      const page = parseInt(data.replace('admin:users:page:', ''), 10);
      await showUsers(ctx, adminService, page);
      return;
    }

    if (data.startsWith('admin:user:')) {
      const targetId = parseInt(data.replace('admin:user:', ''), 10);
      await showUserActions(ctx, adminService, targetId);
      return;
    }

    if (data.startsWith('admin:setpremium:')) {
      const targetId = parseInt(data.replace('admin:setpremium:', ''), 10);
      await adminService.setUserTier(targetId, 'premium');
      await ctx.editMessageText(`✅ Пользователь ${targetId} переведён на Premium.`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:users')]]));
      return;
    }

    if (data.startsWith('admin:setfree:')) {
      const targetId = parseInt(data.replace('admin:setfree:', ''), 10);
      await adminService.setUserTier(targetId, 'free');
      await ctx.editMessageText(`✅ Пользователь ${targetId} переведён на Free.`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:users')]]));
      return;
    }

    if (data.startsWith('admin:block:')) {
      const targetId = parseInt(data.replace('admin:block:', ''), 10);
      await adminService.setUserBlocked(targetId, true);
      await ctx.editMessageText(`🚫 Пользователь ${targetId} заблокирован.`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:users')]]));
      return;
    }

    if (data.startsWith('admin:unblock:')) {
      const targetId = parseInt(data.replace('admin:unblock:', ''), 10);
      await adminService.setUserBlocked(targetId, false);
      await ctx.editMessageText(`✅ Пользователь ${targetId} разблокирован.`,
        Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:users')]]));
      return;
    }

    if (data === 'admin:referrals') {
      await showReferrals(ctx, referralService);
      return;
    }
  };
}

export function adminCommandHandler(adminService: AdminService) {
  return async (ctx: BotContext): Promise<void> => {
    if (!adminService.isAdmin(ctx.from?.id ?? 0)) {
      await ctx.reply('Нет доступа.');
      return;
    }
    await showAdminPanel(ctx, adminService);
  };
}

async function showAdminPanel(ctx: BotContext, adminService: AdminService): Promise<void> {
  const stats = await adminService.getStats();
  const modelStats = await adminService.getModelStats();

  let text = `🔐 *Админ-панель*\n\n`;
  text += `👥 Пользователей: *${stats.users.total}*\n`;
  text += `💎 Premium: *${stats.users.premium}*\n`;
  text += `✅ KYC верифицировано: *${stats.users.kycVerified}*\n`;
  text += `🚫 Заблокировано: *${stats.users.blocked}*\n\n`;

  if (modelStats.length > 0) {
    text += `🤖 *Топ модели:*\n`;
    for (const m of modelStats.slice(0, 3)) {
      text += `• ${esc(m.model.split('/').pop() ?? m.model)}: ${m.messageCount} сообщ.\n`;
    }
  }

  const keyboard = [
    [
      Markup.button.callback('📊 Статистика', 'admin:stats'),
      Markup.button.callback('💰 Расходы', 'admin:spending'),
    ],
    [
      Markup.button.callback('👥 Пользователи', 'admin:users'),
      Markup.button.callback('📋 Логи', 'admin:logs'),
    ],
    [Markup.button.callback('🔗 Реферальные ссылки', 'admin:referrals')],
  ];

  const method = ctx.callbackQuery ? 'editMessageText' : 'reply';
  await (ctx as any)[method](text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(keyboard) });
}

async function showStats(ctx: BotContext, adminService: AdminService): Promise<void> {
  const stats = await adminService.getStats();
  const { tokens } = stats;

  let text = `📊 *Детальная статистика*\n\n`;
  text += `👥 Всего пользователей: *${stats.users.total}*\n`;
  text += `💎 Premium: *${stats.users.premium}*\n`;
  text += `✅ KYC: *${stats.users.kycVerified}*\n`;
  text += `🚫 Заблокировано: *${stats.users.blocked}*\n\n`;
  text += `🔤 Токены (всего):\n`;
  text += `  Prompt: ${tokens.totalPrompt.toLocaleString()}\n`;
  text += `  Completion: ${tokens.totalCompletion.toLocaleString()}\n`;
  text += `  Cache Read: ${tokens.totalCacheRead.toLocaleString()}\n`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:panel')]]),
  });
}

async function showSpending(ctx: BotContext, adminService: AdminService): Promise<void> {
  let text = `💰 *Расходы (OpenRouter)*\n\n`;

  try {
    const spending = await adminService.getSpending();

    if (spending.credits) {
      text += `💳 Баланс: *${formatUsd(spending.credits.remaining)}*\n`;
      text += `📊 Использовано: *${formatUsd(spending.credits.totalUsage)}*\n`;
      text += `💰 Куплено: *${formatUsd(spending.credits.totalCredits)}*\n\n`;
    }

    text += `📅 *Последние 30 дней:*\n`;
    text += `  Потрачено: *${formatUsd(spending.totalUsd)}*\n`;
    text += `  Запросов: *${spending.totalRequests.toLocaleString()}*\n`;
    text += `  Prompt токенов: ${spending.totalPromptTokens.toLocaleString()}\n`;
    text += `  Completion токенов: ${spending.totalCompletionTokens.toLocaleString()}\n`;

    if (spending.byModel.length > 0) {
      text += `\n🤖 *По моделям:*\n`;
      for (const m of spending.byModel.slice(0, 5)) {
        const modelName = esc(m.model.split('/').pop() ?? m.model);
        text += `  ${modelName}: ${formatUsd(m.usd)} (${m.requests} req)\n`;
      }
    }
  } catch {
    text += '⚠️ Не удалось получить данные расходов.\nПроверьте OPENROUTER\\_API\\_KEY.';
  }

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:panel')]]),
  });
}

async function showLogs(ctx: BotContext, adminService: AdminService): Promise<void> {
  const logs = await adminService.getLogs(15);

  let text = `📋 *Последние сообщения*\n\n`;

  for (const log of logs) {
    const role = log.role === 'user' ? '👤' : '🤖';
    const preview = esc(log.content.slice(0, 80).replace(/\n/g, ' '));
    const date = log.createdAt.toLocaleString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    text += `${role} [${log.userId}] ${date}\n${preview}…\n\n`;
  }

  if (logs.length === 0) text += 'Нет сообщений.';

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:panel')]]),
  });
}

async function showUsers(ctx: BotContext, adminService: AdminService, page: number): Promise<void> {
  const PAGE_SIZE = 8;
  const users = await adminService.getAllUsers();
  const total = users.length;
  const slice = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  let text = `👥 *Пользователи* (${total})\nСтраница ${page + 1}/${totalPages}\n\n`;

  for (const u of slice) {
    const name = u.username ? `@${esc(u.username)}` : esc(u.firstName ?? `ID:${u.id}`);
    const badges = [
      u.tier === 'premium' ? '💎' : '🆓',
      u.kycVerified ? '✅' : '',
      u.blocked ? '🚫' : '',
    ].filter(Boolean).join('');
    const refSource = u.referralSource ? ` | 🔗 ${esc(u.referralSource)}` : '';
    text += `${badges} ${name} (${u.id})\n`;
    text += `  ${u.messageCount} сообщ.${refSource}\n\n`;
  }

  const keyboard = [];

  // User action buttons in rows of 2
  const userRows: any[][] = [];
  for (let i = 0; i < slice.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, slice.length); j++) {
      const u = slice[j];
      const label = u.username ? `@${u.username}` : `#${u.id}`;
      row.push(Markup.button.callback(label, `admin:user:${u.id}`));
    }
    userRows.push(row);
  }
  keyboard.push(...userRows);

  const navRow = [];
  if (page > 0) navRow.push(Markup.button.callback('◀️', `admin:users:page:${page - 1}`));
  if (page < totalPages - 1) navRow.push(Markup.button.callback('▶️', `admin:users:page:${page + 1}`));
  if (navRow.length > 0) keyboard.push(navRow);

  keyboard.push([Markup.button.callback('◀️ Назад', 'admin:panel')]);

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard),
  });
}

async function showUserActions(ctx: BotContext, adminService: AdminService, targetId: number): Promise<void> {
  const users = await adminService.getAllUsers();
  const u = users.find((u) => u.id === targetId);

  if (!u) {
    await ctx.editMessageText('Пользователь не найден.',
      Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:users')]]));
    return;
  }

  const name = u.username ? `@${esc(u.username)}` : esc(u.firstName ?? `ID:${u.id}`);
  let text = `👤 *Пользователь ${name}*\n\n`;
  text += `ID: \`${u.id}\`\n`;
  text += `Подписка: ${u.tier === 'premium' ? '💎 Premium' : '🆓 Free'}\n`;
  text += `KYC: ${u.kycVerified ? '✅ Верифицирован' : '❌ Нет'}\n`;
  text += `Статус: ${u.blocked ? '🚫 Заблокирован' : '✅ Активен'}\n`;
  text += `Сообщений: ${u.messageCount}\n`;
  if (u.referralSource) text += `Источник: 🔗 ${esc(u.referralSource)}\n`;

  const keyboard = [
    u.tier === 'premium'
      ? [Markup.button.callback('🔽 Снять Premium', `admin:setfree:${u.id}`)]
      : [Markup.button.callback('💎 Выдать Premium', `admin:setpremium:${u.id}`)],
    u.blocked
      ? [Markup.button.callback('✅ Разблокировать', `admin:unblock:${u.id}`)]
      : [Markup.button.callback('🚫 Заблокировать', `admin:block:${u.id}`)],
    [Markup.button.callback('◀️ Назад', 'admin:users')],
  ];

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(keyboard),
  });
}

async function showReferrals(ctx: BotContext, referralService: ReferralService): Promise<void> {
  const links = await referralService.listAllLinks();

  let text = `🔗 *Все реферальные ссылки*\n\n`;

  if (links.length === 0) {
    text += 'Нет ссылок.';
  } else {
    for (const l of links) {
      const status = l.isActive ? '✅' : '⏸';
      const creator = esc(l.creatorName ?? String(l.createdBy));
      text += `${status} *${esc(l.name)}* (${creator})\n`;
      text += `  Код: \`${l.code}\` | Переходов: *${l.clicks}*\n\n`;
    }
  }

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('◀️ Назад', 'admin:panel')]]),
  });
}
