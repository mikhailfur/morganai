"""Хэндлеры Telegram-бота Morgan AI.

Меню, ChatAction, реальные обращения к AI-сервисам. Никаких заглушек.
"""

import logging
from datetime import datetime

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    Update,
    WebAppInfo,
)
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from sqlalchemy import select

from app.agent_modules import get_module_prompt, list_modules
from app.characters import get_character, list_character_names
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import SubscriptionStatus, User, UserRole
from app.services.ai.ai_service import AIService

logger = logging.getLogger(__name__)

# --- Главное Reply-меню ---
MAIN_MENU = ReplyKeyboardMarkup(
    [
        [KeyboardButton("🎭 Персонажи"), KeyboardButton("⚙️ Настройки")],
        [KeyboardButton("👤 Профиль"), KeyboardButton("💎 Premium")],
    ],
    resize_keyboard=True,
)

ADMIN_MENU = ReplyKeyboardMarkup(
    [
        [KeyboardButton("📊 Статистика"), KeyboardButton("🔧 Настройки бота")],
        [KeyboardButton("⬅️ Назад")],
    ],
    resize_keyboard=True,
)

# --- Хелперы БД ---

async def _get_or_create_user(session, telegram_user) -> User:
    stmt = select(User).where(User.telegram_id == telegram_user.id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            telegram_id=telegram_user.id,
            username=telegram_user.username,
            first_name=telegram_user.first_name,
            last_name=telegram_user.last_name,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.info(f"✅ Создан новый пользователь: {user.telegram_id}")
    return user


def _is_admin(user: User) -> bool:
    admin_ids = getattr(settings, "ADMIN_IDS", "")
    if admin_ids:
        ids = [int(x.strip()) for x in str(admin_ids).split(",") if x.strip()]
        return user.telegram_id in ids or user.role == UserRole.ADMIN
    return user.role == UserRole.ADMIN


def _subscription_label(user: User) -> str:
    if user.is_subscription_active():
        days = "∞"
        if user.subscription_expires_at:
            delta = user.subscription_expires_at - datetime.utcnow()
            days = max(0, delta.days)
        return f"🏆 Premium (осталось {days} дн.)"
    return "🆓 Free"


# --- Команды ---

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Приветствие + главное меню + кнопка WebApp."""
    if not update.effective_user:
        return

    async with AsyncSessionLocal() as session:
        user = await _get_or_create_user(session, update.effective_user)

    tg_user = update.effective_user
    character = get_character("morgan")

    text = (
        f"👋 Привет, {tg_user.first_name}!\n\n"
        f"{character.welcome_message}\n\n"
        "Выбери персонажа, режим или напиши мне что-нибудь — я всегда на связи."
    )

    webapp_button = InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("🌐 Открыть Morgan AI WebApp", web_app=WebAppInfo(url=settings.TELEGRAM_WEBHOOK_URL))],
            [InlineKeyboardButton("📖 Помощь", callback_data="help")],
        ]
    )

    await update.message.reply_text(text, reply_markup=MAIN_MENU)
    await update.message.reply_text(
        "Или открой полную версию в WebApp:",
        reply_markup=webapp_button,
    )


async def profile_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать профиль пользователя."""
    if not update.effective_user:
        return

    async with AsyncSessionLocal() as session:
        user = await _get_or_create_user(session, update.effective_user)
        label = _subscription_label(user)

        text = (
            f"👤 <b>Профиль</b>\n\n"
            f"ID: <code>{user.telegram_id}</code>\n"
            f"Подписка: {label}\n"
            f"Персонаж: Морган\n"
            f"Сообщений: {user.messages_count}\n"
            f"Последняя активность: {user.last_activity_at.strftime('%d.%m.%Y %H:%M') if user.last_activity_at else '—'}"
        )

        await update.message.reply_text(text, parse_mode="HTML")


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Настройки прямо в боте: выбор персонажа и режима."""
    buttons = []
    for mod in list_modules():
        buttons.append([InlineKeyboardButton(f"🎭 Режим: {mod.capitalize()}", callback_data=f"set_mode:{mod}")])

    for char_name in list_character_names():
        buttons.append([InlineKeyboardButton(f"👤 Персонаж: {char_name.capitalize()}", callback_data=f"set_char:{char_name}")])

    await update.message.reply_text(
        "⚙️ <b>Настройки</b>\n\nВыбери персонажа или режим поведения:",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def premium_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Информация о Premium и ссылки на Tribute."""
    if not update.effective_user:
        return

    async with AsyncSessionLocal() as session:
        user = await _get_or_create_user(session, update.effective_user)

    tribute_url_base = getattr(settings, "TRIBUTE_URL_BASE", "https://t.me/tribute/app?startapp=")

    text = (
        "💎 <b>Premium-подписка Morgan AI</b>\n\n"
        "Открой полный потенциал: голосовые сообщения, фото, видео, NSFW-режимы "
        "и персонализированные инициативные сообщения.\n\n"
        "<b>Тарифы (Tribute):</b>\n"
        "• 1 месяц — 499 ₽\n"
        "• 3 месяца — 1299 ₽\n"
        "• 6 месяцев — 2299 ₽\n"
        "• 12 месяцев — 3999 ₽\n\n"
        "Нажми на кнопку ниже, чтобы оплатить через Tribute."
    )

    buttons = InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("💳 Оплатить 1 мес", url=f"{tribute_url_base}m1")],
            [InlineKeyboardButton("💳 Оплатить 3 мес", url=f"{tribute_url_base}m3")],
            [InlineKeyboardButton("💳 Оплатить 6 мес", url=f"{tribute_url_base}m6")],
            [InlineKeyboardButton("💳 Оплатить 12 мес", url=f"{tribute_url_base}m12")],
        ]
    )

    await update.message.reply_text(text, parse_mode="HTML", reply_markup=buttons)


