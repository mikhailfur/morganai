import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';

type ParseMode = 'Markdown' | 'MarkdownV2';
type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>;

interface ScreenOptions {
  imageUrl?: string | null;
  text: string;
  keyboard: InlineKeyboard;
  parseMode?: ParseMode;
}

function isPhotoMessage(ctx: BotContext): boolean {
  const msg = (ctx.callbackQuery as { message?: object } | undefined)?.message;
  return !!msg && 'photo' in msg;
}

export async function showScreen(ctx: BotContext, opts: ScreenOptions): Promise<void> {
  const { imageUrl, text, keyboard, parseMode = 'Markdown' } = opts;
  const onPhoto = isPhotoMessage(ctx);

  if (imageUrl) {
    if (onPhoto) {
      await ctx.editMessageMedia(
        { type: 'photo', media: imageUrl, caption: text, parse_mode: parseMode },
        { reply_markup: keyboard.reply_markup },
      );
    } else {
      await ctx.replyWithPhoto(imageUrl, {
        caption: text,
        parse_mode: parseMode,
        ...keyboard,
      });
    }
  } else if (onPhoto) {
    await ctx.editMessageCaption(text, { parse_mode: parseMode, ...keyboard });
  } else {
    await ctx.editMessageText(text, { parse_mode: parseMode, ...keyboard });
  }
}
