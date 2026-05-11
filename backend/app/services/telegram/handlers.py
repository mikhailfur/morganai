"""Хэндлеры Telegram-бота."""

import logging

from telegram import Update
from telegram.ext import ContextTypes

logger = logging.getLogger(__name__)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start."""
    if not update.effective_user:
        logger.warning("/start получен, но update.effective_user отсутствует")
        return
    user = update.effective_user
    logger.info(f"🚀 Команда /start от user={user.id} (@{user.username})")
    try:
        await update.message.reply_text(
            f"Привет, {user.first_name}! Я — Morgan AI. \n"
            "Открой WebApp через кнопку ниже, чтобы создать своего ИИ-персонажа.",
        )
        logger.info(f"✅ Ответ на /start отправлен user={user.id}")
    except Exception as exc:
        logger.exception(f"❌ Не удалось отправить ответ на /start: {exc}")


async def private_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка личных сообщений."""
    if not update.message or not update.effective_user:
        return
    logger.info(f"💬 [Private] user={update.effective_user.id}: {update.message.text}")
    try:
        await update.message.reply_text("Я получил твоё сообщение! Обработка скоро будет реализована.")
    except Exception as exc:
        logger.exception(f"Ошибка отправки ответа: {exc}")


async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка групповых сообщений."""
    if not update.message or not update.effective_chat:
        return
    logger.info(f"👥 [Group] chat_id={update.effective_chat.id}: {update.message.text}")
    try:
        await update.message.reply_text("Групповой режим — work in progress.")
    except Exception as exc:
        logger.exception(f"Ошибка отправки ответа в группу: {exc}")


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Глобальный обработчик ошибок в telegram-ext."""
    logger.exception(f"🔥 Ошибка в Telegram handler: {context.error}")
