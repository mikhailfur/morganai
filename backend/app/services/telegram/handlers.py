"""Хэндлеры Telegram-бота."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start."""
    if not update.effective_user:
        return
    user = update.effective_user
    await update.message.reply_text(
        f"Привет, {user.first_name}! Я — Morgan AI. \n"
        "Открой WebApp через кнопку ниже, чтобы создать своего ИИ-персонажа.",
    )


async def private_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка личных сообщений."""
    if not update.message or not update.effective_user:
        return
    logger.info(f"[Private] {update.effective_user.id}: {update.message.text}")
    # TODO: делегировать в MessageService -> AIService -> DB
    await update.message.reply_text("Я получил твоё сообщение! Обработка скоро будет реализована.")


async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка групповых сообщений."""
    if not update.message or not update.effective_chat:
        return
    logger.info(f"[Group] chat_id={update.effective_chat.id}: {update.message.text}")
    # TODO: проверить GroupReplyMode, упоминания, reply
    await update.message.reply_text("Групповой режим — work in progress.")


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Глобальный обработчик ошибок в telegram-ext."""
    logger.exception(f"Ошибка в Telegram handler: {context.error}")