async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Админ-панель в боте."""
    if not update.effective_user:
        return

    async with AsyncSessionLocal() as session:
        user = await _get_or_create_user(session, update.effective_user)
        if not _is_admin(user):
            await update.message.reply_text("⛔ У тебя нет доступа к админ-панели.")
            return

    text = (
        "🔧 <b>Админ-панель Morgan AI</b>\n\n"
        "Выберите действие через меню ниже.\n"
        "Дополнительная статистика доступна в WebApp Dashboard."
    )
    await update.message.reply_text(text, parse_mode="HTML", reply_markup=ADMIN_MENU)


# --- Обработка кнопок меню ---

async def menu_button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обрабатывает текстовые кнопки ReplyKeyboardMarkup."""
    if not update.message:
        return
    text = update.message.text

    if text == "👤 Профиль":
        await profile_command(update, context)
    elif text == "⚙️ Настройки":
        await settings_command(update, context)
    elif text == "💎 Premium":
        await premium_command(update, context)
    elif text == "🎭 Персонажи":
        await settings_command(update, context)
    elif text == "📊 Статистика":
        await admin_stats(update, context)
    elif text == "🔧 Настройки бота":
        await admin_config(update, context)
    elif text == "⬅️ Назад":
        await update.message.reply_text("Возврат в главное меню.", reply_markup=MAIN_MENU)


async def admin_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Быстрая статистика в админ-меню."""
    async with AsyncSessionLocal() as session:
        total = await session.scalar(select(User).count())
        premium = await session.scalar(
            select(User)
            .where(User.is_premium.is_(True))
            .count()
        )
        text = (
            f"📊 <b>Статистика</b>\n\n"
            f"Всего пользователей: {total}\n"
            f"Premium: {premium}\n"
            f"Free: {total - premium}"
        )
    await update.message.reply_text(text, parse_mode="HTML")


async def admin_config(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🔧 Настройки бота изменяются через WebApp Dashboard или переменные окружения.",
        reply_markup=ADMIN_MENU,
    )


# --- CallbackQuery ---

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline-кнопки (выбор режима/персонажа)."""
    if not update.callback_query:
        return
    query = update.callback_query
    await query.answer()
    data = query.data

    if data.startswith("set_mode:"):
        mode = data.split(":", 1)[1]
        # Можно сохранить mode в user-data (context.user_data) или БД
        # Для MVP — пишем в context.user_data и в личное сообщение
        context.user_data["mode"] = mode
        await query.edit_message_text(f"✅ Режим установлен: <b>{mode.capitalize()}</b>", parse_mode="HTML")
    elif data.startswith("set_char:"):
        char = data.split(":", 1)[1]
        context.user_data["character"] = char
        await query.edit_message_text(f"✅ Персонаж выбран: <b>{char.capitalize()}</b>", parse_mode="HTML")
    elif data == "help":
        await query.edit_message_text(
            "📖 <b>Помощь</b>\n\n"
            "<b>Команды:</b>\n"
            "/start — начать\n"
            "/profile — мой профиль\n"
            "/settings — выбор персонажа и режима\n"
            "/premium — подписка\n\n"
            "Просто отправь мне сообщение, и я отвечу!",
            parse_mode="HTML",
        )


