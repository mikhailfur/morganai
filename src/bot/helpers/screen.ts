import { Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { getImage, cacheFileId, extractFileId, type ImageKey } from './image-cache.js';

type ParseMode = 'Markdown' | 'MarkdownV2';
type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>;

interface ScreenOptions {
  image?: ImageKey | null;
  text: string;
  keyboard: InlineKeyboard;
  parseMode?: ParseMode;
}

function isPhotoMessage(ctx: BotContext): boolean {
  const msg = (ctx.callbackQuery as { message?: object } | undefined)?.message;
  return !!msg && 'photo' in msg;
}

export async function showScreen(ctx: BotContext, opts: ScreenOptions): Promise<void> {
  const { image, text, keyboard, parseMode = 'Markdown' } = opts;
  const onPhoto = isPhotoMessage(ctx);

  if (image) {
    const img = getImage(image);

    if (!img) {
      // No local image file — fall back to text
      if (onPhoto) {
        await ctx.editMessageCaption(text, { parse_mode: parseMode, ...keyboard });
      } else {
        await ctx.editMessageText(text, { parse_mode: parseMode, ...keyboard });
      }
      return;
    }

    // img is either a file_id string or LocalImage { source: Buffer, key }
    const media = typeof img === 'string' ? img : (img.source as unknown as string);

    if (onPhoto) {
      const result = await ctx.editMessageMedia(
        { type: 'photo', media, caption: text, parse_mode: parseMode },
        { reply_markup: keyboard.reply_markup },
      );
      if (typeof img !== 'string' && result && typeof result !== 'boolean') {
        const fileId = extractFileId(result);
        if (fileId) cacheFileId(img.key, fileId);
      }
    } else {
      const result = await ctx.replyWithPhoto(media, {
        caption: text,
        parse_mode: parseMode,
        ...keyboard,
      });
      if (typeof img !== 'string') {
        const fileId = extractFileId(result);
        if (fileId) cacheFileId(img.key, fileId);
      }
    }
  } else if (onPhoto) {
    await ctx.editMessageCaption(text, { parse_mode: parseMode, ...keyboard });
  } else {
    await ctx.editMessageText(text, { parse_mode: parseMode, ...keyboard });
  }
}