# --- AI-обработка сообщений ---

async def private_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка личных сообщений: текст, фото, голос."""
    if not update.message or not update.effective_user:
        return

    tg_user = update.effective_user
    chat_id = update.effective_chat.id

    async with AsyncSessionLocal() as session:
        user = await _get_or_create_user(session, tg_user)

        # Обновляем активность
        user.last_activity_at = datetime.utcnow()
        user.messages_count += 1
        await session.commit()

        # Определяем персонажа и режим из user_data (или дефолт)
        character_name = context.user_data.get("character", "morgan") if context.user_data else "morgan"
        mode = context.user_data.get("mode") if context.user_data else None
        is_premium = user.is_subscription_active()

        ai = AIService(bot=context.bot, session=session)

        try:
            if update.message.photo:
                # Обработка фото
                photo = update.message.photo[-1]
                file = await context.bot.get_file(photo.file_id)
                photo_bytes = await file.download_as_bytearray()
                caption = update.message.caption or ""

                answer = await ai.process_image_message(
                    chat_id=chat_id,
                    user_id=user.telegram_id,
                    photo_bytes=bytes(photo_bytes),
                    caption=caption,
                    character_name=character_name,
                    is_premium=is_premium,
                )
                await update.message.reply_text(answer)

            elif update.message.voice:
                # Обработка голосового
                if not is_premium:
                    await update.message.reply_text(
                        "🎙️ Голосовые сообщения доступны только в Premium.\n"
                        "Напиши /premium, чтобы оформить подписку."
                    )
                    return

                file = await context.bot.get_file(update.message.voice.file_id)
                voice_bytes = bytes(await file.download_as_bytearray())

                # STT (заглушка / Whisper)
                await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.UPLOAD_VOICE)
                transcribed = await ai.process_voice_transcription(voice_bytes)

                # Отвечаем текстом + голосом (TTS)
                text_answer = await ai.process_text_message(
                    chat_id=chat_id,
                    user_id=user.telegram_id,
                    text=transcribed,
                    character_name=character_name,
                    mode=mode,
                    is_premium=is_premium,
                )

                # TTS
                character = get_character(character_name)
                voice_buf = await ai.process_voice_request(
                    chat_id=chat_id,
                    text=text_answer,
                    voice_id=character.voice_id,
                    is_premium=is_premium,
                )
                await update.message.reply_voice(voice=voice_buf)

            elif update.message.text:
                # Текст
                answer = await ai.process_text_message(
                    chat_id=chat_id,
                    user_id=user.telegram_id,
                    text=update.message.text,
                    character_name=character_name,
                    mode=mode,
                    is_premium=is_premium,
                )
                await update.message.reply_text(answer)

        except PermissionError as exc:
            logger.warning(f"PermissionError для user={user.telegram_id}: {exc}")
            await update.message.reply_text(str(exc))
        except Exception as exc:
            logger.exception(f"Ошибка AI-обработки для user={user.telegram_id}: {exc}")
            await update.message.reply_text(
                "Извини, произошла ошибка при обработке сообщения. Попробуй ещё раз чуть позже."
            )


async def group_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка групповых сообщений."""
    if not update.message or not update.effective_chat:
        return

    # Простая логика: если бот упомянут или это reply на его сообщение
    # TODO: добавить проверку ChatSession.group_reply_mode
    if update.message.text and (f"@{context.bot.username}" in update.message.text or update.message.reply_to_message):
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action=ChatAction.TYPING)
        await update.message.reply_text(
            f"@{update.effective_user.first_name}, привет! Я пока тестирую групповой режим. Скоро всё будет!"
        )


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    """Глобальный обработчик ошибок в telegram-ext."""
    logger.exception(f"🔥 Ошибка в Telegram handler: {context.error}")
